<script>
  // Tempo esgotado: a tela inteira pulsa num tom translúcido (nunca opaco).
  // Dois toques em qualquer lugar param o pulsar, o som e a vibração.
  // Usa popover (camada do topo) para ficar acima do Modo Cozinhar e das folhas abertas.
  import { cron, alarmeAtivo, silenciarAlarme } from '../lib/cronometros.svelte.js';
  let el;
  let ultimo = 0;
  const ativo = $derived((cron.agora, alarmeAtivo()));
  const nomes = $derived(cron.lista.filter((c) => c.tocando && !c.silenciado).map((c) => c.rotulo).join(' · '));
  $effect(() => {
    if (!el) return;
    try {
      if (ativo) { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover(); }   // reabre para ficar por cima de tudo
      else if (el.matches(':popover-open')) el.hidePopover();
    } catch { /* navegador sem popover: fica o position:fixed */ }
  });
  // escuta na janela (fase de captura): funciona mesmo com uma folha ou o livro por cima
  function toque(e) {
    if (!ativo) return;
    e.preventDefault(); e.stopPropagation();
    const agora = performance.now();
    if (agora - ultimo < 450) { ultimo = 0; silenciou = agora; silenciarAlarme(); }
    else ultimo = agora;
  }
  let silenciou = -Infinity;
  // o toque que para o alarme não pode também apertar o botão que estava embaixo
  function clique(e) { if (ativo || performance.now() - silenciou < 700) { e.preventDefault(); e.stopPropagation(); } }
  function tecla(e) { if (ativo && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); silenciarAlarme(); } }
</script>

<svelte:window onkeydown={tecla} onpointerdowncapture={toque} onclickcapture={clique} />

<div bind:this={el} popover="manual" class="alarme" class:sem-popover={!('showPopover' in HTMLElement.prototype)} class:ligado={ativo}
  role="alertdialog" aria-label="Tempo esgotado" aria-describedby="alarme-dica">
  <div class="aviso">
    <strong>Tempo esgotado</strong>
    {#if nomes}<span>{nomes}</span>{/if}
    <small id="alarme-dica">Toque duas vezes em qualquer lugar para parar</small>
  </div>
</div>

<style>
  .alarme { position: fixed; inset: 0; width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 0; border: 0;
    background: transparent; display: none; place-items: center; touch-action: manipulation; user-select: none; -webkit-user-select: none; cursor: pointer; }
  .alarme:popover-open, .alarme.sem-popover.ligado { display: grid; }
  .alarme::before { content: ''; position: fixed; inset: 0; background: var(--cron-vermelho); opacity: .06; animation: pulsar 1.1s ease-in-out infinite; }
  @keyframes pulsar { 50% { opacity: .3; } }
  @media (prefers-reduced-motion: reduce) { .alarme::before { animation: none; opacity: .2; } }
  .aviso { position: relative; display: grid; justify-items: center; gap: .25rem; padding: 1rem 1.5rem; border-radius: 20px; text-align: center;
    background: color-mix(in srgb, var(--papel-folha) 88%, transparent); color: var(--tinta); box-shadow: 0 12px 40px -12px rgba(120,20,10,.55);
    border: 1.5px solid color-mix(in srgb, var(--cron-vermelho) 50%, transparent); max-width: min(22rem, calc(100% - 2rem)); }
  strong { font-family: var(--fonte-titulo); font-variation-settings: var(--titulo-variacao); font-size: 1.6rem; color: var(--cron-vermelho); }
  span { font-weight: 700; }
  small { color: var(--tinta-suave); font-size: .85rem; }
</style>
