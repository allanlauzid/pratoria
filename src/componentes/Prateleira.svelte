<script>
  // Fileira de ilustrações a giz (recortes). `novas` = ingredientes que acabaram de entrar.
  let { itens = [], novas = [], tamanho = 44, rotulo = 'Ingredientes desenhados' } = $props();
</script>

{#if itens.length}
  <div class="prateleira" role="img" aria-label={`${rotulo}: ${itens.map((i) => i.ingrediente).join(', ')}`}>
    {#each itens as it (it.chave ?? it.ingrediente)}
      <img src={it.url} alt="" style:width={`${novas.includes(it.ingrediente) ? tamanho : tamanho * 0.72}px`} class:nova={novas.includes(it.ingrediente)} />
    {/each}
  </div>
{/if}

<style>
  .prateleira { display: flex; align-items: flex-end; gap: 2px; flex-wrap: wrap; }
  img { height: auto; aspect-ratio: 1; object-fit: contain; filter: drop-shadow(0 1px 0 rgba(60,40,20,.08)); }
  .nova { animation: entra .5s var(--mola-padrao) both; }
  @keyframes entra { from { transform: translateY(8px) scale(.8); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .nova { animation: none; } }
</style>
