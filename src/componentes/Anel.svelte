<script>
  // Mostrador de cronômetro (estilo timer de cozinha): anel que esvazia + marcas + tempo no centro.
  let { resta = 1, texto = '', sub = '', tamanho = 64, estado = 'parado', espessura = 0 } = $props();
  // estado: parado | rodando | pausado | pronto
  const e = $derived(espessura || Math.max(4, tamanho / 11));
  const r = $derived((tamanho - e) / 2 - 1);
  const C = $derived(2 * Math.PI * r);
  const marcas = Array.from({ length: 12 }, (_, i) => i * 30);
</script>

<div class="anel" data-estado={estado} style:width="{tamanho}px" style:height="{tamanho}px" style:--fs="{(tamanho / 4.6) * Math.min(1, 5 / Math.max(1, texto.length))}px" aria-hidden="true">
  <svg viewBox="0 0 {tamanho} {tamanho}" width={tamanho} height={tamanho}>
    <circle class="trilho" cx={tamanho / 2} cy={tamanho / 2} {r} stroke-width={e} />
    {#if tamanho >= 90}
      {#each marcas as a}
        <line class="marca" x1={tamanho / 2} y1={e + 4} x2={tamanho / 2} y2={e + (a % 90 ? 8 : 12)} transform="rotate({a} {tamanho / 2} {tamanho / 2})" />
      {/each}
    {/if}
    <circle class="arco" cx={tamanho / 2} cy={tamanho / 2} {r} stroke-width={e}
      stroke-dasharray={C} stroke-dashoffset={C * (1 - Math.max(0, Math.min(1, resta)))} transform="rotate(-90 {tamanho / 2} {tamanho / 2})" />
  </svg>
  <span class="centro"><strong>{texto}</strong>{#if sub}<small>{sub}</small>{/if}</span>
</div>

<style>
  .anel { position: relative; flex: none; display: grid; place-items: center; }
  svg { position: absolute; inset: 0; overflow: visible; }
  circle { fill: none; }
  .trilho { stroke: color-mix(in srgb, var(--linha) 70%, transparent); }
  .marca { stroke: var(--tinta-fraca); stroke-width: 1.5; stroke-linecap: round; opacity: .5; }
  .arco { stroke: var(--terracota); stroke-linecap: round; transition: stroke-dashoffset .5s linear, stroke .3s; }
  [data-estado='parado'] .arco { stroke: var(--mostarda); }
  [data-estado='pausado'] .arco { stroke: var(--tinta-fraca); }
  [data-estado='pronto'] .arco { stroke: var(--oliva); }
  [data-estado='pronto'] { animation: bater 1s ease-in-out infinite; }
  @keyframes bater { 50% { transform: scale(1.06) rotate(-3deg); } }
  @media (prefers-reduced-motion: reduce) { [data-estado='pronto'] { animation: none; } .arco { transition: none; } }
  .centro { position: relative; display: grid; justify-items: center; line-height: 1; text-align: center; }
  strong { font-family: var(--fonte-titulo); font-variation-settings: var(--titulo-variacao); font-variant-numeric: tabular-nums; font-size: var(--fs); font-weight: 700; color: var(--tinta); letter-spacing: -.02em; }
  small { font-size: max(10px, calc(var(--fs) * .38)); font-weight: 700; color: var(--tinta-suave); margin-top: .2em; text-transform: uppercase; letter-spacing: .06em; }
</style>
