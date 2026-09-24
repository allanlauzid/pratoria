<script>
  // Cápsula de cronômetros no topo da tela (e dentro do livro).
  // Um cronômetro: [anel] [tempo grande] [tempo original (mini) + nome]. Tocar pausa/continua.
  //   Pausado: cinza, ▶ verde acima do tempo e "Parar" no lugar do nome. Tempo esgotado: "Parar".
  //   Nome comprido: arrastar LONGO da direita para a esquerda mostra tudo; fecha 3 s depois de soltar
  //   o dedo ou arrastando para o outro lado.
  // Vários: uma cápsula só, sem nomes — anéis em fila, o que acaba primeiro na ponta direita, com o tempo dele.
  //   Tocar abre a lista completa.
  import Anel from './Anel.svelte';
  import Icone from './Icone.svelte';
  import { cron, alternar, parar, restante, relogioTexto, progresso, abrirCronometro, estadoDe, ordenados } from '../lib/cronometros.svelte.js';
  import { nivelDeAlerta } from '../core/alertas.js';
  import { rotuloDuracao } from '../core/tempos.js';
  let { noLivro = false, ocultar = [] } = $props();

  const visiveis = $derived((cron.agora, ordenados()).filter((c) => !c.chave || !ocultar.includes(c.chave)));
  const unico = $derived(visiveis.length === 1 ? visiveis[0] : null);
  const primeiro = $derived(visiveis[0]);
  const fila = $derived(visiveis.slice().reverse());       // o que acaba primeiro fica na direita
  const alertaDe = (c) => (estadoDe(c) === 'rodando' ? nivelDeAlerta(restante(c)) : null);
  const tempoDe = (c) => (c.tocando ? 'Pronto!' : relogioTexto(restante(c)));

  // ---- arrastar para ver o nome inteiro ----
  let expandido = $state(false);
  let x0 = null, arrastou = false, fechar = null;
  const LONGO = 70;
  function descer(e) { x0 = e.clientX; arrastou = false; clearTimeout(fechar); }
  function mover(e) {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 12) arrastou = true;
    if (dx < -LONGO && !expandido) expandido = true;
    if (dx > LONGO / 2 && expandido) { expandido = false; x0 = null; }
  }
  function subir() { x0 = null; if (expandido) { clearTimeout(fechar); fechar = setTimeout(() => (expandido = false), 3000); } }
  function tocar() { if (arrastou) { arrastou = false; return; } if (unico && !unico.tocando) alternar(unico.id); }
</script>

