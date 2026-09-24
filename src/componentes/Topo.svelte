<script>
  // Cabeçalho das telas no celular: marca (ou voltar) + ações à direita.
  import Marca from './Marca.svelte';
  import Icone from './Icone.svelte';
  import NuvemStatus from './NuvemStatus.svelte';
  import { cron, abrirCronometro } from '../lib/cronometros.svelte.js';
  let { voltarPara = '', titulo = '', acoes } = $props();
</script>

<header class="topo">
  <div class="esq">
    {#if voltarPara}
      <a class="botao-icone" href={'#' + voltarPara} aria-label="Voltar"><Icone nome="voltar" /></a>
      {#if titulo}<span class="titulo">{titulo}</span>{/if}
    {:else}
      <Marca />
    {/if}
  </div>
  <div class="dir">
    <button class="botao-icone crono" onclick={abrirCronometro} aria-label={cron.lista.length ? `Cronômetro (${cron.lista.length} rodando)` : 'Cronômetro'}>
      <Icone nome="cronometro" />{#if cron.lista.length}<span class="ponto" aria-hidden="true">{cron.lista.length}</span>{/if}
    </button>
    {#if acoes}{@render acoes()}{:else}<NuvemStatus />{/if}
  </div>
</header>

<style>
  .topo {
    position: sticky; top: 0; z-index: 20;
    display: flex; align-items: center; justify-content: space-between; gap: .5rem;
    padding: calc(env(safe-area-inset-top) + .25rem) max(.5rem, env(safe-area-inset-right)) .25rem max(.75rem, env(safe-area-inset-left));
    background: color-mix(in srgb, var(--papel) 92%, transparent);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px solid color-mix(in srgb, var(--linha) 60%, transparent);
  }
  .topo { container-type: inline-size; }
  .esq, .dir { display: flex; align-items: center; gap: .25rem; min-width: 0; }
  .dir { flex: none; }
  .crono { position: relative; color: var(--tinta-suave); }
  .ponto { position: absolute; top: 4px; right: 2px; min-width: 18px; height: 18px; border-radius: 9px; background: var(--terracota-forte); color: #fff;
    font-size: .68rem; font-weight: 800; display: grid; place-items: center; padding: 0 4px; }
  /* tela estreita ou letra grande: a nuvem vira só o ícone */
  @container (max-width: 360px) { .dir :global(.nuvem span) { display: none; } .dir :global(.nuvem) { padding: 0; width: 40px; justify-content: center; border-color: transparent; background: transparent; } }
  :global(html[data-texto='muito-grande']) .dir :global(.nuvem span) { display: none; }
  :global(html[data-texto='muito-grande']) .dir :global(.nuvem) { padding: 0; width: 40px; justify-content: center; border-color: transparent; background: transparent; }
  .titulo { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (min-width: 64rem) { .topo { display: none; } }
</style>
