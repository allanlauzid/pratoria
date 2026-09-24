<script>
  // Opção 4 — mostra o(s) QR(s) em tela cheia, alternando as partes em loop.
  import { qrsDaReceita, svgDoQR, INTERVALO_MS } from '../core/compartilhar/qr.js';
  import { urlDoSite } from '../lib/urlSite.js';
  let { receita, texto = null, aberto = $bindable(false) } = $props();
  let el, conteudos = $state([]), i = $state(0), pausado = $state(false), tipo = $state('');

  $effect(() => {
    if (!aberto) return;
    el.showModal();
    qrsDaReceita(receita, { siteUrl: urlDoSite(), texto }).then((r) => { conteudos = r.conteudos; tipo = r.tipo; i = 0; });
    return () => el?.open && el.close();
  });
  $effect(() => {
    if (!aberto || pausado || conteudos.length < 2) return;
    const t = setInterval(() => { i = (i + 1) % conteudos.length; }, INTERVALO_MS);
    return () => clearInterval(t);
  });
  const svg = $derived(conteudos[i] ? svgDoQR(conteudos[i]) : '');
</script>

<dialog bind:this={el} onclose={() => (aberto = false)} aria-label="QR code da receita">
  <div class="caixa">
    <button class="botao-icone fechar" onclick={() => (aberto = false)} aria-label="Fechar">✕</button>
    <h2>Aponte a câmera do outro celular</h2>
    <p class="meta">
      {#if tipo === 'link'}Funciona até com a câmera comum do celular.{:else}No outro celular, abra o Pratoria → Receber → Ler QR. Os códigos se alternam sozinhos; pode ler em qualquer ordem.{/if}
    </p>
    <div class="qr" aria-hidden="true">{@html svg}</div>
    {#if conteudos.length > 1}
      <p class="parte">Código {i + 1} de {conteudos.length}</p>
      <button class="botao leve" onclick={() => (pausado = !pausado)}>{pausado ? 'Continuar' : 'Pausar'}</button>
    {/if}
    <p class="dica">Aumente o brilho da tela se a leitura demorar.</p>
  </div>
</dialog>

<style>
  dialog { border: 0; padding: 0; width: 100%; height: 100%; max-width: 100%; max-height: 100%; background: #fff; color: var(--tinta); }
  .caixa { min-height: 100%; display: grid; justify-items: center; align-content: center; gap: .75rem; padding: 1.5rem; text-align: center; }
  .fechar { position: absolute; top: calc(.5rem + env(safe-area-inset-top)); right: .5rem; font-size: 1.3rem; }
  h2 { font-size: 1.4rem; }
  .qr { width: min(88vw, 70dvh, 32rem); }
  .qr :global(svg) { width: 100%; height: auto; }
  .parte { font-weight: 800; margin: 0; }
  .dica { font-size: var(--t-meta); color: var(--tinta-fraca); }
</style>
