# Episódios

`episodes/<id>/episode.json` descreve o episódio; `node scripts/narrate.mjs episodes/<id>` gera `timing.json` (aqui) e `out/episodes/<id>/narration.wav`.

## Narração (Piper)

- Piper TTS (GPL) roda só como subprocesso: `python -m pip install piper-tts` (1.8.0), voz baixada com `python -m piper.download_voices --download-dir tools/piper-voices pt_BR-faber-medium` (fora do git).
- Voz `pt_BR-faber-medium` (22 050 Hz, 1 locutor). Model card (huggingface.co/rhasspy/piper-voices, pt/pt_BR/faber/medium/MODEL_CARD): dataset https://github.com/OHF-Voice/voice-datasets, licença CC0.
- Atenção: o dataset da faber é CC0, mas a voz foi ajustada (finetune) a partir da voz en_US lessac, cujos dados têm uma "Research Licence Agreement" (Voice Factory/Lessac, https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html). Uso comercial: não serve (ver tabela abaixo).

### Troca de voz: licenças (verificado em 22/10/2026)

| nome | licença modelo | licença dados | serve? | fonte |
| ---- | -------------- | ------------- | ------ | ----- |
| Piper pt_BR-faber-medium | CC0 (dataset do card) | fine-tune da en_US lessac (Blizzard 2013, só pesquisa) | não | https://huggingface.co/rhasspy/piper-voices/raw/main/pt/pt_BR/faber/medium/MODEL_CARD |
| Piper pt_BR-cadu-medium | card não declara licença do modelo (desconhecida) | CC0 (OHF-Voice/voice-datasets), mas fine-tune da lessac | não | .../pt/pt_BR/cadu/medium/MODEL_CARD |
| Piper pt_BR-jeff-medium | card não declara licença do modelo (desconhecida) | CC0, mas fine-tune da lessac | não | .../pt/pt_BR/jeff/medium/MODEL_CARD |
| Kokoro-82M pf_dora, pm_alex, pm_santa (pt-BR) | Apache-2.0 | "exclusivamente dados permissivos/não protegidos" (domínio público, Apache/MIT, sintético de TTS fechado; CC BY: SIWIS, Koniwa). Origem individual das vozes pt-BR não detalhada | sim (ressalva abaixo) | https://huggingface.co/hexgrad/Kokoro-82M (README e VOICES.md) |

Ressalvas do Kokoro: o card afirma a política geral de dados, mas não lista a fonte de cada voz pt-BR; o risco residual é aceito pela declaração do autor ("deployment in real use cases" bem-vindo). Fonema pt-BR usa espeak-ng (GPL), só como biblioteca/ferramenta externa; não afeta o áudio gerado. Confirme a licença antes de publicar.

Recomendação: trocar para Kokoro (pm_alex ou pf_dora para ouvir). WAVs de teste (24 000 Hz, mono, 16 bits, ~12,7 s): `out/tmp/vozes/kokoro-pf_dora.wav`, `kokoro-pm_alex.wav`, `kokoro-pm_santa.wav`.

### Kokoro via subprocesso (proposta, não implementada)

- Instalação: venv fora do git (`python -m venv out/tmp/kokoro-venv; out/tmp/kokoro-venv/Scripts/python.exe -m pip install kokoro soundfile`). Pesos baixados do Hugging Face no primeiro uso.
- Comando: `out/tmp/kokoro-venv/Scripts/python.exe <script> <voz> <saida.wav>` (script de ~6 linhas: `KPipeline(lang_code='p')`, concatena os trechos, `sf.write(saida, audio, 24000, subtype='PCM_16')`).
- Entrada: texto UTF-8 pela stdin (`spawnSync(..., {input: text})`, como o Piper). Saída: WAV mono, 16 bits, 24 000 Hz (`readWav` já lê taxa qualquer; `composeNarration` precisa receber 24000 em vez de 22050).
- Cache: igual, `sha1(voice|lengthScale|text)`; `lengthScale` vira `speed = 1/lengthScale` no `KPipeline(..., speed=)`. Uma chamada por frase paga o carregamento do modelo a cada vez (alguns s); melhor um processo que lê várias frases.
