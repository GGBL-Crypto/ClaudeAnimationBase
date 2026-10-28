# Catálogo 3D pequeno

O motor continua em `src/styles/lowpoly-3d/engine.js`, sem alterações nesta evolução. O catálogo ES em `components/index.js` é carregado antes dele e expõe `LowpolyComponents`. Não cria renderer, timeline ou recursos ao importar. Os componentes recebem `art` ou um kit criado com `createKit(art)`; a história constrói uma vez e fornece poses absolutas em cada quadro.

| Recurso | Arquivo | Entrada/saída |
|---|---|---|
| `createKit(art)` | `components/core.js` | Paleta congelada do projeto → materiais, box, icosaedro, cilindro, função `mesh`. Não usa coordenadas/eventos de uma história. |
| `pointLight(kit,color,intensity,distance,position,parent?)` | core | Luz local, com pai opcional. Sombras desligadas por padrão nessa luz. |
| `cameraMove(art,from,to,target,amount)` | core | Tripletas XYZ + progresso normalizado → câmera existente. Projeções continuam responsabilidade do motor. |
| `phaseAt(t,segments)` | core | Segmentos `[início,velocidadeAngular]`, ordenados, começando em 0 → fase integrada contínua. Velocidades negativas permitem ré. |
| `createRobot(kit)` | `components/actors.js` | `root`, pernas e `apply(pose)`. Modelo preservado do primeiro filme; pose contém pés, braços, cabeça, surpresa, deslocamento e `strideWeight` (intensidade do balanço da caminhada). |
| `createSubmarine(kit)` | actors | `root`, `apply({position,rotation,propellerPhase,lampIntensity?})`. Casco, escotilha, cabine, periscópio, estabilizadores, hélice, faróis. |
| `createJellyfish(kit)` | actors | `root`, `apply({position,rotation?,phase,brightness?})`. Campânula, núcleo, seis tentáculos e luz. |
| `ground(kit,size?,depth?)` | `components/sets.js` | Plataforma cujo topo é Y=0. |
| `rockField(kit,placements,material?)` | sets | Lista explícita `{position,scale,rotation?}` → meshes, sem decidir a distribuição narrativa. |
| `underwaterLight(kit,options?)` | sets | Névoa linear e cores das luzes já existentes. Intensidades vêm do projeto. |
| `createKelp(kit,placements)` | sets | `{position,height,phase?}` → `apply(t)` com balanço analítico. |
| `createBubbles(kit,placements,options?)` | sets | `{position,size}` e altura/velocidade → `apply(t)`, subida cíclica. |

Y é vertical, +Z é frente local. Rotações são Euler XYZ em radianos; posições e escalas usam unidades do mundo. Cada `apply` atribui todos os campos animados; não integra delta, relógio ou estado anterior. A entrada é código confiável do projeto, não JSON arbitrário recebido da internet.

Os materiais e geometrias passam por `art.material`, `art.geometry`, `art.mesh`; o descarte existente percorre a cena e esses recursos, incluindo texturas e renderer. Os componentes não descartam recursos compartilhados isoladamente. O proprietário é a instância do motor. A história mantém referências locais e as libera em `disposeLowpolyScene`.

## Criar outra história

1. Cadastre novo ID em `src/config.js`, com duração, FPS, storyboard, `scripts` e sobrescritas visuais próprias.
2. Crie somente o arquivo da sua cena (exemplo mínimo: `fixtures/smoke/walker-3d.js`). Em `buildLowpolyScene(art)`, use as fábricas necessárias e retenha as referências.
3. Em `shots`, calcule a pose a partir de `t`, aplique a atuação e mova a câmera. Os cortes precisam coincidir com o storyboard.
4. Renderize storyboard/tiras/recortes, teste seek fora de ordem, revise 720p antes de 1080p e verifique o MP4 decodificado.

Exemplo mínimo de construção (atuação e storyboard permanecem no filme):

```js
const C=LowpolyComponents, kit=C.createKit(art);
C.ground(kit);
const vehicle=C.createSubmarine(kit);
vehicle.apply({position:[0,1.5,0],rotation:[0,Math.PI/2,0],propellerPhase:C.phaseAt(t,[[0,12]])});
C.cameraMove(art,[3,3,8],[2,3,7],[0,1.2,0],progress);
```

Não é um editor genérico de mundos: proporções dos três atores são intencionalmente pequenas e específicas dos modelos disponíveis. Acrescente parâmetros quando outra produção exigir uma variação concreta. Não crie ECS, herança de cenas ou outra plataforma.

## Reuso demonstrado

Marte e Oceano consomem o mesmo kit, solo, rochas, luz pontual e interpolação de câmera. O robô passou ao catálogo; sua caminhada e reação continuam em Marte. Submarino, água-viva, algas, bolhas e ambiente submarino são fábricas independentes de seus horários e trajetórias. Oceano não importa o filme anterior e não utiliza seus globals. O teste de navegador bloqueia qualquer pedido pelo arquivo de Marte durante essa verificação.

O limite permanece 64 meshes/10.000 triângulos únicos em geometria; o Oceano usa 51 chamadas de desenho e 1.400 triângulos submetidos por quadro. A névoa usa [Three.js Fog](https://threejs.org/docs/pages/Fog.html); a geometria procedural usa [SphereGeometry](https://threejs.org/docs/pages/SphereGeometry.html) e [CylinderGeometry](https://threejs.org/docs/pages/CylinderGeometry.html). Sem assets externos, texturas bitmap ou dependências novas.
