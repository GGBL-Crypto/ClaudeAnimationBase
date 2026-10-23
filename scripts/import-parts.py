"""Importa as peças de um personagem a partir de uma folha PNG de fundo branco (cartoon, Task 8e).

Separa as peças por componentes conexos (o branco cercado por uma peça, como o branco do olho, fica na peça), salva
cada peça recortada em PNG com alfa e, se o vtracer estiver instalado, também o SVG vetorizado; escreve rig.json com
pivô, comprimento, ângulo e camada de cada peça como primeiro palpite, a ajustar à mão. Ferramenta fora do render.

Dependências num venv fora do npm (out/ é ignorado pelo git):
  python -m venv out/tmp/venv
  out/tmp/venv/Scripts/python -m pip install pillow numpy vtracer
Uso:
  out/tmp/venv/Scripts/python scripts/import-parts.py <folha.png> <nome> [--spec=human] [--bl=<px>]
      [--out=assets/characters] [--min-area=200] [--white=235]
  out/tmp/venv/Scripts/python scripts/import-parts.py --self-test

rig.json: {name, spec, source, unit, parts: {partNN: {file, svg?, size, pivot, len, angle, layer}}}, medidas em px
da peça recortada; unit = px por unidade (BL / 100: --bl é o comprimento de referência do ser na folha, a altura de
um humano; padrão, a altura da folha). Renomeie cada partNN para o nome da peça desenhada em
src/styles/cartoon/parts.js que ela substitui (thigh, head...; variantes de rosto como head@happy) e ajuste pivô e
comprimento; layer null usa a camada da peça desenhada de mesmo nome.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image

try:
    import vtracer
except ImportError:
    vtracer = None


def fill(m, w, h, seeds, diag):
    """Scanline flood fill over the 1-bytes of the bytearray m (cleared as visited) from the seed indices; diag joins
    diagonal neighbours (8-connectivity). Returns the filled spans [(y, x0, x1)], x1 exclusive."""
    spans, stack = [], list(seeds)
    while stack:
        i = stack.pop()
        if not m[i]:
            continue
        y, r0 = divmod(i, w)[0], i - i % w
        a = m.rfind(0, r0, i)
        a = r0 if a < 0 else a + 1
        b = m.find(0, i, r0 + w)
        b = r0 + w if b < 0 else b
        m[a:b] = bytes(b - a)
        spans.append((y, a - r0, b - r0))
        for yy in (y - 1, y + 1):
            if 0 <= yy < h:
                q0 = yy * w
                lo, hi = q0 + max(0, a - r0 - diag), q0 + min(w, b - r0 + diag)
                j = m.find(1, lo, hi)
                while j >= 0:
                    stack.append(j)
                    k = m.find(0, j, hi)
                    if k < 0:
                        break
                    j = m.find(1, k, hi)
    return spans


def split(rgb, white=235, min_area=200):
    """Parts of a sheet (H×W×3 uint8): the background is the near-white region touching the border; every other
    8-connected region of at least min_area pixels is a part. Returns [(x0, y0, x1, y1, spans)] top to bottom, then
    left to right."""
    h, w = rgb.shape[:2]
    m = bytearray((rgb.min(axis=2) >= white).astype(np.uint8).tobytes())
    border = [i for i in (*range(w), *range((h - 1) * w, h * w), *range(0, h * w, w), *range(w - 1, h * w, w)) if m[i]]
    bg = bytearray(w * h)
    for y, a, b in fill(m, w, h, border, 0):
        bg[y * w + a:y * w + b] = b'\x01' * (b - a)
    fg = bytearray(1 - v for v in bg)
    parts, i = [], fg.find(1)
    while i >= 0:
        spans = fill(fg, w, h, [i], 1)
        if sum(b - a for _, a, b in spans) >= min_area:
            ys, x0s, x1s = zip(*spans)
            parts.append((min(x0s), min(ys), max(x1s), max(ys) + 1, spans))
        i = fg.find(1, i)
    band = max(1, h // 10)  # rows of the sheet, so a slightly lower part on the same row keeps its left-to-right place
    return sorted(parts, key=lambda p: (p[1] // band, p[0]))


def guess(w, h):
    """First guess of pivot, bone length and rest angle for a w × h part: a tall part hangs from the middle of its top
    end (angle down), a wide one points forward from its left end, a round one pivots at its centre."""
    if h > 1.6 * w:
        return [w / 2, w / 2], h - w, math.pi / 2
    if w > 1.6 * h:
        return [h / 2, h / 2], w - h, 0
    return [w / 2, h / 2], max(w, h) / 2, 0


def import_sheet(sheet, name, spec='human', bl=None, out='assets/characters', min_area=200, white=235, pad=2):
    img = Image.open(sheet).convert('RGB')
    rgb = np.asarray(img)
    parts = split(rgb, white, min_area)
    if not parts:
        raise SystemExit(f'Nenhuma peça encontrada em {sheet}: o fundo precisa ser branco')
    folder = os.path.join(out, name)
    os.makedirs(folder, exist_ok=True)
    rig = {'name': name, 'spec': spec, 'source': os.path.basename(sheet), 'unit': round((bl or img.height) / 100, 4), 'parts': {}}
    for n, (x0, y0, x1, y1, spans) in enumerate(parts, 1):
        w, h = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad
        rgba = np.zeros((h, w, 4), np.uint8)
        rgba[pad:h - pad, pad:w - pad, :3] = rgb[y0:y1, x0:x1]
        for y, a, b in spans:
            rgba[y - y0 + pad, a - x0 + pad:b - x0 + pad, 3] = 255
        key = f'part{n:02d}'
        png = os.path.join(folder, key + '.png')
        Image.fromarray(rgba, 'RGBA').save(png)
        pivot, length, angle = guess(w, h)
        q = {'file': key + '.png', 'size': [w, h], 'pivot': [round(v, 1) for v in pivot], 'len': round(length, 1), 'angle': round(angle, 4), 'layer': None}
        if vtracer:
            vtracer.convert_image_to_svg_py(png, os.path.join(folder, key + '.svg'), colormode='color', hierarchical='stacked', mode='spline',
                                            filter_speckle=4, color_precision=6, layer_difference=16, path_precision=2)
            q['svg'] = key + '.svg'
        rig['parts'][key] = q
    with open(os.path.join(folder, 'rig.json'), 'w', encoding='utf-8') as f:
        json.dump(rig, f, indent=2, ensure_ascii=False)
        f.write('\n')
    return rig


def self_test():
    """Synthetic sheet drawn with Pillow: a head with an enclosed white eye, a tall limb, a wide piece and a speck."""
    from PIL import ImageDraw
    folder = os.path.join('out', 'tmp', 'import-parts-selftest')
    os.makedirs(folder, exist_ok=True)
    sheet = Image.new('RGB', (640, 420), 'white')
    d = ImageDraw.Draw(sheet)
    d.ellipse((40, 40, 240, 240), fill='#F2B58D', outline='black', width=8)
    d.ellipse((140, 90, 200, 160), fill='white', outline='black', width=6)
    d.ellipse((165, 115, 181, 131), fill='black')
    d.rounded_rectangle((320, 30, 380, 360), 30, fill='#4F8FC0', outline='black', width=8)
    d.ellipse((430, 250, 620, 320), fill='#E97864', outline='black', width=8)
    d.rectangle((600, 30, 602, 32), fill='black')
    path = os.path.join(folder, 'sheet.png')
    sheet.save(path)
    rig = import_sheet(path, 'teste', bl=400, out=folder)
    p = rig['parts']
    assert list(p) == ['part01', 'part02', 'part03'], list(p)
    head, limb, wide = p['part01'], p['part02'], p['part03']
    assert head['size'] == [205, 205] and head['angle'] == 0 and head['pivot'] == [102.5, 102.5], head
    assert limb['angle'] == round(math.pi / 2, 4) and limb['pivot'][1] == limb['size'][0] / 2, limb
    assert wide['angle'] == 0 and wide['len'] == wide['size'][0] - wide['size'][1], wide
    assert rig['unit'] == 4
    im = Image.open(os.path.join(folder, 'teste', 'part01.png'))
    assert im.getpixel((0, 0))[3] == 0, 'canto transparente'
    assert im.getpixel((102 + 2, 102 + 2))[3] == 255, 'centro opaco'
    assert im.getpixel((140 - 40 + 2 + 12, 125 - 40 + 2)) == (255, 255, 255, 255), 'branco do olho fica na peça'
    if vtracer:
        svg = open(os.path.join(folder, 'teste', 'part01.svg'), encoding='utf-8').read()
        assert '<path' in svg and head['svg'] == 'part01.svg'
    print(f'import-parts: autoteste ok ({len(p)} peças, SVG {"sim" if vtracer else "não: vtracer ausente"}) em {folder}')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
    if 'self-test' in opts:
        self_test()
    elif len(args) != 2:
        raise SystemExit(__doc__)
    else:
        rig = import_sheet(args[0], args[1], opts.get('spec', 'human'), float(opts['bl']) if 'bl' in opts else None,
                           opts.get('out', 'assets/characters'), int(opts.get('min-area', 200)), int(opts.get('white', 235)))
        print(f'{len(rig["parts"])} peças em {os.path.join(opts.get("out", "assets/characters"), args[1])} '
              f'(SVG: {"sim" if vtracer else "não, instale vtracer"}); ajuste nomes e pivôs no rig.json')
