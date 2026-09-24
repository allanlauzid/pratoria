<script>
  // Folha inferior (bottom sheet) no celular; diálogo centralizado no desktop.
  // Usa <dialog> nativo: foco preso, Esc fecha, fundo inerte.
  let { aberta = $bindable(false), titulo, children } = $props();
  let el;
  $effect(() => {
    if (!el) return;
    if (aberta && !el.open) el.showModal();
    if (!aberta && el.open) el.close();
  });
</script>

<dialog bind:this={el} onclose={() => (aberta = false)} onclick={(e) => { if (e.target === el) aberta = false; }} aria-labelledby="folha-titulo">
  <div class="conteudo">
    <div class="alca" aria-hidden="true"></div>
    <header>
      <h2 id="folha-titulo">{titulo}</h2>
      <button class="botao-icone" onclick={() => (aberta = false)} aria-label="Fechar">✕</button>
    </header>
    {@render children?.()}
  </div>
</dialog>

<style>
  dialog {
    border: 0; padding: 0; margin: auto 0 0; width: 100%; max-width: 100%; max-height: 92dvh;
    background: var(--papel-folha); color: var(--tinta); border-radius: 18px 18px 0 0;
    box-shadow: 0 -10px 40px -10px rgba(40,25,10,.4);
  }
  dialog[open] { animation: entra .26s var(--mola-padrao); }
  dialog::backdrop { background: rgba(35,25,15,.42); }
  .conteudo { padding: .5rem 1rem calc(1rem + env(safe-area-inset-bottom)); }
  .alca { width: 40px; height: 4px; border-radius: 4px; background: var(--linha); margin: 0 auto .5rem; }
  header { display: flex; align-items: center; justify-content: space-between; margin-bottom: .5rem; }
  h2 { font-size: 1.35rem; }
  @keyframes entra { from { transform: translateY(40px); opacity: .4; } }
  @media (min-width: 48rem) {
    dialog { margin: auto; width: min(100% - 2rem, 34rem); border-radius: 18px; }
    .alca { display: none; }
    dialog[open] { animation: aparece .2s var(--mola-padrao); }
    @keyframes aparece { from { transform: scale(.97); opacity: 0; } }
  }
</style>
