<script>
  // Receber: arquivo .pratoria (ou .zip/.md/.txt), link, QR, menu Compartilhar do Android.
  // Imagens que chegam SEMPRE passam por revisão (Usar / Gerar de novo / Sem imagem).
  import Topo from '../componentes/Topo.svelte';
  import Icone from '../componentes/Icone.svelte';
  import PreviaReceita from '../componentes/PreviaReceita.svelte';
  import QrLer from '../componentes/QrLer.svelte';
  import AcoesPrompt from '../componentes/AcoesPrompt.svelte';
  import { abrirEntrada } from '../core/pacote/pratoria.js';
  import { interpretarReceita } from '../core/formato/parser.js';
  import { montarPromptImagem, montarPromptIlustracoes, gradeDaCartela } from '../core/import/prompts.js';
  import { recortarCartela } from '../lib/cartela.js';
  import { rota, ir } from '../lib/rota.svelte.js';
  import { salvarNoCaderno, app, salvarNome, salvarIlustracoesDaReceita, substituirReceita, ehBackupCaderno, restaurarCaderno } from '../lib/caderno.svelte.js';
  import PerguntaDuplicada from '../componentes/PerguntaDuplicada.svelte';
  import { encontrarDuplicada } from '../core/duplicadas.js';
  import { ehLinkDeReceita } from '../core/compartilhar/link.js';
  import { avisar } from '../lib/avisos.svelte.js';

  let recebido = $state(null);     // resultado de abrirEntrada
  let decisao = $state({});        // nome da imagem → 'usar' | 'sem'
  let lendoQR = $state(rota.query.qr === '1');
  let erro = $state('');
  let nome = $state(app.perfil.nome);
  let urls = $state({});
  let salvando = $state(false);

  const resultado = $derived(recebido?.textoReceita ? interpretarReceita(recebido.textoReceita, { origem: 'manual' }) : null);
  const env = $derived(recebido?.envelope ?? {});
  const quando = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); };

  let backup = $state(null);        // arquivo de backup do caderno inteiro
  async function processar(fonte) {
    erro = ''; backup = null;
    try {
      // link de um site (não do Pratoria) → importar com IA
      if (typeof fonte === 'string') {
        const url = fonte.trim().match(/https?:\/\/\S+/)?.[0];
        if (url && !ehLinkDeReceita(fonte) && !/PRATORIA\s*v\d/i.test(fonte)) { ir(`/importar?url=${encodeURIComponent(url)}`, { substituir: true }); return; }
      }
      // backup do caderno inteiro
      if (typeof fonte !== 'string' && ehBackupCaderno(new Uint8Array(await fonte.arrayBuffer()))) { backup = fonte; return; }
      const r = await abrirEntrada(fonte);
      if (!r.textoReceita.trim()) { erro = 'Não encontrei uma receita aqui.'; return; }
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
      urls = Object.fromEntries(r.imagens.filter((i) => i.blob).map((i) => [i.nome, URL.createObjectURL(i.blob)]));
      decisao = Object.fromEntries(r.imagens.map((i) => [i.nome, i.blob && i.integra !== false ? 'usar' : 'sem']));
      recebido = r;
    } catch (e) { erro = e.message || 'Não consegui ler isso.'; }
  }

  $effect(() => { if (rota.cargaRecebida) { const c = rota.cargaRecebida; rota.cargaRecebida = ''; processar(c); } });
  $effect(() => {
    if (rota.query.origem !== 'compartilhado') return;
    (async () => {
      const cache = await caches.open('pratoria-recebido');
      const arq = await cache.match('arquivo'), txt = await cache.match('texto');
      if (arq) await processar(await arq.blob()); else if (txt) await processar(await txt.text());
      await caches.delete('pratoria-recebido');
      ir('/receber', { substituir: true });
    })();
  });
  $effect(() => {
    if (!('launchQueue' in window)) return;
    window.launchQueue.setConsumer(async (p) => { if (p.files?.length) processar(await p.files[0].getFile()); });
  });

  let dup = $state(null);
  let perguntandoDup = $state(false);
  async function restaurar() {
    salvando = true;
    try { const { novas, atualizadas } = await restaurarCaderno(backup); avisar(`${novas} nova(s), ${atualizadas} atualizada(s)`); backup = null; ir('/'); }
    catch (e) { erro = e.message || 'Não consegui restaurar.'; }
    salvando = false;
  }
  async function salvar(op = null) {
    if (op === 'cancelar') return;
    if (!op) {
      dup = encontrarDuplicada(app.receitas, resultado.receita);
      if (dup) { perguntandoDup = true; return; }
    }
    salvando = true;
    try {
      if (!app.perfil.nome && nome.trim()) await salvarNome(nome);
      const img = (n) => recebido.imagens.find((i) => i.nome === n && decisao[n] === 'usar')?.blob ?? null;
      const historico = env.historico ? env.historico.split(' > ') : null;
      const dados = { texto: recebido.textoReceita, imagem: img('prato'), historico };
      const pronta = op === 'atualizar' ? await substituirReceita(dup.registro.id, resultado.receita, dados) : await salvarNoCaderno(resultado.receita, { ...dados, novaCopia: op === 'duas' });
      const cartela = img('ilustracoes');
      if (cartela && resultado.receita.ilustracoes?.length) {
        const itens = resultado.receita.ilustracoes.slice().sort((a, b) => a.ordem - b.ordem).slice(0, 12);
        const grade = gradeDaCartela(itens.length);
        const rc = await recortarCartela(cartela, grade);
        await salvarIlustracoesDaReceita(pronta.id, { cartela, grade, recortes: rc.recortes.slice(0, itens.length).map((blob, i) => ({ ingrediente: itens[i].ingrediente, blob })) });
      }
      avisar('Receita salva no caderno');
      recebido = null;
      ir(`/receita/${pronta.id}`);
    } catch (e) { console.error(e); erro = 'Não consegui salvar. Tente de novo.'; }
    salvando = false;
  }
  const rotuloImagem = { prato: 'Foto do prato', ilustracoes: 'Ilustrações a giz' };
  const promptPara = (n) => (n === 'prato' ? montarPromptImagem(resultado.receita) : resultado.receita.ilustracoes?.length ? montarPromptIlustracoes(resultado.receita) : '');
