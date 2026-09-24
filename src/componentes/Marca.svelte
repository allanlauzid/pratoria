<script>
  import marca from '../assets/marca.svg';
  let { compacta = false } = $props();
</script>

<a class="marca" href="#/" aria-label="Pratoria — ir para o caderno">
  <img src={marca} alt="" width="44" height="33" />
  {#if !compacta}<span>Pratoria</span>{/if}
</a>

<style>
  .marca { display: inline-flex; align-items: center; gap: .5rem; text-decoration: none; color: var(--tinta); min-height: var(--toque); }
  img { width: 44px; height: auto; }
  span { font-family: var(--fonte-titulo); font-variation-settings: var(--titulo-variacao); font-weight: 700; font-size: 1.45rem; letter-spacing: -.01em; }
</style>
