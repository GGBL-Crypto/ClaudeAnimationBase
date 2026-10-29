# Ferramenta externa (subprocesso) da narração: Kokoro-82M. Uso: python kokoro_say.py <voz> <speed> (a 1ª letra da voz é o lang_code: p, a, b)
# stdin: JSON [{"text": "...", "out": "caminho.wav"}, ...]. O modelo carrega uma vez; um WAV mono 16 bits por frase.
import json, sys
import numpy as np
import soundfile as sf
from kokoro import KPipeline

voice, speed = sys.argv[1], float(sys.argv[2])
items = json.loads(sys.stdin.buffer.read().decode('utf-8'))
pipe = KPipeline(lang_code=voice[0], repo_id='hexgrad/Kokoro-82M')
for it in items:
    parts = [np.asarray(a, dtype=np.float32) for _, _, a in pipe(it['text'], voice=voice, speed=speed) if a is not None]
    if not parts:
        sys.exit(f"Kokoro não gerou áudio para: {it['text']}")
    sf.write(it['out'], np.concatenate(parts), 24000, subtype='PCM_16')  # 24 kHz é a taxa nativa do Kokoro
