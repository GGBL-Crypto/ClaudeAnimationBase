// Cut-out parts for the cartoon NatureArt: each piece is an SVG path drawn once (Path2D, built on first use and reused)
// and pinned to a bone of the pose. Units: BL / 100 (human: height / 100), y down, the creature facing right (+x front).
// Piece = {d, pivot: [x, y], len, angle, layer, fill, clip?, band?, spots?, lines?}:
//   pivot: the joint the piece hangs from; angle: rest direction of its bone (rad, 0 = forward, PI / 2 = down);
//   len: bone length in units (the piece stretches along the bone to reach the next joint); layer: draw order;
//   fill: key of the look (colors); clip: concave piece (shading clipped to it); band: shadow band scale;
//   spots: [{d, fill}] markings drawn flat inside the piece; lines: inner ink lines.
//   Paths use only absolute M, L, C, Q and Z, wound clockwise.
// Characters are recurring, with a name and a fixed palette (the look in nature.js): Lia (human, red scarf and
// ponytail) and Bento (dog, red collar with a tag).
var CARTOON_PARTS = (() => {
  const D = Math.PI / 2;
  // Smooth closed outline through the midpoints of a control polygon (organic silhouettes: crowns, bushes).
  const blob = pts => {
    const m = i => { const a = pts[i % pts.length], b = pts[(i + 1) % pts.length]; return `${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`; };
    return `M ${m(pts.length - 1)} ` + pts.map((p, i) => `Q ${p[0]} ${p[1]} ${m(i)}`).join(' ') + ' Z';
  };
  // Scalloped crown around (cx, cy): radii k[i] alternate peaks and valleys, clockwise from the right.
  const scallop = (cx, cy, rx, ry, k) => blob(k.map((v, i) => { const a = i * 2 * Math.PI / k.length; return [+(cx + Math.cos(a) * rx * v).toFixed(1), +(cy + Math.sin(a) * ry * v).toFixed(1)]; }));

  return {
    human: {
      name: 'Lia',
      side: {
        thigh: { d: 'M -5 0 C -5 -6.5 5 -6.5 5.2 0 C 5.4 9 4.6 18 3.9 25 C 3.6 29.4 -3.6 29.4 -3.9 25 C -4.4 17 -5.1 8 -5 0 Z', pivot: [0, 0], len: 25, angle: D, layer: 4, fill: 'pants' },
        shin: { d: 'M -3.9 0 C -3.9 -4.2 3.9 -4.2 3.9 0 C 4 7 4.3 14 4.8 20.6 C 1.6 21.4 -1.6 21.4 -4.6 20.6 C -4.2 14 -3.9 7 -3.9 0 Z', pivot: [0, 0], len: 25, angle: D, layer: 4.1, fill: 'pants',
          lines: ['M -4.1 11.5 C -2.6 12.6 -1.2 12.4 0 11.8'] },
        shoe: { d: 'M -4.4 -0.4 C -4.8 -3.6 -3.8 -6.2 -1 -6.4 L 3.2 -6.2 C 4.8 -4.8 6.4 -4.6 8.4 -3.8 C 11 -2.8 11.2 0.8 9 0.8 L -3.6 0.8 C -4.2 0.8 -4.4 0.4 -4.4 -0.4 Z', pivot: [0, 0], len: 10, layer: 3.9, fill: 'shoe',
          spots: [{ d: 'M -4.3 -1.2 L 10.6 -1.2 C 10.8 0 10.2 0.8 9 0.8 L -3.6 0.8 C -4.2 0.8 -4.4 0.4 -4.3 -1.2 Z', fill: 'sole' }] },
        pelvis: { d: 'M -9.6 -3 C -9.6 -6.4 9.6 -6.4 9.6 -3 C 10 3 7 8.4 0 8.4 C -7 8.4 -10 3 -9.6 -3 Z', pivot: [0, 0], len: 20, angle: -D, layer: 5, fill: 'pants' },
        torso: { d: 'M -8.8 3.6 C -9.4 -8 -9.6 -20 -9 -27 C -8.6 -32 -5 -34 0 -34 C 5 -34 8.8 -32 9.2 -27 C 9.8 -20 10.6 -8 10 3.6 C 6 5.4 -5 5.4 -8.8 3.6 Z', pivot: [0, 0], len: 20, angle: -D, layer: 5.1, fill: 'shirt',
          lines: ['M -8.8 3.6 C -5 5.4 6 5.4 10 3.6', 'M 3.4 -4 C 5 -2.4 6.6 -2 8 -2.4', 'M -6 -10 C -5 -7 -5 -5 -6 -2'] },
        neck: { d: 'M -3.2 3 L -3.2 -11 L 3.2 -11 L 3.2 3 Z', pivot: [0, 0], len: 11, angle: -D, layer: 6, fill: 'skin' },
        head: { d: 'M 0 -12 C 7.4 -12 12 -7.6 12 -1.6 C 13.8 -1.4 14.4 1.8 12.4 2.6 C 11.6 8 7 11.6 1 11.6 C -6.6 11.6 -12 6.8 -12 0 C -12 -7 -6.8 -12 0 -12 Z', pivot: [0, 0], len: 12, layer: 6.05, fill: 'skin', band: .45 },
        ear: { d: 'M -1.6 -1.8 C 1.4 -1.8 1.4 4.8 -1.6 4.8 C -4.6 4.8 -4.6 -1.8 -1.6 -1.8 Z', pivot: [0, 0], len: 12, layer: 6.1, fill: 'skin', lines: ['M -0.6 0 C -2.8 0.3 -2.8 3 -0.8 3.2'] },
        hair: { d: 'M -11.8 6 C -14 0 -13.6 -8 -8.6 -11.8 C -4 -15 4 -15 8.8 -11.2 C 11.8 -8.8 12.6 -7 12.4 -5.6 C 11 -6.8 9.8 -7.2 8.6 -6.6 C 7.6 -8.2 5.6 -8.6 4.4 -7.6 C 2.4 -7.2 0.4 -5.6 -0.8 -3.2 C -2.6 -1.6 -3.6 0.4 -4 3.6 C -5 5.6 -6.6 7.4 -8.6 8.4 C -10 8.6 -11.2 7.6 -11.8 6 Z',
          pivot: [0, 0], len: 12, layer: 6.2, fill: 'hair', clip: true, band: .6, lines: ['M -3 -12.6 C -7 -10 -9.6 -6 -10.2 -1', 'M 3.6 -12.4 C 1 -10.6 -0.4 -8.6 -1.2 -6'] },
        ponytail: { d: 'M -1 -2.6 C 4 -5.6 11 -4.2 14.2 -0.6 C 11 1.8 5 4.6 -1 2.6 C -2.2 1 -2.2 -1 -1 -2.6 Z', pivot: [0, 0], len: 12, layer: 1, fill: 'hair', lines: ['M 2 -1 C 5 -1.6 8 -1 11 -0.4'] },
        tie: { d: 'M -1.4 -3 C 0.4 -3 0.4 3 -1.4 3 C -3.2 3 -3.2 -3 -1.4 -3 Z', pivot: [0, 0], len: 12, layer: 1.1, fill: 'scarf' },
        scarf: { d: 'M -7.6 -29 C -8.4 -32 -7.4 -35.6 -4 -36.4 C 0 -37.2 5 -36.8 7.6 -35 C 9.6 -33.4 9.8 -30.6 8.8 -28.8 C 5 -27.4 -3 -27.2 -7.6 -29 Z', pivot: [0, 0], len: 20, angle: -D, layer: 5.5, fill: 'scarf',
          lines: ['M 4.6 -36.6 C 4 -33.6 4.2 -30.4 5.2 -28'] },
        scarfTail: { d: 'M 0 -2.6 C 4 -3.6 8 -1.4 14 -2.4 L 15.6 1.4 C 10 3.2 5 2 0 2.8 C -1.6 1.4 -1.6 -1.2 0 -2.6 Z', pivot: [0, 0], len: 14, layer: 2, fill: 'scarf', lines: ['M 2 0 C 6 0.6 10 -0.4 13.4 0'] },
        upperArm: { d: 'M -3.5 0 C -3.5 -4.6 3.5 -4.6 3.5 0 C 3.3 6 3 12 2.8 17 C 2.7 20.1 -2.7 20.1 -2.8 17 C -3 12 -3.3 6 -3.5 0 Z', pivot: [0, 0], len: 17, angle: D, layer: 8, fill: 'shirt',
          lines: ['M -2.8 17 C -2.7 20.1 2.7 20.1 2.8 17'] },
        forearm: { d: 'M -2.4 0 C -2.4 -3.1 2.4 -3.1 2.4 0 L 2 16 C 2 18.1 -2 18.1 -2 16 Z', pivot: [0, 0], len: 16, angle: D, layer: 8.1, fill: 'skin' },
        hand: { d: 'M -2.7 -0.6 C -1 -1.6 1.6 -1.6 2.7 -0.4 C 4.6 0.4 5.2 2.8 3.5 3.3 C 3.7 5.8 2.6 7.8 0 7.8 C -2.7 7.8 -3.5 5.1 -3.3 2.6 C -3.3 1 -3.3 0 -2.7 -0.6 Z', pivot: [0, 0], len: 6, angle: D, layer: 8.2, fill: 'skin' },
      },
      // Profile face in head units: eye kinds, and per expression the eye, open fraction (lid), slant and the brow
      // and mouth paths (mouth.fill: filled shape; otherwise a stroke).
      face: {
        eye: { at: [6.2, 0.4], dot: 'M 6.2 -2.9 C 9.5 -2.9 9.5 3.7 6.2 3.7 C 2.9 3.7 2.9 -2.9 6.2 -2.9 Z', wide: 'M 6.2 -3.5 C 10.1 -3.5 10.1 4.3 6.2 4.3 C 2.3 4.3 2.3 -3.5 6.2 -3.5 Z',
          arc: 'M 4.2 1.4 C 5.2 -1.4 7.4 -1.4 8.4 1.4', x: 'M 5 -1.2 L 7.6 1.8 M 5 1.8 L 7.6 -1.2' },
        blush: 'M 4.4 3.8 C 6.6 3.8 6.6 6.4 4.4 6.4 C 2.2 6.4 2.2 3.8 4.4 3.8 Z',
        neutral: { eye: 'dot', lid: 1, brow: 'M 4.2 -4.8 C 5.6 -5.6 7 -5.6 8.4 -5', mouth: { d: 'M 7.4 6.6 C 8.4 7 9.4 6.9 10.2 6.4' } },
        happy: { eye: 'arc', lid: 1, brow: 'M 4.2 -5.4 C 5.6 -6.4 7 -6.4 8.4 -5.6', mouth: { d: 'M 6.8 5.4 C 8.4 6.2 9.8 6 10.8 5 C 10.8 7.9 8.2 9.2 6.8 5.4 Z', fill: true } },
        sad: { eye: 'dot', lid: .72, look: .5, brow: 'M 4.2 -4.4 C 5.6 -4.6 7 -5.2 8.4 -6.2', mouth: { d: 'M 7.4 7.6 C 8.4 6.4 9.4 6.4 10.2 7.4' } },
        scared: { eye: 'wide', lid: 1, brow: 'M 4.2 -6 C 5.6 -6.8 7 -7.2 8.4 -7.6', mouth: { d: 'M 7 7 C 7.6 6.2 8.2 6.2 8.6 7 C 9 7.8 9.6 7.8 10.2 7' } },
        angry: { eye: 'dot', lid: .68, slant: 1, brow: 'M 4.2 -6.2 C 5.6 -5.6 7 -4.6 8.4 -3.4', mouth: { d: 'M 7.4 7.2 C 8.4 6.6 9.4 6.6 10.2 7' } },
        surprised: { eye: 'wide', lid: 1, brow: 'M 4 -7 C 5.4 -8.4 7.2 -8.4 8.6 -7.2', mouth: { d: 'M 8.8 5 C 10.1 5 10.3 8.6 8.8 8.6 C 7.5 8.6 7.5 5 8.8 5 Z', fill: true } },
        tired: { eye: 'dot', lid: .42, brow: 'M 4.2 -4.2 C 5.6 -4.4 7 -4.4 8.4 -4.2', mouth: { d: 'M 7.6 6.9 C 8.6 7.1 9.4 7.1 10 6.8' } },
        dead: { eye: 'x', lid: 1, brow: null, mouth: { d: 'M 7 7 C 7.6 6.2 8.2 6.2 8.6 7 C 9 7.8 9.6 7.8 10.2 7' } },
      },
    },

    dog: {
      name: 'Bento',
      side: {
        body: { d: 'M -14 -4 C -14 -11 -8 -14 0 -14 C 16 -14 34 -12.4 48 -14 C 58 -15 65 -8 64 2 C 63.4 10 58 15.4 50 15 C 40 14 30 9 20 10 C 10 11 2 13 -5 12 C -12 11 -14 4 -14 -4 Z', pivot: [0, 0], len: 50, layer: 5, fill: 'color',
          spots: [{ d: 'M 8 -11.6 C 20 -12.2 32 -11 42 -11.8 C 40 -5 31 -2.4 22 -3.4 C 14 -4.2 8 -7 8 -11.6 Z', fill: 'dark' }, { d: 'M 56 4 C 60.6 6 62.4 10 58.4 13.4 C 54.4 14.8 50.4 14.4 48 12 C 50 9 52 5 56 4 Z', fill: 'cream' }] },
        neck: { d: 'M -4 -11 C 8 -12 18 -9.4 27 -7.4 C 31 -6.6 31 6.6 27 7.4 C 18 9.4 8 12 -4 11 C -9 10 -9 -10 -4 -11 Z', pivot: [0, 0], len: 27, layer: 5.1, fill: 'color' },
        head: { d: 'M -11 -1 C -11 -8 -5 -11 1 -11 C 6 -11 9 -8.6 10.6 -6 C 14 -5.6 18 -5.4 20.4 -4.4 C 22.8 -3.6 23 0.6 21 1.8 C 18 4.6 12 6 7 7.6 C 2 9.6 -4 9.6 -8 6.6 C -10.4 4.8 -11 2 -11 -1 Z', pivot: [0, 0], len: 12, layer: 5.2, fill: 'color',
          spots: [{ d: 'M 12 -1.4 C 15 -2.4 19 -1.8 21.6 0.4 C 19 4 14 5.6 9 7 C 8.6 3.6 9.6 -0.2 12 -1.4 Z', fill: 'cream' }, { d: 'M 18.6 -5.2 C 21 -5.8 23.2 -4.4 23 -2.2 C 22.8 -0.6 20.6 -0.6 19.4 -1.6 C 18.2 -2.6 17.6 -4.8 18.6 -5.2 Z', fill: 'nose' }],
          lines: ['M 21 1.8 C 18 3 15 3.4 12.4 3'] },
        collar: { d: 'M 16.4 -10 C 18.4 -10.4 20.6 -9.8 21.8 -9.4 L 22.4 8.8 C 20.8 9.4 18.8 9.8 17 10.2 Z', pivot: [0, 0], len: 27, layer: 6, fill: 'collar' },
        tag: { d: 'M 0 -0.6 C 2.6 -0.6 3.2 1.2 3.2 2.6 C 3.2 4.4 1.8 5.6 0 5.6 C -1.8 5.6 -3.2 4.4 -3.2 2.6 C -3.2 1.2 -2.6 -0.6 0 -0.6 Z', pivot: [0, 0], len: 6, angle: D, layer: 6.1, fill: 'tag' },
        ear: { d: 'M -1.2 -3.6 C 4 -5.2 10 -4.8 13.2 -1 C 14.8 1.8 12 4.6 8 4.4 C 4 4.2 0 3.6 -1.4 2.2 C -2.8 0.6 -2.6 -2.4 -1.2 -3.6 Z', pivot: [0, 0], len: 11, layer: 8, fill: 'dark' },
        tailSeg: { d: 'M 0 -3 C 3.4 -3 6.6 -2.6 10 -2.4 C 12.8 -2.2 12.8 2.2 10 2.4 C 6.6 2.6 3.4 3 0 3 C -3.8 3 -3.8 -3 0 -3 Z', pivot: [0, 0], len: 10, layer: 1, fill: 'color' },
        tailTip: { d: 'M 0 -2.4 C 3 -2.6 6 -1.6 9.6 0 C 6 1.6 3 2.6 0 2.4 C -3 2.4 -3 -2.4 0 -2.4 Z', pivot: [0, 0], len: 8, layer: 1.1, fill: 'color',
          spots: [{ d: 'M 4.4 -1.9 C 6 -1.4 7.8 -0.8 9.6 0 C 7.8 0.8 6 1.4 4.4 1.9 C 3.8 0.8 3.8 -0.8 4.4 -1.9 Z', fill: 'cream' }] },
        armUpper: { d: 'M -7 -4 C -7 -9.6 7 -9.6 7 -4 C 6.4 6 5 16 3.8 25 C 3.6 28.4 -3.6 28.4 -3.8 25 C -4.6 16 -6.4 6 -7 -4 Z', pivot: [0, 0], len: 25, angle: D, layer: 7, fill: 'color' },
        hipUpper: { d: 'M -9.4 -3 C -9.4 -11 9.4 -11 9.4 -3 C 8.6 8 5.4 17 3.6 26 C 3.4 29.4 -3.4 29.4 -3.6 26 C -6 18 -9.8 8 -9.4 -3 Z', pivot: [0, 0], len: 26, angle: D, layer: 7, fill: 'color' },
        legLower: { d: 'M -3.4 0 C -3.4 -3.8 3.4 -3.8 3.4 0 L 2.8 27 C 2.8 29.6 -2.8 29.6 -2.8 27 Z', pivot: [0, 0], len: 27, angle: D, layer: 7.1, fill: 'color' },
        paw: { d: 'M -3.6 0.4 C -3.8 -3.8 -1 -5.6 2 -5.6 C 5.6 -5.6 7.6 -3.2 7.4 0.4 Z', pivot: [0, 0], len: 6, layer: 7.2, fill: 'color', lines: ['M 3.2 -2.4 L 3.4 0.2', 'M 5.4 -2.2 L 5.6 0.2'] },
      },
      top: {
        body: { d: 'M -12 0 C -12 -9 -4 -12 4 -12.4 C 18 -13 30 -11 44 -13.6 C 56 -15.6 64 -9 64 0 C 64 9 56 15.6 44 13.6 C 30 11 18 13 4 12.4 C -4 12 -12 9 -12 0 Z', pivot: [0, 0], len: 50, layer: 5, fill: 'color',
          spots: [{ d: 'M 8 -8.4 C 20 -9.4 32 -8 42 -9 C 44.4 -3 44.4 3 42 9 C 32 8 20 9.4 8 8.4 C 6 3 6 -3 8 -8.4 Z', fill: 'dark' }] },
        head: { d: 'M -10 0 C -10 -8 -4 -10 2 -10 C 8 -10 10 -7 12 -5 C 16 -4.4 20 -3.6 21.6 -2 C 22.8 -0.6 22.8 0.6 21.6 2 C 20 3.6 16 4.4 12 5 C 10 7 8 10 2 10 C -4 10 -10 8 -10 0 Z', pivot: [0, 0], len: 12, layer: 5.2, fill: 'color',
          spots: [{ d: 'M 19.4 -2.4 C 21.4 -2.4 22.8 -1.2 22.8 0 C 22.8 1.2 21.4 2.4 19.4 2.4 C 18.4 1.2 18.4 -1.2 19.4 -2.4 Z', fill: 'nose' }] },
        collar: { d: 'M 16.4 -9.2 L 21.8 -8.6 L 21.8 8.6 L 16.4 9.2 Z', pivot: [0, 0], len: 27, layer: 6, fill: 'collar' },
      },
    },

    ant: {
      side: {
        head: { d: 'M -8 -2 C -8 -8 -2 -10 3 -9.4 C 8 -8.8 10.6 -4 10 1 C 9.6 5 6 8 1 8 C -4 8 -8 4.4 -8 -2 Z', pivot: [0, 0], len: 10, layer: 6, fill: 'color' },
        mandible: { d: 'M -1.4 -1.6 C 2 -2.6 5 -1.4 7.4 1.4 C 7.8 2.2 7 2.8 6.2 2.2 C 4.6 1.2 2.6 1 0 1.6 C -2 1.8 -2.6 -1 -1.4 -1.6 Z', pivot: [0, 0], len: 7, layer: 6.1, fill: 'dark' },
        mesosoma: { d: 'M -10 2 C -11 -3 -7 -8.4 0 -9 C 5 -9.4 9.4 -6.4 10.8 -2 C 11.8 1.6 9.4 5.6 4 6.2 C -1 6.8 -9.4 6 -10 2 Z', pivot: [0, 0], len: 10, layer: 5, fill: 'color',
          spots: [{ d: 'M -8 -3.6 C -6.4 -6.6 -3.4 -8 0 -8.2 C -2.2 -6.6 -4.4 -5 -8 -3.6 Z', fill: 'dark' }] },
        petiole: { d: 'M -3.2 2 C -3.4 -1 -1.8 -5.4 0.4 -5.4 C 2.4 -5.4 3.4 -1 3.2 2 C 2.2 3.8 -2.2 3.8 -3.2 2 Z', pivot: [0, 0], len: 10, layer: 4, fill: 'color' },
        stalk: { d: 'M -1 -1.6 L 31 -1.6 C 32.4 -1.6 32.4 1.6 31 1.6 L -1 1.6 C -2.4 1.6 -2.4 -1.6 -1 -1.6 Z', pivot: [0, 0], len: 30, layer: 2.9, fill: 'dark' },
        gaster: { d: 'M 11 -1 C 11 6 7 11 0 11.2 C -8 11.4 -16.4 7.4 -17.4 1.6 C -16.6 -5 -11 -11.8 -4 -12.6 C 3 -13.4 11 -9 11 -1 Z', pivot: [0, 0], len: 10, layer: 3, fill: 'color',
          spots: [{ d: 'M -2.6 -12.8 C -0.6 -6 -0.6 4 -2.2 11.2 L -5.6 10.6 C -4 4 -4 -6 -5.8 -12.2 Z', fill: 'dark' }, { d: 'M -10.6 -9.8 C -9 -4 -9 3 -10.4 8.6 L -12.8 7 C -11.6 2 -11.6 -3.6 -12.8 -8 Z', fill: 'dark' }] },
        femur: { d: 'M -1.9 0 C -1.9 -2.4 1.9 -2.4 1.9 0 L 1.4 17 C 1.4 18.8 -1.4 18.8 -1.4 17 Z', pivot: [0, 0], len: 17, angle: D, layer: 2, fill: 'color' },
        tibia: { d: 'M -1.4 0 C -1.4 -1.8 1.4 -1.8 1.4 0 L 0.9 18 C 2 19.2 2.8 20.2 3.4 21.4 L 2 22 C 1.4 21 0.8 20.4 -0.4 19.6 L -1 18 Z', pivot: [0, 0], len: 21, angle: D, layer: 2.1, fill: 'color' },
      },
      top: {
        head: { d: 'M -7 0 C -7 -6.6 -3 -8.6 2 -8.6 C 7 -8.6 10 -5 10 0 C 10 5 7 8.6 2 8.6 C -3 8.6 -7 6.6 -7 0 Z', pivot: [0, 0], len: 10, layer: 6, fill: 'color' },
        mandible: { d: 'M -1 -1.6 C 3 -2 6 -1 8.4 1.6 C 8.8 2.6 7.8 3 7 2.4 C 5 1.2 3 1 0 1.6 C -2 1.8 -2.4 -1.2 -1 -1.6 Z', pivot: [0, 0], len: 7, layer: 6.1, fill: 'dark' },
        mesosoma: { d: 'M -10 0 C -10 -4 -6 -6 0 -6.6 C 6 -7 11 -4.4 11 0 C 11 4.4 6 7 0 6.6 C -6 6 -10 4 -10 0 Z', pivot: [0, 0], len: 10, layer: 5, fill: 'color' },
        petiole: { d: 'M -3 0 C -3 -2.6 -1.4 -3.4 0 -3.4 C 1.4 -3.4 3 -2.6 3 0 C 3 2.6 1.4 3.4 0 3.4 C -1.4 3.4 -3 2.6 -3 0 Z', pivot: [0, 0], len: 10, layer: 4, fill: 'color' },
        gaster: { d: 'M 11 0 C 11 8 4 12 -3 12 C -11 12 -17 7 -17 0 C -17 -7 -11 -12 -3 -12 C 4 -12 11 -8 11 0 Z', pivot: [0, 0], len: 10, layer: 3, fill: 'color',
          spots: [{ d: 'M -2 -12 C 0 -6 0 6 -2 12 L -5.4 11.8 C -3.4 6 -3.4 -6 -5.4 -11.8 Z', fill: 'dark' }, { d: 'M -10.4 -10 C -8.8 -4 -8.8 4 -10.4 10 L -12.8 8.6 C -11.4 3 -11.4 -3 -12.8 -8.6 Z', fill: 'dark' }] },
      },
    },

    spider: {
      side: {
        abdomen: { d: 'M 22 0 C 22 13 12 22 -1 22 C -15 22 -27 13 -27 1 C -27 -12 -16 -24 -2 -24 C 12 -24 22 -14 22 0 Z', pivot: [0, 0], len: 10, layer: 3, fill: 'color',
          spots: [{ d: 'M 8 -16 L 0 -10 L -8 -16 L -4 -18.4 L 0 -15.4 L 4 -18.4 Z', fill: 'mark' }, { d: 'M 2 -6 L -6 0 L -14 -6 L -10 -8.4 L -6 -5.4 L -2 -8.4 Z', fill: 'mark' }, { d: 'M -4 4 L -12 10 L -20 4 L -16 1.6 L -12 4.6 L -8 1.6 Z', fill: 'mark' }] },
        cephalo: { d: 'M 16 -2 C 16 8 9 14 -1 14 C -10 14 -18 9 -18 0 C -18 -10 -12 -17 -2 -17 C 8 -17 16 -12 16 -2 Z', pivot: [0, 0], len: 10, layer: 4, fill: 'color',
          lines: ['M -12 -6 C -6 -9 2 -9 8 -5'] },
        head: { d: 'M -7 3 C -8 -4 -3 -8 3 -8 C 8 -8 10.4 -3 10 2 C 9.6 6 -6 8 -7 3 Z', pivot: [0, 0], len: 10, layer: 5, fill: 'color' },
        fang: { d: 'M -2.6 0 C -2.6 -2.6 2.6 -2.6 2.6 0 L 1.6 8 C 1.4 9.6 0.2 10.6 -1.2 10.4 L -2 8 Z', pivot: [0, 0], len: 8, angle: D, layer: 5.1, fill: 'dark' },
        femur: { d: 'M -3.2 0 C -3.2 -3.8 3.2 -3.8 3.2 0 L 2.2 42 C 2.2 44.6 -2.2 44.6 -2.2 42 Z', pivot: [0, 0], len: 42, angle: D, layer: 2, fill: 'color' },
        tibia: { d: 'M -2.2 0 C -2.2 -2.8 2.2 -2.8 2.2 0 L 1 50 C 1 51.6 -1 51.6 -1 50 Z', pivot: [0, 0], len: 50, angle: D, layer: 2.1, fill: 'color', lines: ['M -1.6 14 L 1.6 14', 'M -1.3 30 L 1.3 30'] },
        palp: { d: 'M -1.8 0 C -1.8 -2.4 1.8 -2.4 1.8 0 L 1.4 11 C 1.4 13.4 -1.4 13.4 -1.4 11 Z', pivot: [0, 0], len: 11, angle: D, layer: 6, fill: 'color' },
      },
    },

    bird: {
      side: {
        body: { d: 'M -14 -2 C -10 -10 4 -15 18 -16 C 30 -16.6 38 -9 38 1 C 38 11 30 17.6 18 17.6 C 6 17.6 -6 12 -14 -2 Z', pivot: [0, 0], len: 22, layer: 5, fill: 'color',
          spots: [{ d: 'M 14 6 C 22 4 32 4 36.6 6.4 C 34.6 13 27.6 16.6 18 16.6 C 12 16.6 8 14 7 12 C 8 9 10 7 14 6 Z', fill: 'belly' }] },
        neck: { d: 'M -2 -11 C 8 -11 16 -8.6 22 -7 C 25.6 -6 25.6 6 22 7 C 16 8.6 8 11 -2 11 C -6.4 11 -6.4 -11 -2 -11 Z', pivot: [0, 0], len: 25.6, layer: 5.1, fill: 'color' },
        head: { d: 'M -10 0 C -10 -6 -5.6 -10 0 -10 C 5.6 -10 10 -6 10 0 C 10 6 5.6 10 0 10 C -5.6 10 -10 6 -10 0 Z', pivot: [0, 0], len: 10, layer: 5.2, fill: 'color',
          spots: [{ d: 'M 1 3 C 4 2 8 2.4 9.6 2.8 C 9 6.6 5.6 9.4 1.6 9.6 C 0.4 7.4 0 5 1 3 Z', fill: 'belly' }] },
        beak: { d: 'M 7.6 -3.4 C 11.6 -3.6 16 -1.8 19.8 0 C 16 1.8 11.6 3.2 7.6 3 C 6.6 1.2 6.6 -1.6 7.6 -3.4 Z', pivot: [0, 0], len: 10, layer: 6, fill: 'beak', lines: ['M 8.4 0 L 15 0.2'] },
        wing: { d: 'M -2 -5 C 8 -8.4 22 -6.4 32 -1 C 34 0 33.6 2.6 31 2.6 C 22 3.2 10 6.4 0 6.2 C -5 6 -6 -3 -2 -5 Z', pivot: [0, 0], len: 30, layer: 7, fill: 'dark',
          lines: ['M 12 1.6 C 18 1 24 0.6 30 1', 'M 8 -2.6 C 14 -3 20 -2 26 -0.6'] },
        tail: { d: 'M 0 -3 C 6 -5 14 -7 19 -6.6 C 20.4 -3 20.4 3 19 6.6 C 14 7 6 5 0 3 C -2 1.4 -2 -1.4 0 -3 Z', pivot: [0, 0], len: 16, layer: 1, fill: 'dark' },
        shank: { d: 'M -1.2 0 L 1.2 0 L 1 16 L -1 16 Z', pivot: [0, 0], len: 16, angle: D, layer: 2, fill: 'beak' },
        toes: { d: 'M -4.4 -0.6 L -0.6 -0.6 L 0.6 -1.8 L 1.4 -0.6 L 7.6 -0.6 C 8 -0.6 8 0.8 7.6 0.8 L -4.4 0.8 C -4.8 0.8 -4.8 -0.6 -4.4 -0.6 Z', pivot: [0, 0], len: 6, layer: 2.1, fill: 'beak' },
      },
      top: {
        body: { d: 'M -14 0 C -12 -8 2 -15 18 -15 C 30 -15 38 -8 38 0 C 38 8 30 15 18 15 C 2 15 -12 8 -14 0 Z', pivot: [0, 0], len: 22, layer: 5, fill: 'color' },
        beak: { d: 'M 8 -3 C 12 -2.4 16 -1 19 0 C 16 1 12 2.4 8 3 Z', pivot: [0, 0], len: 10, layer: 6, fill: 'beak' },
      },
    },

    fish: {
      side: {
        fore: { d: 'M -14 -14 C 0 -16 20 -14.4 34 -10.4 C 42 -8 47 -3.4 47 0.4 C 47 4 42 7.6 34 10 C 20 13.6 0 15.6 -14 14 Z', pivot: [0, 0], len: 32, layer: 5.2, fill: 'color',
          spots: [{ d: 'M -14 6 C 0 7.6 20 7 34 4.6 C 38 5 40 6.4 40.6 7.2 C 38 8.6 36 9.4 34 10 C 20 13.6 0 15.6 -14 14 Z', fill: 'belly' }, { d: 'M -14 -14 C 0 -16 20 -14.4 30 -11.4 C 20 -9 0 -8.4 -14 -9 Z', fill: 'dark' }],
          lines: ['M 24 -10.4 C 20.6 -4 20.6 4 24 10.4', 'M 46.6 1.8 L 42.6 2.4'] },
        mid: { d: 'M -10 -8.6 C 6 -10.4 26 -14 50 -15.4 L 50 15.4 C 26 14.4 6 10.6 -10 8.6 C -13.4 4 -13.4 -4 -10 -8.6 Z', pivot: [0, 0], len: 40, layer: 5.1, fill: 'color',
          spots: [{ d: 'M -10 3.4 C 6 4.6 26 6.4 50 7.4 L 50 15.4 C 26 14.4 6 10.6 -10 8.6 Z', fill: 'belly' }, { d: 'M -10 -8.6 C 6 -10.4 26 -14 50 -15.4 L 50 -9.4 C 26 -8.4 6 -6 -10 -5.6 Z', fill: 'dark' }] },
        peduncle: { d: 'M -8 -4.4 C 0 -5.4 10 -7.4 20 -9.4 L 20 9.4 C 10 7.4 0 5.4 -8 4.4 C -10.4 2.4 -10.4 -2.4 -8 -4.4 Z', pivot: [0, 0], len: 18, layer: 5, fill: 'color' },
        caudal: { d: 'M 0 -2.4 C 6 -6 14 -14 20.6 -16 C 18.4 -8 16.4 -3 15.4 0 C 16.4 3 18.4 8 20.6 16 C 14 14 6 6 0 2.4 C -1.4 1.2 -1.4 -1.2 0 -2.4 Z', pivot: [0, 0], len: 18, layer: 1, fill: 'fin',
          lines: ['M 3 -1 C 8 -4 12 -8 17 -12', 'M 3 1 C 8 4 12 8 17 12'] },
        dorsal: { d: 'M 8 -9 C 14 -22 24 -28 36 -27 C 34 -21 33 -17 34 -12.6 Z', pivot: [0, 0], len: 40, layer: 1.1, fill: 'fin', lines: ['M 18 -13 C 20 -18 23 -22 27 -24.6'] },
        anal: { d: 'M 0 6 L 13.6 8 C 12 9.6 11 12 11 16 C 6 15.6 2 12 0 6 Z', pivot: [0, 0], len: 40, layer: 1.2, fill: 'fin' },
        pectoral: { d: 'M 0 -2.2 C 4 -4.4 9 -4.6 11.4 -1.2 C 11.6 2 6.4 4.2 0 2.2 C -1.6 1 -1.6 -1 0 -2.2 Z', pivot: [0, 0], len: 8, layer: 6, fill: 'fin' },
      },
    },

    // Scenery silhouettes (units: tree height / 100, root at the origin, up is -y). Each kind has variants; a seed picks
    // one and may mirror it.
    scenery: {
      trunk: [
        'M -5 0 C -4 -16 -3.4 -34 -2.6 -56 L 2.6 -56 C 3 -44 4 -30 5 -18 C 9 -24 13 -30 15.4 -36 L 17.4 -34.6 C 14 -26 9 -18 5.2 -12 L 5.6 0 Z',
        'M -5.4 0 C -4.4 -16 -3.6 -34 -2.8 -56 L 2.6 -56 C 3 -40 3.6 -26 4.4 -12 L 5.2 0 C 2 0 -1 0 -5.4 0 Z M -3.6 -30 C -8 -36 -12 -40 -16 -44 L -14.4 -45.6 C -10 -42 -6.4 -38 -3.2 -36 Z',
      ],
      pineTrunk: 'M -2.8 0 L -1.2 -92 L 1.2 -92 L 2.8 0 Z',
      round: [scallop(0, -64, 32, 27, [1, .72, 1.06, .7, 1, .74, 1.04, .68, .98, .72, 1.06, .7]), scallop(0, -62, 34, 28, [1.04, .68, .96, .74, 1.06, .68, 1, .72, 1.04, .7]), scallop(0, -66, 30, 29, [1, .7, 1.08, .72, .96, .68, 1.04, .74, 1, .68, 1.06, .72, 1, .7])],
      tall: [scallop(0, -60, 21, 40, [1.06, .6, 1, .66, 1.08, .6, 1, .66, 1.06, .62]), scallop(0, -62, 20, 38, [1.04, .62, 1.08, .6, 1, .64, 1.06, .6])],
      pine: [
        'M 0 -100 L 9 -80 L 4 -81 L 16 -60 L 8 -61 L 22 -38 L 11 -39 L 28 -14 L 0 -16 L -28 -14 L -11 -39 L -22 -38 L -8 -61 L -16 -60 L -4 -81 L -9 -80 Z',
        'M 0 -100 L 11 -76 L 5 -77 L 19 -52 L 9 -53 L 26 -22 L 0 -25 L -26 -22 L -9 -53 L -19 -52 L -5 -77 L -11 -76 Z',
      ],
      // Clumps riding on distant hill edges (units: px / 40 above the ground line).
      bush: [scallop(0, 0, 40, 26, [1, .68, 1.06, .66, 1, .7, 1.04, .68]), scallop(0, 0, 56, 22, [1.04, .7, 1, .66, 1.06, .68, 1, .72, 1.04, .68]), scallop(0, 0, 30, 30, [1, .7, 1.04, .68, 1, .72])],
      // Foreground plant leaves (units: leaf height / 100, root at the origin).
      leaf: [
        'M -3.4 0 C -3.6 -30 -1 -70 4 -100 C 4 -70 3.6 -30 3.4 0 Z',
        'M -4 0 C -5 -40 6 -80 28 -100 C 6 -76 4.6 -40 4 0 Z',
        'M -2.6 0 C -16 -30 -13 -72 0 -100 C 13 -72 16 -30 2.6 0 Z',
      ],
    },
  };
})();