{#if unico}
  {@const c = unico}
  {@const est = estadoDe(c)}
  <div class="cronos" class:no-livro={noLivro} class:expandido role="region" aria-label="Cronômetro" data-sem-virar>
    <div class="crono um" data-estado={est} role={c.tocando ? 'alert' : undefined}
      onpointerdown={descer} onpointermove={mover} onpointerup={subir} onpointercancel={subir}>
      <button class="corpo" onclick={tocar} aria-label={`${c.rotulo}: ${tempoDe(c)}. ${est === 'rodando' ? 'Tocar para pausar' : est === 'pausado' ? 'Tocar para continuar' : ''}`}>
        <Anel tamanho={38} texto="" resta={c.tocando ? 1 : (cron.agora, 1 - progresso(c))} estado={est} alerta={alertaDe(c)} espessura={4} />
        <span class="tempo-caixa">
          {#if est === 'pausado'}<span class="play"><Icone nome="tocar" tamanho={14} /></span>{/if}
          <strong class="tempo" aria-live={c.tocando ? 'assertive' : 'off'}>{tempoDe(c)}</strong>
        </span>
      </button>
      {#if est === 'rodando'}
        <button class="nomes" onclick={tocar} tabindex="-1" aria-hidden="true">
          {#if !c.semNome}<small class="mini">{rotuloDuracao(c.duracao)}</small>{/if}
          <span class="nome">{c.semNome ? rotuloDuracao(c.duracao) : c.rotulo}</span>
        </button>
      {:else}
        <button class="parar" onclick={() => parar(c.id)}>Parar</button>
      {/if}
    </div>
  </div>
{:else if visiveis.length > 1}
  <div class="cronos" class:no-livro={noLivro} role="region" aria-label="Cronômetros" data-sem-virar>
    <button class="crono varios" data-estado={estadoDe(primeiro)} onclick={abrirCronometro}
      aria-label={`${visiveis.length} cronômetros. O próximo: ${primeiro.rotulo}, ${tempoDe(primeiro)}. Abrir a lista.`}>
      <span class="aneis">
        {#each fila as c (c.id)}
          <Anel tamanho={c === primeiro ? 38 : 30} texto="" resta={c.tocando ? 1 : (cron.agora, 1 - progresso(c))} estado={estadoDe(c)} alerta={alertaDe(c)} espessura={4} />
        {/each}
      </span>
      <strong class="tempo">{tempoDe(primeiro)}</strong>
    </button>
  </div>
{/if}

<style>
  /* logo abaixo da barra do topo (para não cobrir a nuvem e o Mais) */
  .cronos { position: fixed; z-index: 2500; top: calc(3.6rem + env(safe-area-inset-top)); left: 50%; translate: -50% 0; width: min(calc(100% - 1rem), 24rem);
    display: grid; justify-items: center; pointer-events: none; transition: width .25s var(--mola-padrao); }
  .cronos.expandido { width: calc(100% - 1rem); max-width: 40rem; }
  @media (min-width: 64rem) { .cronos { top: calc(.75rem + env(safe-area-inset-top)); } }
  .cronos.no-livro { top: calc(56px + env(safe-area-inset-top)); z-index: 60; }
  .crono { pointer-events: auto; position: relative; isolation: isolate; width: 100%; box-sizing: border-box; border-radius: 999px; color: var(--tinta);
    background: var(--papel-folha); border: 1.5px solid var(--linha); box-shadow: 0 8px 24px -10px rgba(40,25,10,.45); touch-action: pan-y; font-family: var(--fonte-texto); }
  /* fundo translúcido: verde pulsando (contando), cinza (pausado), vermelho pulsando (acabou) */
  .crono::before { content: ''; position: absolute; inset: 0; z-index: -1; border-radius: inherit; opacity: 0; }
  [data-estado='rodando'] { border-color: color-mix(in srgb, var(--cron-verde) 45%, var(--linha)); }
  [data-estado='rodando']::before { background: var(--cron-verde); opacity: .12; animation: respirar 2.4s ease-in-out infinite; }
  [data-estado='pausado'] { border-color: color-mix(in srgb, var(--cron-cinza) 55%, var(--linha)); }
  [data-estado='pausado']::before { background: var(--cron-cinza); opacity: .2; }
  [data-estado='pronto'] { border-color: var(--cron-vermelho); }
  [data-estado='pronto']::before { background: var(--cron-vermelho); opacity: .12; animation: respirar-forte 1s ease-in-out infinite; }
  @keyframes respirar { 50% { opacity: .26; } }
  @keyframes respirar-forte { 50% { opacity: .32; } }
  @media (prefers-reduced-motion: reduce) { .crono::before { animation: none !important; } }
  button { border: 0; background: none; color: inherit; font: inherit; padding: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }

  .um { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: .5rem; padding: .3rem .45rem .3rem .35rem; min-height: 50px; }
  .corpo { display: grid; grid-template-columns: auto auto; align-items: center; gap: .55rem; }
  .tempo-caixa { position: relative; display: grid; justify-items: center; }
  .play { position: absolute; bottom: 100%; margin-bottom: -3px; color: var(--cron-verde); }
  .play :global(path) { fill: currentColor; }
  .tempo { font-family: var(--fonte-titulo); font-variation-settings: var(--titulo-variacao); font-variant-numeric: tabular-nums; font-size: 1.55rem; font-weight: 700; line-height: 1; letter-spacing: -.02em; }
  .nomes { display: grid; justify-items: start; text-align: left; line-height: 1.15; min-width: 0; padding: .2rem .4rem .2rem .2rem; }
  .mini { font-size: .7rem; font-weight: 400; color: color-mix(in srgb, var(--tinta-fraca) 70%, var(--papel-folha)); letter-spacing: .02em; }
  .nome { font-size: .92rem; font-weight: 700; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .expandido .nome { white-space: normal; overflow: visible; }
  .expandido .um { border-radius: 26px; }
  .parar { justify-self: end; min-height: 40px; padding: 0 1.1rem; border-radius: 999px; background: var(--tinta); color: var(--papel-folha); font-weight: 800; }
  [data-estado='pronto'] .parar { background: var(--cron-vermelho); color: #fff; }

  .varios { display: flex; align-items: center; justify-content: flex-end; gap: .6rem; padding: .3rem .9rem .3rem .45rem; min-height: 50px; }
  .aneis { display: flex; align-items: center; gap: .3rem; min-width: 0; overflow: hidden; flex: 1; justify-content: flex-end; }
  .varios .tempo { font-size: 1.35rem; }
</style>
