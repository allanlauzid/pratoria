<script>
  // Compartilhar = sempre UM arquivo .pratoria (ou link/QR com o .md, só texto sem conta).
  import Folha from './Folha.svelte';
  import Icone from './Icone.svelte';
  import QrExibir from './QrExibir.svelte';
  import { pacoteDaReceita } from '../lib/pacote.js';
  import { linkDoTexto } from '../core/compartilhar/link.js';
  import { copiarTexto } from '../core/compartilhar/compartilhar.js';
  import { app } from '../lib/caderno.svelte.js';
  import { avisar } from '../lib/avisos.svelte.js';
  import { urlDoSite } from '../lib/urlSite.js';

  let { aberta = $bindable(false), registro } = $props();
  let pacote = $state('imagens');       // 'texto' | 'imagens'
  let base64 = $state(false);
  let ocupado = $state('');
  let qrAberto = $state(false);
  let textoQR = $state('');

  const r = $derived(registro.dados);
  const temImagem = $derived(!!app.imagens[registro.id]);
  const conteudo = $derived([
    r.fonte?.url ? 'link original' : '[sem link original]', 'prompts', 'receita',
    ...(pacote === 'imagens' ? [temImagem ? 'foto' : null, app.ilustracoes[registro.id] ? 'ilustrações' : null] : []),
  ].filter(Boolean).join(' · '));
  const nomeArquivo = $derived(`${r.slug || 'receita'}.pratoria`);

  async function oArquivo() { return (await pacoteDaReceita(registro, { pacote, base64 })).arquivo; }
  function baixar(arquivo) {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(arquivo), download: arquivo.name });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }
  async function enviar(arquivo, dica) {
    if (navigator.canShare?.({ files: [arquivo] })) { await navigator.share({ files: [arquivo], title: r.titulo }); return; }
    baixar(arquivo); avisar(dica);
  }
  async function mdSemAnexos() {
    const { md } = await pacoteDaReceita(registro, { pacote: 'texto', prompts: false });
    return md;
  }
  async function executar(o) {
    if (o.bloqueio) { avisar(o.bloqueio); return; }
    ocupado = o.id;
    try { await o.fazer(); } catch (e) { if (e?.name !== 'AbortError') { console.error(e); avisar('Não deu certo. Tente outra opção.'); } }
    finally { ocupado = ''; }
  }

  const soTextoSemConta = $derived(pacote === 'imagens' ? 'Sem conta, link e QR levam só texto. Escolha "Só texto".' : '');
  const opcoes = $derived([
    { id: 'celular', icone: 'compartilhar', titulo: 'Enviar pelo celular', desc: 'AirDrop, Quick Share, Bluetooth, Drive', fazer: async () => enviar(await oArquivo(), 'Arquivo baixado. Envie pelo gerenciador de arquivos.') },
    { id: 'mensagem', icone: 'mensagem', titulo: 'WhatsApp, Telegram, Signal', desc: 'Como documento', fazer: async () => enviar(await oArquivo(), 'Arquivo baixado. No app de mensagens, anexe como documento.') },
    { id: 'email', icone: 'email', titulo: 'E-mail com anexo', desc: 'Escolha o app de e-mail', fazer: async () => enviar(await oArquivo(), 'Arquivo baixado. Anexe no seu e-mail.') },
    { id: 'baixar', icone: 'download', titulo: 'Baixar arquivo', desc: 'Para guardar ou enviar depois', fazer: async () => { baixar(await oArquivo()); avisar('Arquivo baixado'); } },
    { id: 'pdf', icone: 'impressora', titulo: 'Imprimir ou salvar PDF', desc: 'Versão para ler (o arquivo embutido no PDF vem depois)', fazer: async () => { aberta = false; setTimeout(() => print(), 350); } },
    { id: 'link', icone: 'link', titulo: 'Link com a receita', desc: 'Abre direto no Pratoria', bloqueio: soTextoSemConta, fazer: async () => {
      const { url } = await linkDoTexto(await mdSemAnexos(), { siteUrl: urlDoSite() });
      if (navigator.share) await navigator.share({ title: r.titulo, url });
      else if (await copiarTexto(url)) avisar('Link copiado');
    } },
    { id: 'qr', icone: 'qr', titulo: 'QR code na tela', desc: 'Cara a cara, sem internet', bloqueio: soTextoSemConta, fazer: async () => { textoQR = await mdSemAnexos(); qrAberto = true; } },
    { id: 'contatos', icone: 'caderno', titulo: 'Contatos do Pratoria', desc: 'Precisa de conta', bloqueio: 'Disponível quando você criar uma conta.', fazer: async () => {} },
  ]);
