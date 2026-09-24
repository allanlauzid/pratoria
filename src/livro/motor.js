// Motor da virada de página (gesto + mola).
//
// Estado contínuo `p`:
//   p ∈ [-1, 0]  virando PARA FRENTE  (a folha atual sai pela lombada)
//   p ∈ [0, 1]   virando PARA TRÁS    (a folha anterior volta)
// • A folha acompanha o dedo 1:1 (p = deslocamento / largura).
// • Ao soltar: projeta o momento (velocidade) e decide completar ou voltar.
// • Animação por mola criticamente amortecida, a partir da posição atual:
//   pode ser agarrada no meio e invertida (interrompível).
// • Eixo travado: gesto que começa vertical é rolagem, não virada.
// • Toque rápido nas laterais: 30% esquerda volta, 30% direita avança.
// • Toque numa linha marcável ([data-marcavel]) fora dos 30% da direita: marca/desmarca a linha.

const IGNORAR = 'button, a, input, label, textarea, select, summary, [data-sem-virar]';

export function criarMotor(palco, op) {
  const { largura, podeAvancar, podeVoltar, aoMudar, aoConcluir, aoInteragir, reduzido, aoTocarItem } = op;
  let p = 0, v = 0, alvo = 0, raf = 0;
  let toque = null;

  const publicar = (borda = 0) => aoMudar(p, borda);

  function animarAte(novoAlvo, velocidade = 0) {
    cancelAnimationFrame(raf);
    alvo = novoAlvo; v = velocidade;
    if (reduzido()) { p = alvo; terminar(); return; }
    const resposta = 0.34, w = (2 * Math.PI) / resposta; // Apple: damping 1.0, response ~0.3–0.4
    let ultimo = performance.now();
    const passo = (agora) => {
      let dt = Math.min(0.032, (agora - ultimo) / 1000); ultimo = agora;
      while (dt > 0) { const h = Math.min(dt, 0.008); const a = -w * w * (p - alvo) - 2 * w * v; v += a * h; p += v * h; dt -= h; }
      if (Math.abs(p - alvo) < 0.002 && Math.abs(v) < 0.02) { p = alvo; publicar(); terminar(); return; }
      publicar();
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
  }
  function terminar() {
    raf = 0; publicar();
    if (p <= -1) { p = 0; aoConcluir(+1); } else if (p >= 1) { p = 0; aoConcluir(-1); }
  }

  const animando = () => raf !== 0;

  function aoBaixar(e) {
    if (e.button > 0 || e.target.closest(IGNORAR)) return;
    const estavaAnimando = animando();
    cancelAnimationFrame(raf); raf = 0;
    toque = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), base: p, eixo: estavaAnimando ? 'x' : null,
      hist: [{ x: e.clientX, t: performance.now() }], dir: p < 0 ? 1 : p > 0 ? -1 : 0, pegouNoAr: estavaAnimando };
    if (estavaAnimando) palco.setPointerCapture?.(e.pointerId);
  }

  function aoMover(e) {
    if (!toque || e.pointerId !== toque.id) return;
    const dx = e.clientX - toque.x0, dy = e.clientY - toque.y0;
    if (!toque.eixo) {
      if (Math.hypot(dx, dy) < 9) return;
      toque.eixo = Math.abs(dx) > Math.abs(dy) * 1.1 ? 'x' : 'y';
      if (toque.eixo === 'y') return;
      palco.setPointerCapture?.(e.pointerId);
      aoInteragir?.();
    }
    if (toque.eixo !== 'x') return;
    e.preventDefault();
    const agora = performance.now();
    toque.hist.push({ x: e.clientX, t: agora }); if (toque.hist.length > 8) toque.hist.shift();
    const W = largura();
    let bruto = toque.base + dx / W;
    if (!toque.dir) toque.dir = dx < 0 ? 1 : -1;
    if (toque.dir === 1) {                // para frente
      if (!podeAvancar()) { p = 0; publicar(elastico(dx / W)); return; }
      p = Math.max(-1, Math.min(0, bruto));
    } else {                              // para trás
      if (!podeVoltar()) { p = 0; publicar(elastico(dx / W)); return; }
      p = Math.max(0, Math.min(1, bruto));
    }
    publicar();
  }

  function aoSoltar(e) {
    if (!toque || e.pointerId !== toque.id) return;
    const t = toque; toque = null;
    const dt = performance.now() - t.t0;
    const dx = e.clientX - t.x0, dy = e.clientY - t.y0;
    if (!t.eixo && Math.hypot(dx, dy) < 10 && dt < 400 && !t.pegouNoAr) {  // toque nas laterais
      const r = palco.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width;
      const item = e.target.closest?.('[data-marcavel]');
      if (item && fx <= 0.7 && aoTocarItem) { aoInteragir?.(); aoTocarItem(item.dataset.marcavel); return; }
      if (fx > 0.7) { aoInteragir?.(); avancar(); } else if (fx < 0.3) { aoInteragir?.(); voltar(); }
      return;
    }
    if (t.eixo !== 'x') { if (p !== 0) animarAte(p < -0.5 ? -1 : p > 0.5 ? 1 : 0); return; }
    // velocidade (fração da largura por segundo) dos últimos ~100 ms
    const h = t.hist, a = h.find((x) => h.at(-1).t - x.t < 100) ?? h[0], b = h.at(-1);
    const vel = b.t > a.t ? ((b.x - a.x) / largura()) / ((b.t - a.t) / 1000) : 0;
    const projetado = p + vel * 0.18;
    if (p < 0) animarAte(projetado <= -0.38 && vel < 0.5 ? -1 : 0, vel);
    else if (p > 0) animarAte(projetado >= 0.38 && vel > -0.5 ? 1 : 0, vel);
    else publicar();
  }

  function avancar() { if (podeAvancar()) animarAte(-1, reduzido() ? 0 : -1.2); }
  function voltar() { if (podeVoltar()) { if (p === 0) p = 0.0001; animarAte(1, reduzido() ? 0 : 1.2); } }

  const semArrastarNativo = (e) => e.preventDefault();
  palco.addEventListener('dragstart', semArrastarNativo);
  palco.addEventListener('pointerdown', aoBaixar);
  palco.addEventListener('pointermove', aoMover, { passive: false });
  palco.addEventListener('pointerup', aoSoltar);
  palco.addEventListener('pointercancel', (e) => { if (toque && e.pointerId === toque.id) { toque = null; if (p !== 0) animarAte(0); } });

  return {
    avancar, voltar,
    destruir() { cancelAnimationFrame(raf); palco.removeEventListener('dragstart', semArrastarNativo); palco.removeEventListener('pointerdown', aoBaixar); palco.removeEventListener('pointermove', aoMover); palco.removeEventListener('pointerup', aoSoltar); },
  };
}

/** Resistência nas pontas do livro (rubber-band). */
function elastico(x, c = 0.55) { return (x * c) / (1 + Math.abs(x) * 6); }
