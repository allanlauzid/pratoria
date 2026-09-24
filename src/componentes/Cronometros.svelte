<script>
  // Pilha de cronômetros ativos, no topo da tela (e dentro do livro).
  import Icone from './Icone.svelte';
  import Anel from './Anel.svelte';
  import { cron, pausar, retomar, maisUmMinuto, parar, restante, relogioTexto, progresso, abrirCronometro } from '../lib/cronometros.svelte.js';
  let { noLivro = false, ocultar = [] } = $props();
  const visiveis = $derived(cron.lista.filter((c) => !c.chave || !ocultar.includes(c.chave)));
</script>

{#if visiveis.length}
  <div class="cronos" class:no-livro={noLivro} role="region" aria-label="Cronômetros" data-sem-virar>
    {#each visiveis as c (c.id)}
      {@const s = restante(c)}
      <div class="crono" class:tocando={c.tocando} class:pausado={c.pausadoCom != null} role={c.tocando ? 'alert' : undefined}>
        <button class="info" onclick={abrirCronometro} aria-label="Abrir cronômetros">
          <span class="mini-anel"><Anel tamanho={34} texto="" resta={c.tocando ? 1 : (cron.agora, 1 - progresso(c))} estado={c.tocando ? 'pronto' : c.pausadoCom != null ? 'pausado' : 'rodando'} espessura={4} /></span>
          <span class="linhas"><strong class="tempo" aria-live={c.tocando ? 'assertive' : 'off'}>{c.tocando ? 'Pronto!' : relogioTexto(s)}</strong>
          <small>{c.rotulo}{c.faixa ? ` · ${c.faixa}` : ''}{c.titulo ? ` · ${c.titulo}` : ''}</small></span>
        </button>
        {#if c.tocando}
          <button class="b" onclick={() => maisUmMinuto(c.id)} aria-label="Mais 1 minuto">+1</button>
          <button class="b forte" onclick={() => parar(c.id)}>Parar</button>
        {:else}
          <button class="b" onclick={() => maisUmMinuto(c.id)} aria-label="Mais 1 minuto">+1</button>
          {#if c.pausadoCom != null}<button class="b" onclick={() => retomar(c.id)} aria-label="Continuar"><Icone nome="tocar" tamanho={18} /></button>
          {:else}<button class="b" onclick={() => pausar(c.id)} aria-label="Pausar"><Icone nome="pausa" tamanho={18} /></button>{/if}
          <button class="b" onclick={() => parar(c.id)} aria-label="Cancelar cronômetro"><Icone nome="fechar" tamanho={18} /></button>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .cronos { position: fixed; z-index: 2500; top: calc(.5rem + env(safe-area-inset-top)); left: 50%; translate: -50% 0; width: min(calc(100% - 1rem), 24rem);
    display: grid; gap: .35rem; pointer-events: none; }
  .cronos.no-livro { top: calc(56px + env(safe-area-inset-top)); z-index: 60; }
  .crono { pointer-events: auto; display: grid; grid-template-columns: 1fr auto auto auto; align-items: center; gap: .35rem; padding: .3rem .4rem .3rem .35rem;
    border-radius: 999px; background: var(--tinta); color: var(--papel-folha); box-shadow: 0 8px 24px -8px rgba(0,0,0,.45); }
  .crono.pausado { background: #4a4037; }
  .crono.tocando { background: var(--terracota-forte); animation: pulsar 1s ease-in-out infinite; grid-template-columns: 1fr auto auto; }
  @keyframes pulsar { 50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--terracota) 35%, transparent); } }
  @media (prefers-reduced-motion: reduce) { .crono.tocando { animation: none; outline: 3px solid var(--mostarda); } }
  .info { display: flex; align-items: center; gap: .55rem; min-width: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; padding: 0; cursor: pointer; }
  .linhas { display: grid; line-height: 1.15; min-width: 0; }
  .mini-anel { display: grid; border-radius: 50%; background: var(--papel-folha); }
  .tempo { font-variant-numeric: tabular-nums; font-size: 1.1rem; }
  small { font-size: .72rem; opacity: .85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .b { min-width: 40px; height: 40px; border-radius: 999px; border: 0; background: rgba(255,255,255,.12); color: inherit; font-weight: 800; cursor: pointer; display: grid; place-items: center; padding: 0 .6rem; }
  .b.forte { background: #fff; color: var(--terracota-forte); }
</style>