</script>

<Folha bind:aberta titulo="Compartilhar receita">
  <div class="escolha" role="radiogroup" aria-label="O que enviar">
    <button role="radio" aria-checked={pacote === 'texto'} onclick={() => (pacote = 'texto')}>Só texto</button>
    <button role="radio" aria-checked={pacote === 'imagens'} onclick={() => (pacote = 'imagens')}>Texto + imagens</button>
  </div>
  {#if pacote === 'imagens'}
    <label class="interruptor">
      <span>Imagens dentro do texto<small>O .md funciona sozinho em qualquer lugar</small></span>
      <input type="checkbox" bind:checked={base64} />
    </label>
  {/if}
  <p class="resumo">Vai: {conteudo}<br /><strong>{nomeArquivo}</strong> · por {app.perfil.nome || 'sem nome'}</p>
  <ul class="opcoes">
    {#each opcoes as o (o.id)}
      <li>
        <button onclick={() => executar(o)} disabled={!!ocupado} aria-busy={ocupado === o.id} class:bloqueada={!!o.bloqueio} aria-disabled={o.bloqueio ? 'true' : undefined}>
          <span class="ic"><Icone nome={o.icone} /></span>
          <span class="txt"><strong>{o.titulo}</strong><small>{o.bloqueio || o.desc}</small></span>
        </button>
      </li>
    {/each}
  </ul>
</Folha>

<QrExibir receita={r} texto={textoQR} bind:aberto={qrAberto} />

<style>
  .escolha { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: var(--raio-m); background: var(--papel-kraft); }
  .escolha button { min-height: 44px; border: 0; border-radius: 10px; background: transparent; font-weight: 700; color: var(--tinta-suave); cursor: pointer; }
  .escolha button[aria-checked='true'] { background: var(--papel-folha); color: var(--tinta); box-shadow: var(--sombra-baixa); }
  .interruptor { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin: .75rem 0 0; }
  .interruptor span { display: grid; }
  .interruptor small { color: var(--tinta-suave); font-size: .82rem; }
  .interruptor input { width: 26px; height: 26px; accent-color: var(--oliva); }
  .resumo { margin: .75rem 0; padding: .55rem .75rem; border: 1px dashed var(--linha); border-radius: var(--raio-m); font-size: .85rem; color: var(--tinta-suave); }
  .resumo strong { color: var(--tinta); }
  .opcoes { list-style: none; margin: 0; padding: 0; display: grid; gap: .15rem; max-height: 52dvh; overflow-y: auto; }
  .opcoes button { width: 100%; display: grid; grid-template-columns: 44px 1fr; gap: .75rem; align-items: center; text-align: left; min-height: 56px; padding: .4rem; border: 0; border-radius: var(--raio-m); background: transparent; cursor: pointer; }
  .opcoes button:hover:not(:disabled), .opcoes button:active:not(:disabled) { background: color-mix(in srgb, var(--linha) 40%, transparent); }
  .opcoes button[aria-busy='true'] { background: color-mix(in srgb, var(--mostarda) 18%, transparent); }
  .bloqueada { opacity: .5; }
  .ic { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: var(--papel); color: var(--terracota-forte); }
  .txt { display: grid; }
  small { color: var(--tinta-suave); font-size: .85rem; line-height: 1.35; }
</style>
