<script>
  // Mostrador de cronômetro (estilo timer de cozinha): anel que esvazia + marcas + tempo no centro.
  // estado: parado (mostarda) | rodando (vermelho vivo) | pausado (amarelo vivo) | pronto (vermelho, batendo)
  // alerta: amarelo (< 2 min) | laranja (< 1 min) | vermelho (< 30 s) → fundo piscando, sempre translúcido.
  let { resta = 1, texto = '', sub = '', tamanho = 64, estado = 'parado', espessura = 0, alerta = null, children } = $props();
  const e = $derived(espessura || Math.max(4, tamanho / 11));
  const r = $derived((tamanho - e) / 2 - 1);
  const C = $derived(2 * Math.PI * r);
  const marcas = Array.from({ length: 12 }, (_, i) => i * 30);
</script>

<div class="anel" data-estado={estado} data-alerta={estado === 'rodando' ? alerta : null} style:width="{tamanho}px" style:height="{tamanho}px"
  style:--fs="{(tamanho / 4.6) * Math.min(1, 5 / Math.max(1, texto.length))}px" aria-hidden="true">
  <span class="fundo"></span>
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
  <span class="centro">{#if children}{@render children()}{:else}<strong>{texto}</strong>{#if sub}<small>{sub}</small>{/if}{/if}</span>
</div>

<style>
  .anel { position: relative; flex: none; display: grid; place-items: center; --cor: var(--mostarda); --tinta-alerta: transparent; }
  .fundo { position: absolute; inset: 8%; border-radius: 50%; background: var(--tinta-alerta); opacity: 0; }
  svg { position: absolute; inset: 0; overflow: visible; }
  circle { fill: none; }
  .trilho { stroke: color-mix(in srgb, var(--linha) 70%, transparent); }
  .marca { stroke: var(--tinta-fraca); stroke-width: 1.5; stroke-linecap: round; opacity: .5; }
  .arco { stroke: var(--cor); stroke-linecap: round; transition: stroke-dashoffset .5s linear, stroke .3s; }
  [data-estado='rodando'] { --cor: var(--cron-vermelho); }
  [data-estado='pausado'] { --cor: var(--cron-amarelo); }
  [data-estado='pronto'] { --cor: var(--cron-vermelho); animation: bater 1s ease-in-out infinite; }
  [data-alerta='amarelo'] { --tinta-alerta: var(--cron-amarelo); }
  [data-alerta='laranja'] { --tinta-alerta: var(--cron-laranja); }
  [data-alerta='vermelho'] { --tinta-alerta: var(--cron-vermelho); }
  [data-alerta] .fundo { animation: piscar 1s ease-in-out infinite; }
  [data-alerta='vermelho'] .fundo { animation-duration: .6s; }
  @keyframes piscar { 50% { opacity: .26; } }
  @keyframes bater { 50% { transform: scale(1.06) rotate(-3deg); } }
  @media (prefers-reduced-motion: reduce) { [data-estado='pronto'], [data-alerta] .fundo { animation: none; } [data-alerta] .fundo { opacity: .18; } .arco { transition: none; } }
  .centro { position: relative; display: grid; justify-items: center; line-height: 1; text-align: center; }
  strong { font-family: var(--fonte-titulo); font-variation-settings: var(--titulo-variacao); font-variant-numeric: tabular-nums; font-size: var(--fs); font-weight: 700; color: var(--tinta); letter-spacing: -.02em; }
  small { font-size: max(10px, calc(var(--fs) * .38)); font-weight: 700; color: var(--tinta-suave); margin-top: .2em; text-transform: uppercase; letter-spacing: .06em; }
</style>
