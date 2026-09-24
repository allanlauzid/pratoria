<script>
  import { app, urlDaImagem } from '../lib/caderno.svelte.js';
  let { id, alt = '', classe = '', carregar = 'lazy' } = $props();
  $effect(() => { urlDaImagem(id); });
  const url = $derived(app.imagens[id]);
</script>

{#if url}
  <img class={classe} src={url} {alt} loading={carregar} decoding="async" />
{:else}
  <div class={'vazia ' + classe} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
    <svg viewBox="0 0 64 40" aria-hidden="true"><path d="M6 20h52M10 20a22 16 0 0 0 44 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
  </div>
{/if}

<style>
  img { width: 100%; height: 100%; object-fit: contain; }
  .vazia { display: grid; place-items: center; width: 100%; height: 100%; color: var(--linha); }
  .vazia svg { width: 38%; }
</style>
