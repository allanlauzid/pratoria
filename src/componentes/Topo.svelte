<script>
  // Cabeçalho das telas no celular: marca (ou voltar) + nuvem + Mais (menu) à direita.
  import Marca from './Marca.svelte';
  import Icone from './Icone.svelte';
  import NuvemStatus from './NuvemStatus.svelte';
  import { rota } from '../lib/rota.svelte.js';
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
    {#if acoes}{@render acoes()}{/if}
    <NuvemStatus />
    <a class="botao-icone mais" href="#/ajustes" aria-label="Mais: ajustes, backup e conta" aria-current={rota.nome === 'ajustes' ? 'page' : undefined}><Icone nome="menu" /></a>
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
  .mais { color: var(--tinta); }
  .mais[aria-current='page'] { color: var(--terracota-forte); background: color-mix(in srgb, var(--terracota) 14%, transparent); }
  /* tela estreita ou letra grande: a nuvem vira só o ícone */
  @container (max-width: 360px) { .dir :global(.nuvem span) { display: none; } .dir :global(.nuvem) { padding: 0; width: 40px; justify-content: center; border-color: transparent; background: transparent; } }
  :global(html[data-texto='muito-grande']) .dir :global(.nuvem span) { display: none; }
  :global(html[data-texto='muito-grande']) .dir :global(.nuvem) { padding: 0; width: 40px; justify-content: center; border-color: transparent; background: transparent; }
  .titulo { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (min-width: 64rem) { .topo { display: none; } }
</style>
