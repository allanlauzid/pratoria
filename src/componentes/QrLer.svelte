<script>
  // Opção 4 (lado de quem recebe): câmera + junção das partes.
  import { lerQRsDaCamera, ColetorQR } from '../core/compartilhar/qr.js';
  let { aoCompletar, aoFechar } = $props();
  let video, parar = null;
  let estado = $state({ recebidos: 0, total: 0, erro: '' });
  const coletor = new ColetorQR();

  $effect(() => {
    let cancelado = false;
    lerQRsDaCamera(video, async (texto) => {
      try {
        const r = await coletor.adicionar(texto);
        if (r.estado === 'parcial') estado = { ...estado, recebidos: r.recebidos, total: r.total };
        if (r.estado === 'completo') { navigator.vibrate?.(40); parar?.(); aoCompletar(r.texto); }
      } catch (e) { estado = { ...estado, erro: e.message }; }
    }).then((p) => { if (cancelado) p(); else parar = p; })
      .catch(() => { estado = { ...estado, erro: 'Não consegui abrir a câmera. Verifique a permissão do navegador.' }; });
    return () => { cancelado = true; parar?.(); };
  });
</script>

<div class="leitor">
  <!-- svelte-ignore a11y_media_has_caption -->
  <video bind:this={video} muted playsinline></video>
  <div class="mira" aria-hidden="true"></div>
</div>
<p class="estado" aria-live="polite">
  {#if estado.erro}<span class="erro">{estado.erro}</span>
  {:else if estado.total}Lidos {estado.recebidos} de {estado.total} códigos. Continue apontando.
  {:else}Aponte para o QR code mostrado no outro celular.{/if}
</p>
{#if estado.total}
  <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax={estado.total} aria-valuenow={estado.recebidos}>
    <span style={`width:${(estado.recebidos / estado.total) * 100}%`}></span>
  </div>
{/if}
<button class="botao bloco leve" onclick={aoFechar}>Cancelar</button>

<style>
  .leitor { position: relative; border-radius: var(--raio-m); overflow: hidden; background: #111; aspect-ratio: 1; max-height: 60dvh; margin-inline: auto; }
  video { width: 100%; height: 100%; object-fit: cover; }
  .mira { position: absolute; inset: 14%; border: 3px solid rgba(255,255,255,.85); border-radius: 18px; box-shadow: 0 0 0 999px rgba(0,0,0,.25); }
  .estado { text-align: center; margin: .75rem 0; }
  .erro { color: var(--erro); }
  .barra { height: 8px; border-radius: 8px; background: var(--linha); overflow: hidden; margin-bottom: .75rem; }
  .barra span { display: block; height: 100%; background: var(--oliva); transition: width .2s; }
</style>
