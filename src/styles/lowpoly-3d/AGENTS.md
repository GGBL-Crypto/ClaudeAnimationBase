# Motor low poly 3D

Leia `GUIDE.md` e `docs/LOWPOLY_3D_PLAN.md`. O usuário aprovou a implementação em 21/10/2026.

- Implemente o contrato do runtime; Three.js pertence somente a este estilo. A dependência autorizada é `three@0.186.1` exata.
- Y para cima, unidades de mundo, frente local +Z. W/H são pixels, não coordenadas 3D.
- Construa recursos uma vez em init; cada render atribui todos os valores animados a partir do tempo absoluto. Sem relógio, random, delta, física ou acumuladores.
- Mantenha saída final capturável e limpa, com profundidade reiniciada. Falha de WebGL2/shader/contexto deve rejeitar explicitamente.
- Prévia leve é opt-in deste estilo; quadros de entrega sempre usam qualidade final. Não altere a dimensão ou arte dos motores anteriores.
- Dispose é idempotente: geometria, materiais, mapas/texturas, shadow targets, renderer e contexto; invoque ao desativar ou falhar no init.
- Teste as duas projeções, sombra ligada/desligada, seek fora de ordem, workers, descarte e SwiftShader. Igualdade de PNG vale dentro de um backend/perfil; não prometa entre GPUs.
- Server: somente 127.0.0.1 e rotas explícitas, sem paths codificados, travessia, diretórios ou symlinks externos. Mantenha testes de fronteira.
- Valide primeiro o filme 720p; só depois avance ao 1080p. Não substitua vídeos anteriores. Registre código/dependências, ambiente, tempos e evidências abertas.
- Novas histórias: consulte `docs/COMPONENTS_3D.md`; use o catálogo antes de duplicar primitivas/atores. Coreografia e eventos ficam no filme, fábricas não importam histórias. Não altere `engine.js` para acomodar elenco ou cenário. Preserve Marte com a comparação dos 36 PNGs quando refatorar seus componentes.
