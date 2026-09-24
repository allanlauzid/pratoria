<script>
  // Enviar uma imagem: escolher no aparelho (galeria/arquivos), arrastar e soltar (desktop) ou colar.
  // Converte para um WebP pequeno (JPEG no iPhone), guarda offline e permite baixar.
  import Icone from './Icone.svelte';
  import { prepararImagem, extensaoDe } from '../lib/imagem.js';
  import { baixarArquivo } from '../lib/baixar.js';
  import { tamanhoLegivel } from '../core/lembretes.js';
  import { avisar } from '../lib/avisos.svelte.js';

  let { aoUsar, nome = 'imagem', rotuloUsar = 'Usar esta imagem' } = $props();
  let original = null;
  let resultado = $state(null);
  let url = $state('');
  let processando = $state(false);
  let erro = $state('');
  let arrastando = $state(false);
  let input;

  async function tratar(forcarRemocao) {
    processando = true; erro = '';
    try {
      resultado = await prepararImagem(original, { removerFundo: forcarRemocao ?? 'auto' });
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(resultado.blob);
    } catch (e) { console.error(e); erro = 'Não consegui abrir essa imagem. Tente JPG, PNG ou WebP.'; resultado = null; }
    processando = false;
  }
  function receber(arquivo) {
    if (!arquivo) return;
    if (!/^image\//.test(arquivo.type)) { erro = 'Isso não é uma imagem.'; return; }
    original = arquivo; tratar();
  }
  function soltar(e) { e.preventDefault(); arrastando = false; receber(e.dataTransfer?.files?.[0]); }
  // colar imagem (Ctrl+V / tocar e segurar → colar) enquanto este bloco está na tela
  $effect(() => {
    const colar = (e) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
      if (item) { e.preventDefault(); receber(item.getAsFile()); }
    };
    addEventListener('paste', colar);
    return () => removeEventListener('paste', colar);
  });
  function baixar() {
    baixarArquivo(new File([resultado.blob], `${nome}.${extensaoDe(resultado.blob)}`, { type: resultado.blob.type }));
    avisar('Imagem baixada');
  }
  const formato = (b) => ({ 'image/webp': 'WebP', 'image/jpeg': 'JPEG', 'image/png': 'PNG' })[b?.type] ?? '';
</script>

<div class="zona" class:arrastando class:tem={!!resultado} role="button" tabindex="0" aria-label="Escolher imagem no aparelho ou arrastar aqui"
  onclick={() => input.click()} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.click())}
  ondragover={(e) => { e.preventDefault(); arrastando = true; }} ondragleave={() => (arrastando = false)} ondrop={soltar}>
  {#if resultado && url}
    <img src={url} alt="Prévia da imagem" />
  {:else}
    <span class="ic"><Icone nome="imagem" tamanho={32} /></span>
    <strong>{processando ? 'Preparando a imagem…' : 'Escolher imagem'}</strong>
    <small class="so-toque">Da galeria, da câmera ou dos arquivos do celular</small>
    <small class="so-mouse">Clique para procurar no computador, ou arraste a imagem para cá</small>
  {/if}
  <input bind:this={input} type="file" accept="image/*" class="visualmente-oculto" tabindex="-1"
    onchange={(e) => { receber(e.currentTarget.files?.[0]); e.currentTarget.value = ''; }} />
</div>

{#if erro}<p class="erro" role="alert">{erro}</p>{/if}

{#if resultado}
  <p class="meta info" aria-live="polite">
    {formato(resultado.blob)} · {resultado.info.largura}×{resultado.info.altura} · {tamanhoLegivel(resultado.info.bytes)}
    {#if resultado.info.bytesOriginal > resultado.info.bytes}<span class="ganho">(era {tamanhoLegivel(resultado.info.bytesOriginal)})</span>{/if}
    <br />
    {#if resultado.info.temTransparencia}Fundo transparente ✓
    {:else if resultado.info.fundoRemovido}Fundo liso removido automaticamente.
    {:else}Imagem com fundo (foto normal).{/if}
  </p>
  <div class="linha">
    {#if resultado.info.fundoRemovido}
      <button class="botao leve" onclick={() => tratar(false)}>Manter o fundo</button>
    {:else if !resultado.info.temTransparencia}
      <button class="botao leve" onclick={() => tratar(true)}>Tentar remover o fundo</button>
    {/if}
    <button class="botao leve" onclick={() => input.click()}>Trocar</button>
    <button class="botao leve" onclick={baixar}><Icone nome="download" /> Baixar</button>
  </div>
  <button class="botao primario bloco" onclick={() => aoUsar(resultado.blob)}><Icone nome="check" /> {rotuloUsar}</button>
{/if}

<style>
  .zona { display: grid; justify-items: center; gap: .3rem; padding: 1.4rem 1rem; border-radius: var(--raio-m); cursor: pointer; text-align: center;
    border: 2px dashed color-mix(in srgb, var(--terracota) 40%, var(--linha)); background: color-mix(in srgb, var(--papel) 60%, var(--papel-folha));
    transition: background var(--dur-curta), border-color var(--dur-curta); }
  .zona:hover, .zona:focus-visible, .zona.arrastando { border-color: var(--terracota); background: color-mix(in srgb, var(--mostarda) 12%, var(--papel-folha)); }
  .zona.tem { padding: .5rem; border-style: solid; background: repeating-conic-gradient(#efe6d6 0 25%, #f8f3ea 0 50%) 0 0 / 20px 20px; }
  .zona img { width: 100%; max-height: 18rem; object-fit: contain; }
  .ic { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 16px; background: var(--papel-folha); color: var(--terracota-forte); box-shadow: var(--sombra-baixa); }
  small { color: var(--tinta-suave); }
  .so-mouse { display: none; }
  @media (hover: hover) and (pointer: fine) { .so-mouse { display: block; } .so-toque { display: none; } }
  .info { margin: .5rem 0 0; }
  .ganho { color: var(--oliva); font-weight: 700; }
  .linha { display: flex; flex-wrap: wrap; gap: .5rem; margin: .5rem 0; }
  .erro { color: var(--erro); }
</style>