</script>

<Topo titulo="Receber receita" />

<div class="tela">
  <header><p class="rotulo">Receber</p><h1>Recebeu uma receita?</h1></header>

  {#if backup}
    <section class="folha-papel bloco">
      <h2><Icone nome="caderno" /> Backup de um caderno</h2>
      <p class="meta">Este arquivo é um caderno inteiro (<strong>{backup.name || 'backup'}</strong>). Restaurar junta as receitas dele com as suas: nada que está aqui é apagado, e fica sempre a versão mais nova de cada receita.</p>
      <button class="botao primario bloco" onclick={restaurar} disabled={salvando}>{salvando ? 'Restaurando…' : 'Restaurar no meu caderno'}</button>
      <button class="botao bloco sutil" onclick={() => (backup = null)}>Cancelar</button>
    </section>
  {:else if recebido && resultado}
    <section class="folha-papel bloco">
      <h2>Receita recebida</h2>
      {#if env.compartilhado_por}<p class="meta">Enviada por <strong>{env.compartilhado_por}</strong>{env.exportado_em ? ` em ${quando(env.exportado_em)}` : ''}.</p>{/if}
      {#if recebido.avisos.length}<ul class="avisos" role="status">{#each recebido.avisos as a}<li>{a}</li>{/each}</ul>{/if}
      <PreviaReceita {resultado} />
    </section>

    {#if recebido.imagens.length}
      <section class="folha-papel bloco">
        <h2>Revise as imagens</h2>
        {#each recebido.imagens as im (im.nome)}
          <div class="imagem">
            <strong>{rotuloImagem[im.nome] ?? im.nome}</strong>
            {#if urls[im.nome]}
              <div class="previa"><img src={urls[im.nome]} alt={rotuloImagem[im.nome] ?? im.nome} /></div>
              {#if im.integra === false}<p class="erro">Esta imagem chegou danificada.</p>{/if}
            {:else}
              <p class="meta">{im.estado === 'link' ? 'Está no link do pacote completo.' : 'Não veio neste arquivo.'}</p>
            {/if}
            <div class="seg" role="radiogroup" aria-label={`O que fazer com ${rotuloImagem[im.nome] ?? im.nome}`}>
              {#if urls[im.nome]}<button role="radio" aria-checked={decisao[im.nome] === 'usar'} onclick={() => (decisao[im.nome] = 'usar')}>Usar</button>{/if}
              <button role="radio" aria-checked={decisao[im.nome] === 'gerar'} onclick={() => (decisao[im.nome] = 'gerar')}>Gerar de novo</button>
              <button role="radio" aria-checked={decisao[im.nome] === 'sem'} onclick={() => (decisao[im.nome] = 'sem')}>Sem imagem</button>
            </div>
            {#if decisao[im.nome] === 'gerar' && promptPara(im.nome)}
              <p class="meta">Gere na IA e depois envie a imagem pela página da receita (Trocar foto / Ilustrações a giz).</p>
              <AcoesPrompt prompt={promptPara(im.nome)} />
            {/if}
          </div>
        {/each}
      </section>
    {/if}

    <section class="folha-papel bloco">
      {#if !app.perfil.nome}<label class="campo"><span>Seu nome (fica no registro da sua cópia)</span><input class="entrada" bind:value={nome} /></label>{/if}
      <button class="botao primario bloco" disabled={!resultado.valido || salvando} onclick={() => salvar()}>{salvando ? 'Salvando…' : 'Salvar no meu caderno'}</button>
      <button class="botao bloco sutil" onclick={() => (recebido = null)}>Descartar</button>
    </section>
  {:else if lendoQR}
    <section class="folha-papel bloco">
      <h2>Ler QR code</h2>
      <QrLer aoCompletar={(t) => { lendoQR = false; processar(t); }} aoFechar={() => (lendoQR = false)} />
    </section>
  {:else}
    <section class="folha-papel bloco">
      <h2><Icone nome="arquivo" /> Abrir arquivo</h2>
      <p class="meta">O arquivo <code>.pratoria</code> recebido por WhatsApp, e-mail, AirDrop, Quick Share, Bluetooth ou Drive.</p>
      <label class="botao primario bloco">Escolher arquivo
        <input class="visualmente-oculto" type="file" accept=".pratoria,.zip,.md,.txt,application/zip,text/markdown,text/plain"
          onchange={(e) => e.currentTarget.files?.[0] && processar(e.currentTarget.files[0])} />
      </label>
    </section>
    <div class="duas">
      <section class="folha-papel bloco">
        <h2><Icone nome="qr" /> Ler QR code</h2>
        <p class="meta">Cara a cara, sem internet.</p>
        <button class="botao leve bloco" onclick={() => (lendoQR = true)}><Icone nome="camera" /> Abrir câmera</button>
      </section>
      <section class="folha-papel bloco">
        <h2><Icone nome="link" /> Recebeu um link?</h2>
        <p class="meta">Basta tocar nele: a receita abre direto aqui.</p>
      </section>
    </div>
  {/if}
  {#if erro}<p class="erro" role="alert">{erro}</p>{/if}
</div>

<PerguntaDuplicada bind:aberta={perguntandoDup} {dup} aoEscolher={(op) => salvar(op)} />

<style>
  .tela { width: min(100% - 2rem, 44rem); margin-inline: auto; padding-top: 1rem; display: grid; gap: 1rem; }
  h1 { font-size: var(--t-h2); }
  h2 { font-size: 1.2rem; display: flex; align-items: center; gap: .5rem; }
  .bloco { padding: 1.1rem; display: grid; gap: .75rem; }
  .bloco p { margin: 0; }
  .duas { display: grid; gap: 1rem; }
  @media (min-width: 40rem) { .duas { grid-template-columns: 1fr 1fr; } }
  .avisos { margin: 0; padding: .6rem .6rem .6rem 1.6rem; border-radius: var(--raio-m); background: color-mix(in srgb, var(--mostarda) 12%, var(--papel-folha)); font-size: .92rem; }
  .imagem { display: grid; gap: .5rem; padding: .75rem 0; border-top: 1px dashed var(--linha); }
  .imagem:first-of-type { border-top: 0; padding-top: 0; }
  .previa { border-radius: var(--raio-m); border: 1px solid var(--linha); background: repeating-conic-gradient(#efe6d6 0 25%, #f8f3ea 0 50%) 0 0 / 20px 20px; padding: .5rem; }
  .previa img { width: 100%; max-height: 14rem; object-fit: contain; }
  .seg { display: grid; grid-auto-flow: column; gap: 4px; padding: 4px; border-radius: var(--raio-m); background: var(--papel-kraft); }
  .seg button { min-height: 44px; border: 0; border-radius: 10px; background: transparent; font-weight: 700; color: var(--tinta-suave); cursor: pointer; }
  .seg button[aria-checked='true'] { background: var(--papel-folha); color: var(--tinta); box-shadow: var(--sombra-baixa); }
  .sutil { border-color: transparent; color: var(--tinta-suave); }
  .erro { color: var(--erro); }
  label.botao { cursor: pointer; }
  @media (min-width: 64rem) { .tela { padding-top: 2.5rem; } }
</style>
