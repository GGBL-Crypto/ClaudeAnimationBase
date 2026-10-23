// Cut-out parts for the cartoon NatureArt: each piece is an SVG path drawn once (Path2D, built on first use and reused)
// and pinned to a bone of the pose. Units: BL / 100 (human: height / 100), y down, the creature facing right (+x front).
// Piece = {d, pivot: [x, y], len, angle, layer, fill, spots?, lines?}:
//   pivot: the joint the piece hangs from; angle: rest direction of its bone (rad, 0 = forward, PI / 2 = down);
//   len: bone length in units (the piece stretches along the bone to reach the next joint); layer: draw order;
//   fill: key of the look (colors); spots: [{d, fill}] markings drawn flat inside the piece; lines: inner ink lines.
//   Paths use only absolute M, L, C, Q and Z, wound clockwise.
// Characters are recurring, with a name and a fixed palette (the look in nature.js): Lia (human explorer: olive hat,
// red scarf) and Bento (dog: brown patch on one eye, red collar with a gold tag). Red is their hero colour only.
// Imported characters (assets/characters/<name>/, made by scripts/import-parts.py) replace these pieces by name:
// load(name) fills rigs[name] = {spec, side, top} with pieces {art, u, origin, pivot, len, angle, layer, faces?}, art
// being the part's SVG paths or its PNG bitmap (px; u px per unit; origin: the pivot in px) and faces its variants by
// expression (head@happy).
var CARTOON_PARTS = (() => {
  const D = Math.PI / 2;
  // Smooth closed outline through the midpoints of a control polygon (organic silhouettes: crowns, bushes).
  const blob = pts => {
    const m = i => { const a = pts[i % pts.length], b = pts[(i + 1) % pts.length]; return `${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`; };
    return `M ${m(pts.length - 1)} ` + pts.map((p, i) => `Q ${p[0]} ${p[1]} ${m(i)}`).join(' ') + ' Z';
  };
  // Scalloped crown around (cx, cy): radii k[i] alternate peaks and valleys, clockwise from the right.
  const scallop = (cx, cy, rx, ry, k) => blob(k.map((v, i) => { const a = i * 2 * Math.PI / k.length; return [+(cx + Math.cos(a) * rx * v).toFixed(1), +(cy + Math.sin(a) * ry * v).toFixed(1)]; }));

  const parts = {
    human: {
      // Lia: big rounded-square head (drawn at decor.human.headScale: head and hat about 1/3 of her height, on a short
      // neck), noodle limbs, glove hands, big boots.
      name: 'Lia',
      side: {
        // Noodle legs and arms: one constant width end to end (legs 6, arms 5 units), round ends past the joints.
        thigh: { d: 'M -3 0 C -3 -4 3 -4 3 0 L 3 25 C 3 29 -3 29 -3 25 Z', pivot: [0, 0], len: 25, angle: D, layer: 4, fill: 'skin' },
        shin: { d: 'M -3 0 C -3 -4 3 -4 3 0 L 3 24 C 3 28 -3 28 -3 24 Z', pivot: [0, 0], len: 25, angle: D, layer: 4.1, fill: 'skin' },
        shoe: { d: 'M -4.6 -11 L 3.8 -11 C 4 -8 4 -6.4 5 -5.6 C 8 -5.2 11.6 -4.6 13.4 -2.4 C 14.6 -0.8 14.4 1.6 12.4 1.6 L -4.8 1.6 C -6 1.6 -6.2 0.4 -6 -1.2 C -5.6 -4.4 -4.8 -7.6 -4.6 -11 Z', pivot: [0, 0], len: 10, layer: 4.2, fill: 'shoe',
          spots: [{ d: 'M -6 -0.4 L 14.2 -0.4 C 14.1 0.8 13.4 1.6 12.4 1.6 L -4.8 1.6 C -5.8 1.6 -6.1 0.8 -6 -0.4 Z', fill: 'sole' }], lines: ['M -4.9 -7.6 L 4.2 -7.6'] },
        pelvis: { d: 'M -9.4 -7 C -4 -8.4 5 -8.4 10 -7 C 10.8 -1 11.6 5 12 10.6 C 7 11.8 4 11.8 1.2 11 C 0.8 9 0.6 8 0.4 7.4 C 0 8 -0.2 9 -0.6 11 C -4 11.8 -7.6 11.8 -10.8 10.6 C -10.6 4 -10 -1 -9.4 -7 Z',
          pivot: [0, 0], len: 20, angle: -D, layer: 5, fill: 'pants', lines: ['M 5.4 2.4 C 7 3.4 8.6 3.6 10.4 3.2'] },
        torso: { d: 'M -8.6 3 C -9.2 -8 -9.4 -20 -8.6 -27 C -8 -31.6 -4.6 -33.4 0 -33.4 C 4.6 -33.4 8.4 -31.6 8.8 -27 C 9.6 -20 10.6 -8 10.4 3 C 6 4.8 -4.6 4.8 -8.6 3 Z', pivot: [0, 0], len: 20, angle: -D, layer: 5.1, fill: 'shirt',
          lines: ['M -8.6 3 C -4.6 4.8 6 4.8 10.4 3', 'M 2.6 -20.6 L 8.4 -20.6 L 8.4 -16 C 6.8 -15 4.2 -15 2.6 -16 Z'] },
        neck: { d: 'M -3.6 3 L -3.6 -11 L 3.6 -11 L 3.6 3 Z', pivot: [0, 0], len: 11, angle: -D, layer: 5.3, fill: 'skin' },
        head: { d: 'M -7.3 -32.5 L 11.3 -32.5 C 20 -32.5 26 -26.5 26 -17.8 L 26 -0.2 C 29.7 -0.5 30.3 5.4 25.9 5.6 C 25.2 12 20 15.5 11.3 15.5 L -7.3 15.5 C -16 15.5 -22 9.5 -22 0.8 L -22 -17.8 C -22 -26.5 -16 -32.5 -7.3 -32.5 Z', pivot: [0, 0], len: 12, layer: 6.2, fill: 'skin' },
        ear: { d: 'M 0 -5.1 C 4.3 -5.1 4.3 5.1 0 5.1 C -4.3 5.1 -4.3 -5.1 0 -5.1 Z', pivot: [0, 0], len: 12, layer: 6.3, fill: 'skin', lines: ['M 1.3 -2.1 C -2.1 -1.9 -2.1 2.1 1.1 2.4'] },
        // Short hair: a bob at the back and a fringe cut in teeth under the hat brim.
        hair: { d: 'M -21.2 -17.8 C -17.5 -28.5 -7.3 -34.6 2 -34.4 C 11.3 -34.1 19.9 -29.8 23.1 -22.6 L 20.7 -20.2 L 18.8 -23.2 L 16.4 -19.7 L 14.3 -22.9 L 11.9 -19.7 L 9.7 -22.6 L 7.3 -20 L 5.5 -22.1 C 2 -20.5 -1.2 -17.8 -2.3 -12.5 L -4.1 -9.3 C -5.2 -12.8 -7.6 -13.8 -9.5 -13 C -8.9 -7.2 -9.5 0.8 -13.2 8 C -17.5 8.6 -22.5 5.9 -24.4 0.3 C -26 -5.8 -24.4 -13 -21.2 -17.8 Z',
          pivot: [0, 0], len: 12, layer: 6.4, fill: 'hair', lines: ['M -13.5 -13.8 C -15.9 -9.8 -17.5 -4.5 -18 0.8'] },
        // Explorer hat: dome crown and wide brim as one silhouette, with a darker band.
        hat: { d: 'M -29.5 -30.4 C -27.3 -33.3 -19.3 -34.4 -15.3 -34.1 C -15.9 -44.5 -8.7 -53.3 2 -53.6 C 12.7 -53.8 19.6 -45.8 19.3 -34.1 C 24.7 -34.1 32.1 -33 34 -30.6 C 34.8 -29 32.7 -27.4 28.7 -27.4 L -26 -28 C -29.2 -28 -30.5 -29 -29.5 -30.4 Z',
          pivot: [0, 0], len: 12, layer: 9.4, fill: 'hat', spots: [{ d: 'M -15.3 -34.1 C -15.3 -36.5 -15.1 -38.4 -14.5 -40 C -3.3 -41 8.7 -41 19.5 -39.7 C 19.5 -37.8 19.3 -36 19.3 -34.1 Z', fill: 'hatBand' }],
          lines: ['M -15.3 -34.1 L 19.3 -34.1', 'M 2.5 -53 C 1.2 -48.5 1.2 -44.5 2 -41'] },
        scarf: { d: 'M -8.8 -28.6 C -9.2 -31.4 -8 -34 -4 -34.4 C 0 -34.8 5.4 -34.4 8.4 -33 C 10.6 -31.8 11 -29.4 10.2 -27.6 C 11 -24.6 10.8 -20.6 9.8 -16.6 C 7.4 -19.8 4.8 -23.4 3.2 -26.4 C -1 -26.2 -5 -26.6 -8.8 -28.6 Z',
          pivot: [0, 0], len: 20, angle: -D, layer: 5.5, fill: 'scarf', lines: ['M 3.2 -26.4 C 5.8 -27.6 8.6 -27.8 10.2 -27.6'] },
        scarfTail: { d: 'M 0 -2.6 C 4 -3.6 8 -1.4 14 -2.4 L 15.6 1.4 C 10 3.2 5 2 0 2.8 C -1.6 1.4 -1.6 -1.2 0 -2.6 Z', pivot: [0, 0], len: 14, layer: 2, fill: 'scarf', lines: ['M 2 0 C 6 0.6 10 -0.4 13.4 0'] },
        // Short puffed sleeve over a noodle arm.
        upperArm: { d: 'M -4.4 0 C -4.4 -5.4 4.4 -5.4 4.4 0 C 4.4 3.4 4.6 6.4 4 8.2 C 3.4 9 2.9 9 2.5 8.8 L 2.5 17 C 2.5 20.4 -2.5 20.4 -2.5 17 L -2.5 8.8 C -2.9 9 -3.4 9 -4 8.2 C -4.6 6.4 -4.4 3.4 -4.4 0 Z', pivot: [0, 0], len: 17, angle: D, layer: 8, fill: 'skin',
          spots: [{ d: 'M -4.4 0 C -4.4 -5.4 4.4 -5.4 4.4 0 C 4.4 3.4 4.6 6.4 4 8.2 C 1.4 9.4 -1.4 9.4 -4 8.2 C -4.6 6.4 -4.4 3.4 -4.4 0 Z', fill: 'shirt' }], lines: ['M -4 8.2 C -1.4 9.4 1.4 9.4 4 8.2'] },
        forearm: { d: 'M -2.5 0 C -2.5 -3.4 2.5 -3.4 2.5 0 L 2.5 16 C 2.5 19.4 -2.5 19.4 -2.5 16 Z', pivot: [0, 0], len: 16, angle: D, layer: 8.1, fill: 'skin' },
        // Glove hand: three fingers and a thumb (+x, the front).
        hand: { d: 'M -3 -1.2 C -1 -2.4 1.6 -2.4 3.2 -1 C 4 0 4.4 0.8 5.4 1 C 7.4 1.4 7.6 4.2 5.6 4.6 C 4.8 4.8 4.2 4.6 3.8 4.4 C 4.2 6 4.2 7.4 3.8 8.4 C 3.6 10.6 1.4 10.6 1.4 8.8 C 1.2 10.8 -1.2 10.8 -1.2 8.8 C -1.4 10.6 -3.8 10.4 -3.8 8.2 C -4.4 5.6 -4.2 2 -3 -1.2 Z',
          pivot: [0, 0], len: 6, angle: D, layer: 8.6, fill: 'skin', lines: ['M 1.4 8.8 L 1.3 7', 'M -1.2 8.8 L -1.2 7'] },
        // The other glove poses (limb.hand): pointing (index finger along the forearm) and fist.
        handPoint: { d: 'M -3 -1.2 C -1 -2.4 1.6 -2.4 3.2 -1 C 4.6 0.4 5 2.6 4.6 4.8 C 4.4 5.8 3.8 6.4 2.8 6.6 L 2.8 13.4 C 2.8 15.6 0.2 15.6 0.2 13.4 L 0.2 7.4 C -1.4 7.8 -3.4 7.2 -4 5.4 C -4.6 3.4 -4.2 0.6 -3 -1.2 Z',
          pivot: [0, 0], len: 6, angle: D, layer: 8.6, fill: 'skin', lines: ['M -3.6 4.4 C -2.2 5.2 -0.6 5.2 0.2 4.6'] },
        handFist: { d: 'M -3.4 -1.2 C -1.2 -2.6 2 -2.6 3.8 -1 C 5.4 0.6 5.6 3.6 4.6 5.6 C 3.6 7.4 1.4 8 -0.6 7.8 C -2.8 7.6 -4.4 6.2 -4.6 4 C -4.8 2 -4.6 0 -3.4 -1.2 Z',
          pivot: [0, 0], len: 6, angle: D, layer: 8.6, fill: 'skin', lines: ['M -3.4 4.6 C -1.6 5.6 1 5.6 2.8 4.4', 'M 4.8 2.2 C 3.4 2.4 2.4 3 1.8 4'] },
      },
      // Face in head units: two huge white eyes touching (the far one smaller, toward the nose: far = [dx, dy,
      // scale] from the near one), each with a small pupil and its brow; per expression the eye kind, open fraction
      // (lid), slant, brow and mouth (mouth.fill: filled shape; otherwise a stroke). ry: eye half height by kind.
      face: {
        eye: { at: [10.8,-9.83], far: [10.93, -0.53, .9], ry: { dot: 8.8, wide: 9.87 },
          dot: 'M 10.8 -18.6 C 14.2 -18.6 16.9 -14.7 16.9 -9.8 C 16.9 -5 14.2 -1 10.8 -1 C 7.4 -1 4.7 -5 4.7 -9.8 C 4.7 -14.7 7.4 -18.6 10.8 -18.6 Z',
          wide: 'M 10.8 -19.7 C 14.6 -19.7 17.6 -15.3 17.6 -9.8 C 17.6 -4.4 14.6 0 10.8 0 C 7 0 4 -4.4 4 -9.8 C 4 -15.3 7 -19.7 10.8 -19.7 Z',
          arc: 'M 6 -8 C 7.9 -15.7 13.7 -15.7 15.6 -8', x: 'M 7.3 -14.6 L 14.3 -5 M 7.3 -5 L 14.3 -14.6' },
        blush: 'M 6 2.4 C 9.5 2.4 9.5 6.4 6 6.4 C 2.5 6.4 2.5 2.4 6 2.4 Z',
        neutral: { eye: 'dot', lid: 1, brow: 'M 6.3 -21.8 C 9.2 -23.4 12.4 -23.4 15.3 -22.1', mouth: { d: 'M 13.2 9.4 C 15.3 10.4 17.5 10.2 19.3 8.8' } },
        happy: { eye: 'arc', lid: 1, brow: 'M 6.3 -22.9 C 9.2 -25 12.4 -25 15.3 -23.2', mouth: { d: 'M 11.9 7.5 C 15.1 9.1 18.5 8.8 20.9 6.7 C 20.9 12.8 14.3 14.7 11.9 7.5 Z', fill: true } },
        sad: { eye: 'dot', lid: .72, look: .5, brow: 'M 6.3 -21.3 C 9.2 -21.8 12.4 -23.4 15.3 -25.3', mouth: { d: 'M 13.2 11 C 15.3 9.1 17.5 9.1 19.3 10.7' } },
        scared: { eye: 'wide', lid: 1, brow: 'M 6.3 -24.2 C 9.2 -25.8 12.4 -26.4 15.3 -26.9', mouth: { d: 'M 12.4 10.2 C 13.7 8.8 15.1 8.8 16.1 10.2 C 17.2 11.5 18.5 11.5 19.6 10.2' } },
        angry: { eye: 'dot', lid: .68, slant: 1, brow: 'M 6.3 -25 C 9.2 -23.7 12.4 -21.6 15.6 -19.2', mouth: { d: 'M 13.2 10.4 C 15.3 9.4 17.5 9.4 19.3 10.2' } },
        surprised: { eye: 'wide', lid: 1, brow: 'M 6 -25.6 C 8.9 -28.2 12.7 -28.2 15.6 -25.8', mouth: { d: 'M 16.1 6.7 C 18.8 6.7 19.1 13.1 16.1 13.1 C 13.2 13.1 13.5 6.7 16.1 6.7 Z', fill: true } },
        tired: { eye: 'dot', lid: .42, brow: 'M 6.3 -20.5 C 9.2 -20.8 12.4 -20.8 15.3 -20.5', mouth: { d: 'M 13.5 9.9 C 15.6 10.3 17.5 10.3 19.1 9.8' } },
        dead: { eye: 'x', lid: 1, brow: null, mouth: { d: 'M 12.4 10.2 C 13.7 8.8 15.1 8.8 16.1 10.2 C 17.2 11.5 18.5 11.5 19.6 10.2' } },
        // Mouth shapes for talking and reacting (face.mouth, over the expression's): m closed, e small, a wide, o round.
        mouths: {
          m: { d: 'M 13 9.6 C 15.2 10.4 17.6 10.4 19.6 9.2' },
          e: { d: 'M 13 9 C 15.4 9.8 17.8 9.8 19.8 8.6 C 19.6 11.4 17.6 12.6 16.2 12.6 C 14.6 12.6 13.2 11.4 13 9 Z', fill: true },
          a: { d: 'M 12 8 C 15 9.2 18.6 9.2 21 7.4 C 21 13.4 18.4 15.8 16.2 15.8 C 13.8 15.8 12 12.6 12 8 Z', fill: true },
          o: { d: 'M 16.2 7.4 C 18.6 7.4 19.6 9.8 19.6 11.6 C 19.6 13.8 18.2 15.2 16.2 15.2 C 14.2 15.2 12.8 13.8 12.8 11.6 C 12.8 9.8 13.8 7.4 16.2 7.4 Z', fill: true },
        },
      },
    },

    dog: {
      // Bento: cream bean body, long snout with a big black nose, a brown patch on one eye, long droopy ears, thin
      // legs with round paws, red collar with a gold tag.
      name: 'Bento',
      side: {
        body: { d: 'M -17 0 C -17 -14 -6 -20 6 -20 C 20 -20 36 -19 50 -20 C 62 -20.6 69 -10 68 2 C 67 15 59 23 48 23 C 40 23 34 17.4 25 17.4 C 16 17.4 10 23 0 23 C -10 23 -17 13 -17 0 Z', pivot: [0, 0], len: 50, layer: 5, fill: 'color' },
        neck: { d: 'M -6 -10 C 6 -11 18 -8.6 27 -7 C 31.4 -6.2 31.4 6.2 27 7 C 18 8.6 6 11 -6 10 C -10.6 9 -10.6 -9 -6 -10 Z', pivot: [0, 0], len: 27, layer: 5.1, fill: 'color' },
        head: { d: 'M -17.5 -3.75 C -17.5 -14.25 -10 -20 -1.25 -20 C 7.5 -20 13.25 -15 14.25 -8.25 C 21.25 -8 30 -8.25 36.75 -7 C 41.75 -5.75 42.5 3.75 38 6.25 C 31.25 9.5 21.25 10.75 12.5 11.25 C 5 13 -2.5 13 -8.25 10.5 C -14.25 8 -17.5 2.5 -17.5 -3.75 Z', pivot: [0, 0], len: 12, layer: 5.2, fill: 'color',
          spots: [{ d: 'M 4.4 -20.17 C 13.85 -20.17 16.3 -12.47 15.6 -6.52 C 14.9 0.48 9.3 3.98 4.05 3.63 C -2.95 3.28 -7.15 -1.62 -6.8 -8.27 C -6.45 -15.27 -2.95 -20.17 4.4 -20.17 Z', fill: 'dark' },
            { d: 'M 34.5 -10.5 C 39.5 -11.5 43.75 -9.25 43.5 -5.25 C 43.25 -1.75 39.25 -0.75 36 -1.5 C 32.75 -2.25 31.25 -4.25 31.5 -6.75 C 31.75 -9 32.75 -10 34.5 -10.5 Z', fill: 'nose' }],
          lines: ['M 37.5 5.25 C 30 6 23 5.75 17 4.25 C 15.75 4 15 4.5 14.75 5.75'] },
        collar: { d: 'M 6.4 -10.8 C 9.4 -11.2 12.6 -10.8 15 -10.2 L 15.8 9.8 C 13.2 10.8 10 11.2 7.2 11.6 Z', pivot: [0, 0], len: 27, layer: 6, fill: 'collar' },
        tag: { d: 'M 0 -0.4 C 2.8 -0.4 3.8 1.6 3.8 3.2 C 3.8 5.2 2.2 6.6 0 6.6 C -2.2 6.6 -3.8 5.2 -3.8 3.2 C -3.8 1.6 -2.8 -0.4 0 -0.4 Z', pivot: [0, 0], len: 6, angle: D, layer: 6.1, fill: 'tag' },
        // Long droopy ear: drawn twice its bone, so it hangs below the jaw while the chain swings it.
        ear: { d: 'M -1.6 -4 C 4 -5.6 12 -5 18 -3.4 C 23 -2 24.4 3.6 20.4 5.6 C 15 7.8 6 6.4 0 4 C -3 2.8 -3.6 -2.6 -1.6 -4 Z', pivot: [0, 0], len: 11, layer: 8, fill: 'dark' },
        tailSeg: { d: 'M 0 -2.2 C 3.4 -2.2 6.6 -2 10 -1.8 C 12.4 -1.6 12.4 1.6 10 1.8 C 6.6 2 3.4 2.2 0 2.2 C -3 2.2 -3 -2.2 0 -2.2 Z', pivot: [0, 0], len: 10, layer: 1, fill: 'color' },
        tailTip: { d: 'M 0 -2 C 3 -2.2 6 -1.6 9.6 0 C 6 1.6 3 2.2 0 2 C -2.6 2 -2.6 -2 0 -2 Z', pivot: [0, 0], len: 8, layer: 1.1, fill: 'color',
          spots: [{ d: 'M 4.4 -1.7 C 6 -1.3 7.8 -0.7 9.6 0 C 7.8 0.7 6 1.3 4.4 1.7 C 3.8 0.8 3.8 -0.8 4.4 -1.7 Z', fill: 'dark' }] },
        // Thin noodle legs ending in round paws, coming out from under the body.
        armUpper: { d: 'M -3.4 -2 C -3.4 -6.6 3.4 -6.6 3.4 -2 L 2.8 25 C 2.8 28.4 -2.8 28.4 -2.8 25 Z', pivot: [0, 0], len: 25, angle: D, layer: 4, fill: 'color' },
        hipUpper: { d: 'M -5 -3 C -5 -9 5 -9 5 -3 C 4.4 8 3.6 17 2.8 26 C 2.8 29.4 -2.8 29.4 -2.8 26 C -3.6 17 -4.4 8 -5 -3 Z', pivot: [0, 0], len: 26, angle: D, layer: 4, fill: 'color' },
        legLower: { d: 'M -2.8 0 C -2.8 -3.4 2.8 -3.4 2.8 0 L 2.6 27 C 2.6 29.8 -2.6 29.8 -2.6 27 Z', pivot: [0, 0], len: 27, angle: D, layer: 4.1, fill: 'color' },
        paw: { d: 'M -4.6 0.8 C -5.4 -3.4 -2.6 -6.6 1.4 -6.6 C 5.8 -6.6 8.4 -3.6 7.8 0.8 Z', pivot: [0, 0], len: 6, layer: 4.2, fill: 'color', lines: ['M 2.6 -2.4 L 2.8 0.4', 'M 5.2 -2.2 L 5.4 0.4'] },
      },
      top: {
        body: { d: 'M -12 0 C -12 -9 -4 -12 4 -12.4 C 18 -13 30 -11 44 -13.6 C 56 -15.6 64 -9 64 0 C 64 9 56 15.6 44 13.6 C 30 11 18 13 4 12.4 C -4 12 -12 9 -12 0 Z', pivot: [0, 0], len: 50, layer: 5, fill: 'color' },
        head: { d: 'M -15 0 C -15 -11.25 -7.5 -15 1.25 -15 C 8.75 -15 12.5 -11.25 14.25 -6.75 C 22.5 -6.25 32.5 -5.5 37.5 -3.25 C 40.5 -1.75 40.5 1.75 37.5 3.25 C 32.5 5.5 22.5 6.25 14.25 6.75 C 12.5 11.25 8.75 15 1.25 15 C -7.5 15 -15 11.25 -15 0 Z', pivot: [0, 0], len: 12, layer: 5.2, fill: 'color',
          spots: [{ d: 'M 6.25 -15.95 C 13.95 -15.95 16.05 -10.35 15.7 -5.1 C 15.35 0.5 10.8 3.3 5.9 2.95 C -0.05 2.6 -3.2 -1.6 -2.85 -6.5 C -2.5 -12.1 0.3 -15.95 6.25 -15.95 Z', fill: 'dark' },
            { d: 'M 34.25 -4.25 C 38.75 -4.5 42 -2.5 42 0 C 42 2.5 38.75 4.5 34.25 4.25 C 32.5 2.5 32.5 -2.5 34.25 -4.25 Z', fill: 'nose' }] },
        collar: { d: 'M 9 -10 L 14.4 -9.4 L 14.4 9.4 L 9 10 Z', pivot: [0, 0], len: 27, layer: 6, fill: 'collar' },
      },
    },

    ant: {
      // Big round head with big white eyes, three inked body forms on a thin waist, noodle legs.
      side: {
        head: { d: 'M -13.6 -3.4 C -13.6 -13.6 -3.4 -17 5.1 -15.98 C 13.6 -14.96 18.02 -6.8 17 1.7 C 16.32 8.5 10.2 13.6 1.7 13.6 C -6.8 13.6 -13.6 7.48 -13.6 -3.4 Z', pivot: [0, 0], len: 10, layer: 6, fill: 'color' },
        mandible: { d: 'M -1.82 -2.08 C 2.6 -3.38 6.5 -1.82 9.62 1.82 C 10.14 2.86 9.1 3.64 8.06 2.86 C 5.98 1.56 3.38 1.3 0 2.08 C -2.6 2.34 -3.38 -1.3 -1.82 -2.08 Z', pivot: [0, 0], len: 7, layer: 6.1, fill: 'dark' },
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
        head: { d: 'M -11.9 0 C -11.9 -11.22 -5.1 -14.62 3.4 -14.62 C 11.9 -14.62 17 -8.5 17 0 C 17 8.5 11.9 14.62 3.4 14.62 C -5.1 14.62 -11.9 11.22 -11.9 0 Z', pivot: [0, 0], len: 10, layer: 6, fill: 'color' },
        mandible: { d: 'M -1.3 -2.08 C 3.9 -2.6 7.8 -1.3 10.92 2.08 C 11.44 3.38 10.14 3.9 9.1 3.12 C 6.5 1.56 3.9 1.3 0 2.08 C -2.6 2.34 -3.12 -1.56 -1.3 -2.08 Z', pivot: [0, 0], len: 7, layer: 6.1, fill: 'dark' },
        mesosoma: { d: 'M -10 0 C -10 -4 -6 -6 0 -6.6 C 6 -7 11 -4.4 11 0 C 11 4.4 6 7 0 6.6 C -6 6 -10 4 -10 0 Z', pivot: [0, 0], len: 10, layer: 5, fill: 'color' },
        petiole: { d: 'M -3 0 C -3 -2.6 -1.4 -3.4 0 -3.4 C 1.4 -3.4 3 -2.6 3 0 C 3 2.6 1.4 3.4 0 3.4 C -1.4 3.4 -3 2.6 -3 0 Z', pivot: [0, 0], len: 10, layer: 4, fill: 'color' },
        gaster: { d: 'M 11 0 C 11 8 4 12 -3 12 C -11 12 -17 7 -17 0 C -17 -7 -11 -12 -3 -12 C 4 -12 11 -8 11 0 Z', pivot: [0, 0], len: 10, layer: 3, fill: 'color',
          spots: [{ d: 'M -2 -12 C 0 -6 0 6 -2 12 L -5.4 11.8 C -3.4 6 -3.4 -6 -5.4 -11.8 Z', fill: 'dark' }, { d: 'M -10.4 -10 C -8.8 -4 -8.8 4 -10.4 10 L -12.8 8.6 C -11.4 3 -11.4 -3 -12.8 -8.6 Z', fill: 'dark' }] },
      },
    },

    spider: {
      // Two balls (the small head piece hides inside the front one, which carries the big eyes), noodle legs.
      side: {
        abdomen: { d: 'M 23 -1 C 23 13 13 23 -1 23 C -15 23 -25 13 -25 -1 C -25 -15 -15 -25 -1 -25 C 13 -25 23 -15 23 -1 Z', pivot: [0, 0], len: 10, layer: 3, fill: 'color' },
        cephalo: { d: 'M 17 -1 C 17 9 9 17 -1 17 C -11 17 -19 9 -19 -1 C -19 -11 -11 -19 -1 -19 C 9 -19 17 -11 17 -1 Z', pivot: [0, 0], len: 10, layer: 4, fill: 'color' },
        head: { d: 'M -7 3 C -8 -4 -3 -8 3 -8 C 8 -8 10.4 -3 10 2 C 9.6 6 -6 8 -7 3 Z', pivot: [0, 0], len: 10, layer: 5, fill: 'color' },
        fang: { d: 'M -2.6 0 C -2.6 -2.6 2.6 -2.6 2.6 0 L 1.6 8 C 1.4 9.6 0.2 10.6 -1.2 10.4 L -2 8 Z', pivot: [0, 0], len: 8, angle: D, layer: 5.1, fill: 'dark' },
        femur: { d: 'M -2.6 0 C -2.6 -3.4 2.6 -3.4 2.6 0 L 2.4 42 C 2.4 45 -2.4 45 -2.4 42 Z', pivot: [0, 0], len: 42, angle: D, layer: 2, fill: 'color' },
        tibia: { d: 'M -2.4 0 C -2.4 -3 2.4 -3 2.4 0 L 2 50 C 2 53 -2 53 -2 50 Z', pivot: [0, 0], len: 50, angle: D, layer: 2.1, fill: 'color' },
        palp: { d: 'M -1.8 0 C -1.8 -2.4 1.8 -2.4 1.8 0 L 1.4 11 C 1.4 13.4 -1.4 13.4 -1.4 11 Z', pivot: [0, 0], len: 11, angle: D, layer: 6, fill: 'color' },
      },
    },

    bird: {
      // Drop body with a big round head and two big eyes.
      side: {
        body: { d: 'M -14 -2 C -10 -10 4 -15 18 -16 C 30 -16.6 38 -9 38 1 C 38 11 30 17.6 18 17.6 C 6 17.6 -6 12 -14 -2 Z', pivot: [0, 0], len: 22, layer: 5, fill: 'color',
          spots: [{ d: 'M 14 6 C 22 4 32 4 36.6 6.4 C 34.6 13 27.6 16.6 18 16.6 C 12 16.6 8 14 7 12 C 8 9 10 7 14 6 Z', fill: 'belly' }] },
        neck: { d: 'M -2 -11 C 8 -11 16 -8.6 22 -7 C 25.6 -6 25.6 6 22 7 C 16 8.6 8 11 -2 11 C -6.4 11 -6.4 -11 -2 -11 Z', pivot: [0, 0], len: 25.6, layer: 5.1, fill: 'color' },
        head: { d: 'M -12.5 0 C -12.5 -7.5 -7 -12.5 0 -12.5 C 7 -12.5 12.5 -7.5 12.5 0 C 12.5 7.5 7 12.5 0 12.5 C -7 12.5 -12.5 7.5 -12.5 0 Z', pivot: [0, 0], len: 10, layer: 5.2, fill: 'color',
          spots: [{ d: 'M 1.25 3.75 C 5 2.5 10 3 12 3.5 C 11.25 8.25 7 11.75 2 12 C 0.5 9.25 0 6.25 1.25 3.75 Z', fill: 'belly' }] },
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

  // ---------- imported characters ----------
  // SVG text (vtracer) → {w, h, paths: [{d, fill, x, y}]}: each path with its colour and translate, in px.
  function parseSvg(text) {
    const svg = text.match(/<svg\s[^>]*>/)?.[0] || '', num = k => Number(svg.match(new RegExp(`\\s${k}="([\\d.]+)`))?.[1]);
    const paths = [...text.matchAll(/<path\s[^>]*>/g)].map(([p]) => {
      const t = p.match(/translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/);
      return { d: p.match(/\sd="([^"]+)"/)[1].trim(), fill: p.match(/\sfill="([^"]+)"/)?.[1] || '#000000', x: t ? +t[1] : 0, y: t ? +t[2] : 0 };
    });
    return { w: num('width'), h: num('height'), paths };
  }
  // rig.json (px of each part image; unit = px per BL / 100) and its art (key → parsed SVG or bitmap) → pieces by name,
  // with the pivot as the local origin like the authored pieces (origin: the pivot in px of the image),
  // for the side and top views. angle and layer default to the authored piece of the same name; name@variant keys
  // become faces[variant] of the piece name (an expression or 'blink').
  function rigPieces(rig, art) {
    const A = parts[rig.spec], u = rig.unit, out = { spec: rig.spec, side: {}, top: {} };
    if (!A) throw new Error(`Espécie desconhecida no personagem ${rig.name}: ${rig.spec}`);
    if (!(u > 0)) throw new Error(`Unidade inválida no personagem ${rig.name}`);
    for (const key of Object.keys(rig.parts).sort((a, b) => a.includes('@') - b.includes('@'))) {
      const r = rig.parts[key], [name, face] = key.split('@'), view = r.view || 'side', base = A[view]?.[name] || A.side[name] || {};
      if (!art[key]) throw new Error(`Arte ausente da peça ${key} do personagem ${rig.name}`);
      const q = { art: art[key], u, origin: r.pivot, pivot: [0, 0], len: r.len / u, angle: r.angle ?? base.angle ?? 0, layer: r.layer ?? base.layer ?? 0, fill: base.fill || 'color' };
      if (!face) { out[view][name] = q; continue; }
      const b = out[view][name]; if (!b) throw new Error(`Variante ${key} sem a peça ${name} no personagem ${rig.name}`);
      (b.faces ||= {})[face] = q;
    }
    return out;
  }
  // Loads assets/characters/<name>/ (rig.json, then each part's SVG or, without one, its PNG as a bitmap) into
  // rigs[name]. XHR, not fetch: the render opens the studio from file:// (Chrome with file access).
  const rigs = {};
  function get(url, type) {
    return new Promise((ok, bad) => {
      const x = new XMLHttpRequest(), fail = () => bad(new Error(`Não foi possível carregar ${url}`));
      x.open('GET', url); x.responseType = type; x.onerror = fail;
      x.onload = () => (x.status === 200 || x.status === 0) && x.response ? ok(x.response) : fail(); x.send();
    });
  }
  async function load(name, root = 'assets/characters/') {
    const dir = new URL(`${root}${name}/`, document.baseURI).href, rig = await get(dir + 'rig.json', 'json'), art = {};
    await Promise.all(Object.entries(rig.parts).map(async ([key, r]) => {
      art[key] = r.svg ? parseSvg(await get(dir + r.svg, 'text')) : await createImageBitmap(await get(dir + r.file, 'blob'));
    }));
    return rigs[name] = rigPieces(rig, art);
  }

  return Object.assign(parts, { rigs, parseSvg, rigPieces, load });
})();
