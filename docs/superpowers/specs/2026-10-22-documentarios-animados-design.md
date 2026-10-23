# Design — vídeos longos animados e narrados, de qualquer tema

Data: 22/10/2026. Decidido com o usuário: vídeos longos narrados em português, no formato documentário ou história; tema livre (humanos, animais, insetos, natureza, história etc.); movimento realista dos seres (patas, braços, antenas, caudas) e ambiente que reage; estilos cartoon ou aquarela; 3D fica para o futuro. A formiga operária foi só um exemplo. Todo o resto é escolha do Claude, marcada como tal.

## Intenção

Um canal dark no YouTube que publica vídeos longos animados, gerados de forma automatizada e sem custo com serviços pagos. A qualidade de referência é o ritmo e a vida de tela do PDoomVideo e do vídeo `Ns1N1L_qIw0` (ver `docs/RELATORIO_ANALISE_2026-10-22.md`): algo acontece em todo plano, câmera com intenção, transições motivadas.

Diferencial: **movimento crível de qualquer ser vivo**, a partir de um único sistema. Pés que não deslizam no chão, padrões de marcha corretos (bípede, quadrúpede, hexápode, octópode), corpo que segue a curva do caminho, apêndices com movimento secundário (antenas, caudas, orelhas, cabelo, asas, nadadeiras). E um ambiente que responde: vegetação que se curva com o vento e com quem passa, poeira nos passos, chuva com respingos e reação de susto.

## Objetivos

1. Pipeline repetível: tema → roteiro com fontes → narração → timeline → cenas → render → mixagem → MP4 + SRT + texto de publicação + miniatura.
2. Biblioteca de seres configuráveis (rigs) e de ambiente, reutilizada entre episódios. Um ser novo é uma especificação de dados, não um motor novo.
3. Episódio piloto de 8–10 min, 1920×1080, 30 fps, sobre um tema escolhido pelo usuário.
4. Mesmo episódio renderizável em cartoon e em aquarela, sem reescrever cenas.

## Não objetivos

3D, VRM, física com integração incremental, upload automático pela API do YouTube, lipsync, geração de imagens ou de música por IA.

## Anti-objetivos (fracasso mesmo que funcione)

- Seres que "patinam" (pé escorregando durante o apoio) ou marcha errada para a espécie.
- Planos parados com narração por cima por mais de ~4 s sem movimento significativo.
- Fatos inventados ou sem fonte.
- Vídeos repetitivos a ponto de cair na política de conteúdo inautêntico ou produzido em massa do YouTube: cada episódio precisa de roteiro original e variedade visual.
- Mais documentação e infraestrutura do que vídeo.

## Restrições

- Hardware: Ryzen 5 3600, 16 GB, Radeon R9 200. Render medido: cartoon ~20 ms por quadro, aquarela ~0,5–0,8 s por quadro em cenas simples.
- Custo zero: só software livre local (Node 24, Python 3.11, FFmpeg, Chrome, p5/p5.brush).
- Cada quadro é função pura do tempo (regras em `CLAUDE.md`).
- Licenças: PDoomVideo só como referência; Eidoverse (AGPL) só ideias; Piper (GPL) como ferramenta externa; licença da voz conferida no model card.

## Decisões (escolhas do Claude, revisáveis)

| Tema | Decisão | Motivo |
|---|---|---|
| Sistema de seres | Um gerador de poses `creaturePose(spec, o)` + especificações de dados (`SPECS.human`, `dog`, `ant`, `spider`, `bird`, `fish`) | Mesma matemática para todos; ser novo = nova especificação |
| Marchas | Tabela de defasagens por pata: bípede, quadrúpede passo e trote, trípode, tetrápode de aranha; nado por onda na coluna | Padrões biológicos conhecidos, ajustáveis |
| Apêndices | Cadeia com movimento secundário (`chain`) para antenas, caudas, orelhas, cabelo, roupas | Uma função cobre todos |
| Vistas | Lateral para todos; superior para animais e multidões | Lateral é a mais legível em 2D |
| Rostos | Vocabulário de expressões nomeadas (olhos, boca, sobrancelhas), como no Clawd | Atuação sem lipsync |
| Estilo do primeiro render | Cartoon; aquarela depois | Cartoon renderiza ~30× mais rápido |
| Voz | Piper TTS, `pt_BR-faber-medium` | Local, gratuita, pt-BR |
| Tempo do vídeo | Ditado pela narração, uma frase por síntese | Tempos exatos sem Whisper |
| Duração do piloto | 8–10 min | Acima de 8 min o YouTube permite anúncios no meio |
| Som | Narração + cama de ambiente do FFmpeg + música opcional do usuário, com ducking; −14 LUFS | Sem custo, sem direitos de terceiros |
| Legendas | SRT separado | O YouTube aceita; imagem limpa |
| Portabilidade | Cenas chamam só `Kit` (primitivas) e `NatureArt` (seres e ambiente); cada estilo implementa os dois com os mesmos nomes | Uma cena roda nos dois estilos |

## Modelo de movimento (valores padrão, ajustáveis por especificação)

- **Corpo:** coluna de segmentos amostrados em pontos atrasados do mesmo caminho (efeito vagão), gerando curvatura natural e atraso dos segmentos traseiros.
- **Pernas:** dois segmentos com IK analítica; pé de apoio fixo no ponto de mundo onde pousou, calculado a partir da distância percorrida (função pura de `t`).
- **Marchas (fração de apoio e defasagem):** bípede caminhada 0,6 (pernas a 0 e 0,5); bípede corrida 0,35; quadrúpede passo 0,7 (RH 0, RF 0,25, LH 0,5, LF 0,75); trote 0,5 (diagonais em fase); hexápode trípode 0,6 (L1, R2, L3 a 0; R1, L2, R3 a 0,5); aranha tetrápode 0,6 (L1, R2, L3, R4 × R1, L2, R3, L4).
- **Braços humanos:** balanço oposto à perna do mesmo lado; gestos por keyframes sobrepostos.
- **Apêndices:** cadeia de segmentos cujo ângulo segue o ângulo do pai com atraso de fase e ruído suave; parâmetros de rigidez e amplitude.
- **Estados contínuos:** `age` (velhice), `alive` (morte e colapso), `flinch` (susto), `moving` (parado/andando).
- **Ambiente:** vento como ruído que viaja; vegetação dobra com o vento e se afasta de quem passa; poeira em cada pouso; chuva agendada por semente com respingo; folhas caindo com oscilação; multidões em trilhas.

## Formato do episódio

- `episodes/<id>/roteiro.md`: roteiro legível com fontes.
- `episodes/<id>/episode.json`: capítulos e planos, cada plano com narração e descrição visual.
- `episodes/<id>/timing.json`: gerado pela narração.
- `src/episodes.js`: gerado; registra cada episódio como projeto do estúdio.
- `src/episodes/<id>/c<NN>_<capitulo>.js`: cenas, um arquivo por capítulo.

## Sucesso

- Filme de teste com humano, cão, formiga, pássaro e chuva convence o usuário.
- O usuário assiste ao piloto inteiro e os seres parecem vivos.
- Tiras quadro a quadro mostram pés parados durante o apoio e a marcha correta de cada espécie.
- O segundo episódio, sobre outro tema, exige só roteiro, cenas e talvez uma especificação nova.

## Fica para quem constrói

Paleta exata, composição dos planos, desenho de cada ser dentro do modelo acima, nomes internos.
