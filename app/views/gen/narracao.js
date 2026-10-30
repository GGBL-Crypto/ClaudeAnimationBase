// Etapa narração: Kokoro pelo motor, duração real contra a alvo (fora da tolerância só avisa) e player da narração.
import { h } from '../../dom.js';
import { runPanel } from './render.js';

const mmss = x => { const s = Math.round(x); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

export async function render(root, prod, { reload }) {
  root.append(h('p', { class: 'dim' }, 'Gera a voz de cada plano e o timing.json. A troca de cena depois não refaz a narração.'));
  runPanel(root, prod, 'narracao', 'Narrar', reload);
  const r = prod.steps.narracao.result;
  if (!r) return;
  root.append(h('p', {}, `Duração: ${mmss(r.duration)} · alvo ${mmss(r.targetS)} ± ${prod.toleranceMin} min` + (r.wpm ? ` · ritmo real ${r.wpm} ppm` : '')));
  if (!r.within) root.append(h('p', { class: 'err' }, `Fora da tolerância (${r.duration > r.targetS ? 'longa' : 'curta'} demais). Ajuste o roteiro se quiser; a produção segue.`));
  // narration.wav sai desta etapa, antes do render; sem ele o player some. ?v= muda a cada narração (sem cache velho).
  const audio = h('audio', { controls: true, preload: 'metadata', src: `/api/productions/${encodeURIComponent(prod.id)}/files/narration.wav?v=${encodeURIComponent(prod.steps.narracao.finishedAt ?? '')}`, onError: () => audio.remove() });
  root.append(audio);
}
