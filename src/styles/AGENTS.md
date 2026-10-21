# Estilos e motores

Leia o `GUIDE.md` e `AGENTS.md` do estilo antes de trabalhar nele. Cada diretório tem configuração e motor próprios. O registro adiciona scripts; o runtime não deve ganhar uma cadeia de condições por estilo.

O contrato comum é `init()`, `render(t)`, `canvas`, `worldToScreen(x,y)` e `info()`. A inicialização deve concluir antes de `ready`; erros devem rejeitar. Render devolve um canvas completo e limpo para qualquer tempo válido. Renderização 3D futura deve aguardar assets e convergência necessária, mantendo resultados determinísticos.

Defina paleta, textura, contornos, personagem e efeitos em `config.js`. Os valores resolvidos são imutáveis durante um vídeo. Não modifique a configuração de outro estilo nem carregue bibliotecas de um motor no outro.
