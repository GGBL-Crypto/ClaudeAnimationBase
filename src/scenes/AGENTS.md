# Cenas

- Storyboard antes de cena: registre em `src/config.js` os cortes, eventos, transições e leituras sem sobreposição. Mantenha `STORYBOARD.md` correspondente à história em desenvolvimento.
- Envolva cada arquivo em uma IIFE e registre `shots([[início, função], ...])`. A função recebe tempo absoluto, tempo local e duração. Os inícios devem coincidir exatamente com o storyboard.
- Declare `compatibleStyles` honestamente. Uma cena que usa `paint`, `clawd` ou `brushWipe` depende da aquarela. Uma história portável pode compartilhar coreografia e delegar desenho a uma porta como `VisitArt`.
- Dê um ID de semente estável a cada objeto; não use estado do quadro anterior. Limpe/desenhe todo o quadro. Preserve direção, proporções, contatos e continuidade entre planos.
- Use arcos, antecipação, reação e tempo de leitura. Evite ações simultâneas que disputam atenção.
- Não substitua a demo original para produzir uma nova história. Crie um projeto e arquivo próprios.
