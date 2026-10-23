# Episódios

`episodes/<id>/episode.json` descreve o episódio; `node scripts/narrate.mjs episodes/<id>` gera `timing.json` (aqui) e `out/episodes/<id>/narration.wav`.

## Narração (Piper)

- Piper TTS (GPL) roda só como subprocesso: `python -m pip install piper-tts` (1.8.0), voz baixada com `python -m piper.download_voices --download-dir tools/piper-voices pt_BR-faber-medium` (fora do git).
- Voz `pt_BR-faber-medium` (22 050 Hz, 1 locutor). Model card (huggingface.co/rhasspy/piper-voices, pt/pt_BR/faber/medium/MODEL_CARD): dataset https://github.com/OHF-Voice/voice-datasets, licença CC0.
