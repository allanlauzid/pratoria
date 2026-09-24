<script>
  // Nova receita com a ajuda do ChatGPT (sem IA no Pratoria):
  //   1) "Tenho o link": colou → escolhe na hora o que gerar (texto, foto, giz)
  //   2) "Vou escrever": texto livre → prompt que revisa e pergunta
  // Os dois terminam em "Colar a resposta" → prévia → salvar → foto → giz.
  // Rascunho SÓ no aparelho (sobrevive à ida e volta até o ChatGPT).
  import Topo from '../componentes/Topo.svelte';
  import Icone from '../componentes/Icone.svelte';
  import AcoesPrompt from '../componentes/AcoesPrompt.svelte';
  import PreviaReceita from '../componentes/PreviaReceita.svelte';
  import EtapaImagem from '../componentes/EtapaImagem.svelte';
  import EtapaIlustracoes from '../componentes/EtapaIlustracoes.svelte';
  import PerguntaDuplicada from '../componentes/PerguntaDuplicada.svelte';
  import { encontrarDuplicada } from '../core/duplicadas.js';
  import { montarPromptReceita, montarPromptTextoLivre, montarPromptImagemDoLink, validarUrlReceita, linkBingImagens } from '../core/import/prompts.js';
  import { interpretarReceita } from '../core/formato/parser.js';
  import { isoLocal } from '../core/id.js';
  import { aplicarAjustesPrompt } from '../core/import/ajustes.js';
  import { app, banco, salvarNoCaderno, salvarNome, trocarImagem, substituirReceita } from '../lib/caderno.svelte.js';
  import { ir, rota } from '../lib/rota.svelte.js';
  import { avisar } from '../lib/avisos.svelte.js';

  const CHAVE = 'importacao';
  const VAZIO = () => ({ modo: 'link', passo: 'inicio', url: '', escolhas: { texto: true, imagem: false, giz: false }, geradoEm: '',
    textoLivre: '', tituloLivre: '', livreGerado: false, texto: '', receitaId: '', semLink: false });
  let r = $state(VAZIO());
  let nome = $state(app.perfil.nome);
  let carregado = $state(false);

  $effect(() => {
    banco().obterRascunho(CHAVE).then((d) => {
      if (d) Object.assign(r, VAZIO(), d);
      carregado = true;
      const url = rota.query.url;   // link de site compartilhado para o Pratoria
      if (url) { Object.assign(r, VAZIO(), { modo: 'link', url }); ir('/importar', { substituir: true }); }
    });
  });
  $effect(() => { if (carregado && rota.query.modo === 'escrever') { r.modo = 'escrever'; r.passo = 'inicio'; ir('/importar', { substituir: true }); } });
  $effect(() => { const copia = $state.snapshot(r); if (carregado) banco().salvarRascunho(CHAVE, copia); });

  // ---- forma 1: link ----
  const urlValida = $derived.by(() => { try { return r.url.trim() ? validarUrlReceita(r.url) : ''; } catch { return ''; } });
  const urlParece = $derived(/^\s*(https?:\/\/|www\.)/i.test(r.url));
  $effect(() => { if (urlValida && !r.geradoEm) r.geradoEm = isoLocal(new Date()); });
  const ajustes = () => JSON.parse(JSON.stringify(app.prefs.ajustes));
  const promptTexto = $derived(urlValida && r.geradoEm ? montarPromptReceita(urlValida, { usuario: app.perfil.nome, agora: new Date(r.geradoEm), ajustes: ajustes() }) : '');
  const promptFoto = $derived(urlValida ? montarPromptImagemDoLink(urlValida) : '');
  const termoDoLink = $derived.by(() => {
    try { return decodeURIComponent(new URL(urlValida).pathname.split('/').filter(Boolean).pop() ?? '').replace(/\.\w+$/, '').replace(/[-_]+/g, ' ').replace(/\b\d+\b/g, '').trim(); } catch { return ''; }
  });
  function quandoMudarUrl() { r.geradoEm = ''; }
  async function colarLink() {
    try { const t = (await navigator.clipboard.readText())?.trim(); if (t) { r.url = t.match(/https?:\/\/\S+/)?.[0] ?? t; quandoMudarUrl(); } }
    catch { avisar('Toque e segure no campo para colar.'); }
  }

  // ---- forma 2: escrever ----
  let erroLivre = $state('');
  const promptLivre = $derived.by(() => {
    if (!r.livreGerado) return '';
    try { return montarPromptTextoLivre(r.textoLivre, { usuario: app.perfil.nome, agora: new Date(r.geradoEm || Date.now()), ajustes: ajustes(), titulo: r.tituloLivre }); } catch { return ''; }
  });
  function gerarLivre() {
    erroLivre = '';
    try { montarPromptTextoLivre(r.textoLivre); } catch (e) { erroLivre = e.message; return; }
    r.geradoEm = isoLocal(new Date()); r.livreGerado = true;
  }

  // ---- nome (vai no registro; não bloqueia) ----
  async function guardarNome() { if (nome.trim() && nome.trim() !== app.perfil.nome) await salvarNome(nome); }

  // ---- colar a resposta ----
  const resultado = $derived(r.texto.trim() ? interpretarReceita(r.texto, { origem: r.semLink || r.modo === 'escrever' ? 'manual' : 'importacao' }) : null);
  const salva = $derived(app.receitas.find((x) => x.id === r.receitaId)?.dados);
  async function irParaColar() {
    await guardarNome();
    try {
      const t = (await navigator.clipboard.readText())?.trim();
      if (t && /PRATORIA\s*v\d/i.test(t)) { r.texto = t; avisar('Resposta colada'); }
    } catch { /* sem permissão: cola no campo */ }
    r.passo = 'colar';
  }
  async function colarTexto() {
    try { const t = await navigator.clipboard.readText(); if (t) r.texto = t.trim(); }
    catch { avisar('Toque e segure no campo para colar.'); }
  }

  let dup = $state(null);
  let perguntandoDup = $state(false);
  async function salvar() {
    dup = encontrarDuplicada(app.receitas, resultado.receita);
    if (dup) { perguntandoDup = true; return; }
    await gravar('duas');
  }
  async function gravar(op) {
    if (op === 'cancelar') return;
    const pronta = op === 'atualizar' ? await substituirReceita(dup.registro.id, resultado.receita, { texto: r.texto })
      : await salvarNoCaderno(resultado.receita, { texto: r.texto, novaCopia: op === 'duas' });
    r.receitaId = pronta.id; r.passo = 'foto';
    avisar(op === 'atualizar' ? 'Receita atualizada no caderno' : 'Receita salva no caderno');
  }
  async function salvarImagem(blob) { await trocarImagem(r.receitaId, blob); avisar('Foto guardada'); depoisDaFoto(); }
  function depoisDaFoto() { if (salva?.ilustracoes?.length && (r.escolhas.giz || r.modo === 'escrever')) r.passo = 'giz'; else terminar(); }
  function terminar() {
    const id = r.receitaId;
    banco().apagarRascunho(CHAVE);
    Object.assign(r, VAZIO());
    ir(`/receita/${id}`);
  }
  function recomecar() { Object.assign(r, VAZIO()); }
  const trilha = [['inicio', 'Pedido'], ['colar', 'Resposta'], ['foto', 'Foto'], ['giz', 'Giz']];
  const idx = $derived(trilha.findIndex(([k]) => k === r.passo));
  const tagsAjustes = $derived(aplicarAjustesPrompt(app.prefs.ajustes).tags);
