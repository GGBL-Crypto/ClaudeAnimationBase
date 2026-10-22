// placeholder.js: último script de todo episódio; cobre com céu e texto os planos que ainda não têm cena.
for (const shot of PROJECT.storyboard) if (!SHOTS.some(s => s[0] === shot.start))
  shots([[shot.start, () => { Kit.gradient(STYLE.palette.skyTop, STYLE.palette.skyLow); Kit.text(shot.event, 960, 540, 40, STYLE.palette.ink, { k: 1 }); }]]);