</script>

<Topo voltarPara="/" titulo="Nova receita" />

<div class="tela">
  <header>
    <p class="rotulo">Nova receita</p>
    <h1>Traga uma receita para o seu caderno</h1>
  </header>

  <ol class="trilha" aria-label="Etapas">
    {#each trilha as [k, rotulo], i}
      <li class:feito={idx > i} aria-current={idx === i ? 'step' : undefined}><span>{i + 1}</span>{rotulo}</li>
    {/each}
  </ol>

  {#if r.passo === 'inicio'}
    <div class="modos" role="tablist" aria-label="Como você quer trazer a receita">
      <button role="tab" aria-selected={r.modo === 'link'} onclick={() => (r.modo = 'link')}><Icone nome="link" /> <span>Tenho o link<small>de um site ou blog</small></span></button>
      <button role="tab" aria-selected={r.modo === 'escrever'} onclick={() => (r.modo = 'escrever')}><Icone nome="escrever" /> <span>Vou escrever<small>do meu jeito</small></span></button>
    </div>

    {#if !app.perfil.nome}
      <label class="campo nome"><span>Seu nome <small>(vai no registro das suas receitas)</small></span>
        <input class="entrada" bind:value={nome} onblur={guardarNome} autocomplete="given-name" placeholder="Como quer aparecer" /></label>
    {/if}

    {#if r.modo === 'link'}
      <section class="folha-papel bloco">
        <label class="campo"><span>Cole o link da receita</span>
          <div class="com-botao">
            <input class="entrada" type="url" inputmode="url" placeholder="https://…" bind:value={r.url} oninput={quandoMudarUrl}
              aria-invalid={urlParece && !urlValida} autocomplete="off" />
            <button class="botao leve" onclick={colarLink} aria-label="Colar link"><Icone nome="colar" /></button>
          </div>
        </label>
        {#if r.url.trim() && !urlValida}<p class="erro" role="alert">Isso não parece um link. Cole o endereço completo, começando com https://</p>{/if}

        {#if urlValida}
          <div class="escolhas" role="group" aria-label="O que você quer gerar">
            <p class="pergunta">O que você quer gerar?</p>
            {#each [['texto', 'Receita', 'Ingredientes, lista de compras e preparo', 'livro'], ['imagem', 'Foto do prato', 'Uma foto no estilo do Pratoria', 'imagem'], ['giz', 'Ilustrações a giz', 'Montadas depois que a receita for colada', 'etiqueta']] as [k, t, d, ic]}
              <label class="escolha" class:marcada={r.escolhas[k]}>
                <input type="checkbox" bind:checked={r.escolhas[k]} />
                <span class="ic"><Icone nome={ic} /></span>
                <span class="txt"><strong>{t}</strong><small>{d}</small></span>
                <span class="marca" aria-hidden="true"><Icone nome="check" tamanho={18} /></span>
              </label>
            {/each}
          </div>
        {/if}
      </section>

      {#if urlValida && r.escolhas.texto}
        <section class="folha-papel bloco">
          <h2><span class="num">1</span> Receita</h2>
          <p class="meta">Abra no ChatGPT. Quando a resposta aparecer, toque em <strong>copiar</strong> no bloco de código e volte aqui.</p>
          {#if tagsAjustes.length}<p class="meta">Com seus ajustes: {tagsAjustes.join(', ')}. <a href="#/ajustes">Mudar</a></p>{/if}
          <AcoesPrompt prompt={promptTexto} rotulo="Gerar a receita no ChatGPT" />
          <button class="botao primario bloco" onclick={irParaColar}><Icone nome="colar" /> Já copiei a resposta — colar</button>
        </section>
      {/if}
      {#if urlValida && r.escolhas.imagem}
        <section class="folha-papel bloco">
          <h2><span class="num">{r.escolhas.texto ? 2 : 1}</span> Foto do prato</h2>
          <p class="meta">Gere agora e salve a imagem no aparelho. Você envia a foto logo depois de colar a receita.</p>
          <AcoesPrompt prompt={promptFoto} rotulo="Gerar a foto no ChatGPT" />
          {#if termoDoLink}<a class="botao leve bloco" href={linkBingImagens(termoDoLink)} target="_blank" rel="noopener"><Icone nome="busca" /> Procurar fotos no Bing Imagens</a>{/if}
        </section>
      {/if}
      {#if urlValida && r.escolhas.giz}
        <section class="folha-papel bloco nota-giz">
          <h2><span class="num">{1 + (r.escolhas.texto ? 1 : 0) + (r.escolhas.imagem ? 1 : 0)}</span> Ilustrações a giz</h2>
          <p class="meta">O pedido da cartela usa a lista de ingredientes da receita. Ele aparece depois que você colar a resposta.</p>
        </section>
      {/if}
      {#if urlValida && !r.escolhas.texto}
        <p class="meta centro">Sem a receita, a foto e o giz ficam guardados só quando você colar uma receita. <button class="link" onclick={() => (r.escolhas.texto = true)}>Incluir a receita</button></p>
      {/if}

    {:else}
      <section class="folha-papel bloco">
        <label class="campo"><span>Nome da receita</span>
          <div class="com-botao">
            <input class="entrada" bind:value={r.tituloLivre} placeholder="Ex.: Bolo de fubá da vó" />
            <a class="botao leve" href={r.tituloLivre.trim() ? linkBingImagens(r.tituloLivre) : undefined} target="_blank" rel="noopener" aria-disabled={!r.tituloLivre.trim()}
              title="Procurar foto de referência no Bing Imagens" aria-label="Procurar foto de referência no Bing Imagens"><Icone nome="busca" /></a>
          </div>
        </label>
        <label class="campo"><span>Escreva a receita completa, do seu jeito</span>
          <textarea class="entrada livre" bind:value={r.textoLivre} rows="10" oninput={() => (r.livreGerado = false)}
            placeholder={'Ex.: Pra massa: 3 ovos, 2 xícaras de farinha, 1 de leite…\nBata tudo no liquidificador, coloque na forma untada e asse uns 40 minutos.\nCobertura: …'}></textarea>
        </label>
        <p class="credito">Pode escrever como fala: o ChatGPT organiza, confere o que falta e, se precisar, pergunta antes.</p>
        {#if erroLivre}<p class="erro" role="alert">{erroLivre}</p>{/if}
        {#if !r.livreGerado}<button class="botao escuro bloco" onclick={gerarLivre}><Icone nome="check" /> Gerar o pedido para o ChatGPT</button>{/if}
      </section>
      {#if r.livreGerado && promptLivre}
        <section class="folha-papel bloco">
          <h2><span class="num">1</span> Organizar no ChatGPT</h2>
          <p class="meta">Se ele fizer perguntas, responda lá mesmo. Quando ele entregar o <strong>bloco de código</strong>, copie e volte aqui.</p>
          <AcoesPrompt prompt={promptLivre} rotulo="Organizar no ChatGPT" />
          <button class="botao primario bloco" onclick={irParaColar}><Icone nome="colar" /> Já copiei a resposta — colar</button>
        </section>
      {/if}
      <p class="meta centro">Prefere sem IA? <a href="#/escrever">Preencher o formulário</a></p>
    {/if}
    <button class="botao bloco sutil" onclick={() => { r.semLink = true; r.passo = 'colar'; }}>Já tenho o texto no formato do Pratoria</button>

  {:else if r.passo === 'colar'}
    <section class="folha-papel bloco">
      <h2>Cole a resposta do ChatGPT</h2>
      <div class="com-botao topo-direita">
        <button class="botao leve" onclick={colarTexto}><Icone nome="colar" /> Colar</button>
      </div>
      <label class="campo"><span class="visualmente-oculto">Resposta do ChatGPT</span>
        <textarea class="entrada" bind:value={r.texto} placeholder="#PRATORIA v1&#10;titulo: …" spellcheck="false"></textarea>
      </label>
      {#if resultado}<PreviaReceita {resultado} />{/if}
      <button class="botao primario bloco" disabled={!resultado?.valido} onclick={salvar}>Salvar no caderno</button>
      <button class="botao bloco sutil" onclick={() => { r.passo = 'inicio'; r.semLink = false; }}>Voltar</button>
    </section>

  {:else if r.passo === 'foto' && salva}
    <section class="folha-papel bloco">
      <h2>A foto do prato</h2>
      <p class="meta">Opcional. Dá para fazer depois, na página da receita.</p>
      <EtapaImagem receita={salva} aoSalvar={salvarImagem} aoPular={depoisDaFoto} rotuloPular="Pular" />
    </section>

  {:else if r.passo === 'giz' && salva}
    <section class="folha-papel bloco">
      <h2>Ilustrações a giz</h2>
      <p class="meta">Opcional. Os desenhos aparecem no Modo Cozinhar, entrando a cada passo.</p>
      <EtapaIlustracoes receita={salva} id={r.receitaId} aoTerminar={terminar} aoPular={terminar} />
    </section>
  {:else}
    <p>Algo se perdeu no caminho. <button class="botao leve" onclick={recomecar}>Recomeçar</button></p>
  {/if}
</div>

<PerguntaDuplicada bind:aberta={perguntandoDup} {dup} aoEscolher={gravar} />

<style>
  .tela { width: min(100% - 2rem, 40rem); margin-inline: auto; padding-top: 1rem; display: grid; gap: 1rem; }
  h1 { font-size: var(--t-h2); }
  h2 { font-size: 1.25rem; display: flex; align-items: center; gap: .5rem; }
  .num { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--terracota-forte); color: #fff; font-size: .9rem; font-family: var(--fonte-texto); }
  .bloco { padding: 1.1rem; display: grid; gap: .8rem; }
  .bloco p { margin: 0; }
  .trilha { list-style: none; display: grid; grid-template-columns: repeat(4, 1fr); gap: .25rem; padding: 0; margin: 0; }
  .trilha li { display: grid; justify-items: center; gap: .2rem; font-size: .78rem; font-weight: 700; color: var(--tinta-fraca); }
  .trilha span { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; border: 1.5px solid var(--linha); background: var(--papel-folha); }
  .trilha li[aria-current='step'] { color: var(--tinta); }
  .trilha li[aria-current='step'] span { background: var(--tinta); color: var(--papel-folha); border-color: var(--tinta); }
  .trilha li.feito span { background: var(--oliva); border-color: var(--oliva); color: #fff; }
  .modos { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
  .modos button { display: flex; align-items: center; gap: .6rem; min-height: 64px; padding: .6rem .8rem; border-radius: var(--raio-m); border: 1.5px solid var(--linha);
    background: var(--papel-folha); cursor: pointer; text-align: left; color: var(--tinta-suave); font: inherit; }
  .modos button span { display: grid; line-height: 1.2; font-weight: 800; }
  .modos small { font-weight: 400; font-size: .78rem; }
  .modos button[aria-selected='true'] { border-color: var(--terracota-forte); color: var(--tinta); box-shadow: 0 0 0 1.5px var(--terracota-forte); }
  .modos button[aria-selected='true'] :global(svg) { color: var(--terracota-forte); }
  .nome small { font-weight: 400; }
  .com-botao { display: flex; gap: .5rem; }
  .com-botao .entrada { flex: 1; min-width: 0; }
  .topo-direita { justify-content: flex-end; margin-bottom: -.4rem; }
  .pergunta { font-weight: 800; margin: .25rem 0 .1rem !important; }
  .escolhas { display: grid; gap: .45rem; animation: surge .25s var(--mola-padrao); }
  @keyframes surge { from { opacity: 0; transform: translateY(6px); } }
  @media (prefers-reduced-motion: reduce) { .escolhas { animation: none; } }
  .escolha { display: grid; grid-template-columns: 40px 1fr 28px; gap: .7rem; align-items: center; min-height: 60px; padding: .45rem .7rem; border-radius: var(--raio-m);
    border: 1.5px solid var(--linha); background: var(--papel-folha); cursor: pointer; }
  .escolha input { position: absolute; opacity: 0; pointer-events: none; }
  .escolha .ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--papel); color: var(--terracota-forte); }
  .escolha .txt { display: grid; line-height: 1.25; }
  .escolha small { color: var(--tinta-suave); font-size: .82rem; }
  .escolha .marca { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--linha); color: transparent; }
  .escolha.marcada { border-color: var(--oliva); background: color-mix(in srgb, var(--oliva) 7%, var(--papel-folha)); }
  .escolha.marcada .marca { background: var(--oliva); border-color: var(--oliva); color: #fff; }
  .escolha:has(input:focus-visible) { outline: 3px solid var(--foco); outline-offset: 2px; }
  textarea.livre { font-family: var(--fonte-texto); font-size: max(16px, 1rem); line-height: 1.5; min-height: 12rem; }
  .centro { text-align: center; margin: 0; }
  .link { border: 0; background: none; padding: 0; color: var(--terracota-forte); text-decoration: underline; cursor: pointer; font: inherit; }
  .sutil { border-color: transparent; color: var(--tinta-suave); font-weight: 600; }
  .erro { color: var(--erro); }
  a[aria-disabled='true'] { opacity: .45; pointer-events: none; }
  @media (min-width: 64rem) { .tela { padding-top: 2.5rem; } }
</style>
