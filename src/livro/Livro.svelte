<script>
  // Modo Mão na Massa: livro em tela cheia.
  // • Celular: uma página por vez. Desktop largo: duas páginas lado a lado.
  // • Preparo paginado por medição real: sem rolagem; se não couber, nova folha.
  // • Virada física (motor.js), toque nas laterais, setas, Esc.
  // • Progresso, lista de compras e "manter tela ligada" ficam SÓ no aparelho.
  import './livro.css';
  import { onMount, tick } from 'svelte';
  import Pagina from './Pagina.svelte';
  import { blocosDaReceita, paginar, indiceDaChave } from './paginas.js';
  import { criarMotor } from './motor.js';
  import { banco, atualizarPessoal, preferencia, salvarPreferencia } from '../lib/caderno.svelte.js';
  import { trava } from '../lib/pwa.svelte.js';
  import { avisar } from '../lib/avisos.svelte.js';
  import { compartilharReceita } from '../core/compartilhar/compartilhar.js';
  import { imagemBlob } from '../lib/caderno.svelte.js';
  import { urlDoSite } from '../lib/urlSite.js';
  import { trechosComTempo, cronometrosDosItens } from '../core/tempos.js';
  import Cronometros from '../componentes/Cronometros.svelte';
  import Icone from '../componentes/Icone.svelte';
  import { abrirCronometro } from '../lib/cronometros.svelte.js';
  import Folha from '../componentes/Folha.svelte';
  import GuiaMaoNaMassa from './GuiaMaoNaMassa.svelte';
  import { voz, falar, pausar as pausarVoz, retomar as retomarVoz, parar as pararVoz, mudarTaxa } from '../lib/voz.svelte.js';
  import { roteiroDaPagina } from '../core/fala.js';
  import { app, carregarIlustracoes } from '../lib/caderno.svelte.js';
  import { ilustracoesAte, ilustracoesNovas } from '../core/ilustracoes.js';

  let { registro, aoSair } = $props();
  const r = $derived(registro.dados);
  const id = $derived(registro.id);

  let dialogo, palco, medidor;
  let paginas = $state([]);
  let duplo = $state(false);
  let vista = $state(0);          // índice da vista (1 ou 2 páginas)
  let p = $state(0);              // progresso da virada (ver motor.js)
  let borda = $state(0);          // resistência nas pontas
  let marcados = $state({});
  let menu = $state(false);
  let retomar = $state(null);     // {indice, rotulo}
  let tutorial = $state(false);
  let telaLigada = $state(false);
  let concluiu = false;
  let wakeLock = null;
  let motor;
  // ilustrações a giz: "prateleira" que acumula os desenhos conforme os passos
  const recortes = $derived(app.ilustracoes[registro.id]?.recortes ?? []);
  const comPrateleira = $derived(recortes.length > 0);
  function prateleiraDa(pg) {
    if (!comPrateleira || !pg) return null;
    if (pg.tipo === 'final') return { itens: recortes, novas: [] };
    if (pg.tipo === 'ingredientes') return { itens: ilustracoesAte(r, recortes, pg.prep, 0).itens, novas: [] };
    if (pg.tipo === 'preparo') {
      const ns = pg.itens.filter((x) => x.tipo === 'passo').map((x) => x.n);
      const de = ns.length ? Math.min(...ns) : 0, ate = ns.length ? Math.max(...ns) : 0;
      return { itens: ilustracoesAte(r, recortes, pg.prep, ate).itens, novas: ilustracoesNovas(r, recortes, pg.prep, de, ate) };
    }
    return null;
  }
  const reduzido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- vistas ----------
  const vistas = $derived.by(() => {
    if (!duplo) return paginas.map((_, i) => [i]);
    const v = [[0]];
    for (let i = 1; i < paginas.length; i += 2) v.push(i + 1 < paginas.length ? [i, i + 1] : [i]);
    return v;
  });
  const indiceAtual = $derived(vistas[vista]?.[0] ?? 0);
  const paginaAtual = $derived(paginas[indiceAtual]);
  // cronômetros que já aparecem como cartão na(s) página(s) visível(is) não se repetem na pilha do topo
  const chavesVisiveis = $derived((vistas[vista] ?? []).flatMap((pi) => {
    const pg = paginas[pi];
    return pg?.tipo === 'preparo' ? cronometrosDosItens(pg.itens).map((c) => `${id}:${pg.prep}:${c.n}`) : [];
  }));
  const totalInternas = $derived(Math.max(0, paginas.length - 1));
  const progresso = $derived(!vistas[vista] ? '' : paginaAtual?.tipo === 'capa' ? 'CAPA'
    : `${String(vistas[vista].at(-1)).padStart(2, '0')} / ${String(totalInternas).padStart(2, '0')}`);

  function vistaDaPagina(i) { return Math.max(0, vistas.findIndex((v) => v.includes(i))); }

  // ---------- medição e paginação ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // mesma marcação de PassoTexto.svelte (tempos viram botões ⏱)
  const htmlPasso = (t) => trechosComTempo(t).map((x) => (x.tempo ? `<button type="button" class="passo-tempo">${esc(x.texto)}</button>` : esc(x.texto))).join('');
  function htmlPreparo(bloco, itens) {
    const lis = itens.map((it) => it.tipo === 'passo' ? `<li class="marcavel"><span class="marcador"></span><span class="n">${it.n}</span>${htmlPasso(it.texto)}</li>` : `<li class="dica">${esc(it.texto)}</li>`).join('');
    return `<div class="pag"><header class="pag-cab"><div class="pag-kicker">Preparo</div><h2>${esc(r.preparacoes[bloco.prep].nome)}</h2><span class="pag-parte">9/9</span></header>` +
      `<div class="pag-corpo"><ol class="pag-passos">${lis}</ol></div>` +
      (cronometrosDosItens(itens).length ? `<div class="pag-cronos">${cronometrosDosItens(itens).map(() => '<div></div>').join('')}</div>` : '') +
      `<span class="pag-numero">00</span></div>`;
  }
  function cabe(bloco, itens) {
    medidor.innerHTML = htmlPreparo(bloco, itens);
    const corpo = medidor.querySelector('.pag-corpo');
    return corpo.scrollHeight <= corpo.clientHeight + 1;
  }
  async function repaginar() {
    const chave = paginas[indiceAtual]?.chave;
    const w = palco.clientWidth, h = palco.clientHeight;
    duplo = w >= 980 && h >= 600 && w / h > 1.25;
    await tick();
    medidor.className = 'folha medir' + (duplo ? ' direita' : '');
    paginas = paginar(blocosDaReceita(r), cabe);
    medidor.innerHTML = '';
    await tick();
    vista = vistaDaPagina(indiceDaChave(paginas, chave));
  }

  // ---------- camadas visíveis (quais folhas, em que posição) ----------
  const camadas = $derived.by(() => {
    const V = vistas; if (!V.length || !V[vista]) return [];
    const lado = (lista, i) => (!duplo ? '' : lista.length === 1 ? 'sozinha' : i === 0 ? 'esquerda' : 'direita');
    const pagDa = (v, papel, extra = {}) => V[v].map((pi, k) => ({ pi, classe: lado(V[v], k), papel, ...extra }));
    const ang = (t) => (Math.acos(Math.max(-1, Math.min(1, t))) * 180) / Math.PI;
    const out = [];
    if (p < 0 && V[vista + 1]) {                         // frente
      const t = -p;
      out.push(...pagDa(vista + 1, 'embaixo', { sombra: (1 - t) * 0.7 }));
      const atual = pagDa(vista, 'fixa');
      const vira = atual.pop();
      out.push(...atual.map((c) => ({ ...c, opacidade: t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4 })));
      out.push({ ...vira, papel: 'virando', sombra: t * 0.9, transform: `rotateY(${-ang(1 - t)}deg)` });
    } else if (p > 0 && V[vista - 1]) {                  // trás
      const t = p;
      if (!duplo) {
        out.push(...pagDa(vista, 'embaixo', { sombra: t * 0.6 }));
        out.push(...pagDa(vista - 1, 'virando', { sombra: (1 - t) * 0.9, transform: `rotateY(${-ang(t)}deg)` }));
      } else {
        out.push(...pagDa(vista - 1, 'embaixo', { sombra: (1 - t) * 0.7 }));
        const atual = pagDa(vista, 'fixa');
        const vira = atual.shift();
        out.push(...atual.map((c) => ({ ...c, opacidade: t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4 })));
        out.push({ ...vira, papel: 'virando', sombra: t * 0.9, transform: `rotateY(${ang(1 - t)}deg)`, origem: vira.classe === 'esquerda' ? 'right center' : 'left center' });
      }
    } else {
      out.push(...pagDa(vista, 'fixa', borda ? { transform: `translateX(${borda * 100}%)` } : {}));
    }
    return out;
  });

  // ---------- navegação ----------
  async function irPara(i, { salvar = true } = {}) {
    vista = vistaDaPagina(i); p = 0; menu = false;
    if (salvar) await guardar();
  }
  async function aoConcluir(dir) {
    vista = Math.max(0, Math.min(vistas.length - 1, vista + dir));
    p = 0;
    // a linha focada pode ter saído da tela: devolve o foco ao livro (as setas continuam funcionando)
    tick().then(() => { if (!dialogo.contains(document.activeElement) || !document.activeElement?.isConnected) dialogo.focus({ preventScroll: true }); });
    await guardar();
    if (paginas[vistas[vista]?.at(-1)]?.tipo === 'final' && !concluiu) {
      concluiu = true;
      atualizarPessoal(id, { status: 'já fiz', vezesPreparada: (registro.pessoal?.vezesPreparada ?? 0) + 1, ultimaVez: new Date().toISOString() });
    }
  }
  async function guardar() {
    const pg = paginas[indiceAtual];
    await banco().salvarEstado(id, { pagina: pg?.chave ?? 'capa', rotulo: pg?.rotulo ?? '' });
  }
  function interagiu() {
    if (tutorial) { tutorial = false; salvarPreferencia('tutorialLivro', true); }
    retomar = null;
  }

  // ---------- marcadores (compras, ingredientes, passos): só neste aparelho, zeram ao recomeçar ----------
  async function marcar(chave, valor = !marcados[chave]) {
    marcados = { ...marcados, [chave]: valor };
    if (valor) navigator.vibrate?.(12);
    await banco().salvarEstado(id, { compras: $state.snapshot(marcados) });
  }
  let guiaAberto = $state(false);

  // ---------- manter tela ligada ----------
  async function pedirTela() {
    try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); return true; }
    catch { return false; }
  }
  async function alternarTela(ligar) {
    if (ligar) {
      if (!('wakeLock' in navigator)) { avisar('Este navegador não permite manter a tela ligada. Ajuste o tempo de bloqueio do aparelho.'); telaLigada = false; return; }
      telaLigada = await pedirTela();
      if (!telaLigada) avisar('Não foi possível manter a tela ligada agora.');
    } else { telaLigada = false; await wakeLock?.release(); }
    salvarPreferencia('manterTelaLigada', telaLigada);
  }
  function aoVisibilidade() { if (document.visibilityState === 'visible' && telaLigada && !wakeLock) pedirTela(); }

  // ---------- ações ----------
  async function recomecar() {
    marcados = {}; concluiu = false;
    await banco().salvarEstado(id, { pagina: 'capa', rotulo: '', compras: {} });
    irPara(0, { salvar: false });
  }
  async function compartilhar() {
    menu = false;
    try { await compartilharReceita(r, { imagem: await imagemBlob(id), siteUrl: urlDoSite() }); } catch {}
  }
  function sair() { pararVoz(); guardar(); aoSair(); }

  // ---------- leitura em voz alta ----------
  let painelVoz = $state(false);
  let modoVoz = $state(null);        // null | 'pagina' | 'continuo'
  let autoLer = $state(false);       // lê sozinho a página nova ao virar
  let vistaLida = -1;
  function lerVista() {
    const frases = (vistas[vista] ?? []).flatMap((pi) => roteiroDaPagina(paginas[pi], r));
    vistaLida = vista;
    const continuar = () => {
      if (modoVoz !== 'continuo') { modoVoz = null; return; }
      if (vista < vistas.length - 1) motor.avancar(); else modoVoz = null;
    };
    if (!frases.length) { continuar(); return; }
    falar(frases, { titulo: paginaAtual?.rotulo ?? r.titulo, origem: 'livro', aoTerminar: continuar });
  }
  function lerPagina() { modoVoz = 'pagina'; lerVista(); }
  function lerTudo() { modoVoz = 'continuo'; lerVista(); }
  function pararLeitura() { modoVoz = null; pararVoz(); }
  $effect(() => {
    const v = vista;
    if (v === vistaLida || p !== 0) return;
    if (modoVoz === 'continuo' || (autoLer && painelVoz)) lerVista();
    else if (modoVoz === 'pagina' && voz.falando) { pararVoz(); modoVoz = null; }
  });
  const TAXAS = [0.85, 1, 1.2];

  function teclado(e) {
    const outro = e.target.closest?.('dialog');
    if (outro && outro !== dialogo) return;   // folhas abertas por cima do livro (guia, cronômetro)
    if (e.key === 'Escape') { e.preventDefault(); if (menu) menu = false; else sair(); return; }
    if (menu || e.target.closest?.('input, textarea')) return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); interagiu(); motor.avancar(); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); interagiu(); motor.voltar(); }
  }

  onMount(() => {
    trava.cozinhando = true;
    dialogo.showModal();
    let ro, cancelado = false;
    (async () => {
      await document.fonts.ready;
      await carregarIlustracoes(registro.id);   // antes de medir: a prateleira ocupa espaço
      if (cancelado) return;
      await tick();
      await repaginar();
      const est = await banco().obterEstado(id);
      marcados = est?.compras ?? {};
      const i = indiceDaChave(paginas, est?.pagina);
      if (i > 0 && paginas[i]?.tipo !== 'final') retomar = { indice: i, rotulo: est?.rotulo || paginas[i].rotulo };
      tutorial = !(await preferencia('tutorialLivro', false));
      if (await preferencia('manterTelaLigada', false)) alternarTela(true);
      motor = criarMotor(palco, {
        largura: () => (palco.querySelector('.folha.virando, .folha')?.offsetWidth || palco.clientWidth),
        podeAvancar: () => vista < vistas.length - 1,
        podeVoltar: () => vista > 0,
        aoMudar: (novo, b) => { p = novo; borda = b; },
        aoConcluir,
        aoInteragir: interagiu,
        reduzido,
        aoTocarItem: (chave) => marcar(chave),
      });
      let espera;
      ro = new ResizeObserver(() => { clearTimeout(espera); espera = setTimeout(repaginar, 150); });
      ro.observe(palco);
    })();
    document.addEventListener('visibilitychange', aoVisibilidade);
    return () => {
      cancelado = true; ro?.disconnect(); motor?.destruir();
      document.removeEventListener('visibilitychange', aoVisibilidade);
      wakeLock?.release(); trava.cozinhando = false;
    };
  });
</script>

<dialog class="livro" tabindex="-1" class:duplo class:com-prateleira={comPrateleira} bind:this={dialogo} aria-label={`Modo Mão na Massa: ${r.titulo}`}
  oncancel={(e) => { e.preventDefault(); sair(); }} onkeydown={teclado}>
  <div class="livro-barra">
    <button class="botao-icone" onclick={sair} aria-label="Sair do Modo Mão na Massa">✕</button>
    <div class="livro-progresso" aria-live="polite">
      <span class="visualmente-oculto">{paginaAtual?.rotulo}</span>
      <span aria-hidden="true">{progresso}</span>
    </div>
    <div class="livro-dir">
      {#if voz.suportado}<button class="botao-icone" class:ativo={painelVoz || voz.falando} onclick={() => { painelVoz = !painelVoz; menu = false; }} aria-label="Ouvir a receita" aria-expanded={painelVoz}><Icone nome="som" /></button>{/if}
      <button class="botao-icone" onclick={abrirCronometro} aria-label="Cronômetro"><Icone nome="cronometro" /></button>
      <button class="botao-icone" onclick={() => { menu = !menu; painelVoz = false; }} aria-label="Opções" aria-expanded={menu} aria-controls="livro-menu">⋮</button>
    </div>
  </div>

  <Cronometros noLivro ocultar={chavesVisiveis} />
  {#if painelVoz}
    <div class="livro-voz" role="region" aria-label="Ouvir a receita">
      {#if voz.falando && voz.origem === 'livro'}
        <span class="lv-txt"><strong>{voz.pausado ? 'Pausado' : modoVoz === 'continuo' ? 'Lendo e virando as páginas' : 'Lendo esta página'}</strong></span>
        {#if voz.pausado}<button class="lv-b" onclick={retomarVoz} aria-label="Continuar"><Icone nome="tocar" tamanho={18} /></button>
        {:else}<button class="lv-b" onclick={pausarVoz} aria-label="Pausar"><Icone nome="pausa" tamanho={18} /></button>{/if}
        <button class="lv-b" onclick={pararLeitura} aria-label="Parar"><Icone nome="parar" tamanho={18} /></button>
      {:else}
        <button class="lv-acao" onclick={lerPagina}><Icone nome="tocar" tamanho={18} /> Esta página</button>
        <button class="lv-acao" onclick={lerTudo}><Icone nome="livro" tamanho={18} /> Tudo, virando</button>
      {/if}
      <label class="lv-auto"><input type="checkbox" bind:checked={autoLer} /> Ler ao virar</label>
      <button class="lv-b" onclick={() => mudarTaxa(TAXAS[(TAXAS.indexOf(voz.taxa) + 1) % TAXAS.length] ?? 1)} aria-label="Velocidade">{String(voz.taxa).replace('.', ',')}×</button>
    </div>
  {/if}
  <div class="livro-palco" bind:this={palco}>
    {#each camadas as c (c.pi)}
      <article class={`folha ${c.classe} ${c.papel}`}
        style:z-index={c.papel === 'virando' ? 3 : c.papel === 'fixa' ? 2 : 1}
        style:transform={c.transform}
        style:transform-origin={c.origem}
        style:opacity={c.opacidade}
        aria-hidden={c.papel === 'embaixo' || c.papel === 'virando' ? 'true' : undefined}
        inert={c.papel !== 'fixa' ? true : undefined}>
        {#if paginas[c.pi]}<Pagina pagina={paginas[c.pi]} receita={r} {id} {marcados} aoMarcar={marcar} aoVerGuia={() => (guiaAberto = true)} aoRecomecar={recomecar} aoSair={sair} total={totalInternas} prateleira={prateleiraDa(paginas[c.pi])} />{/if}
        <div class="sombra" style:opacity={c.sombra ?? 0}></div>
      </article>
    {/each}
    <div class="folha medir" bind:this={medidor} aria-hidden="true"></div>
    {#if retomar}
      <div class="livro-cartao" role="dialog" aria-label="Continuar de onde parou">
        <p><strong>Continuar de onde parou?</strong><br />Você estava em {retomar.rotulo}.</p>
        <div class="linha">
          <button class="botao escuro" onclick={() => { const i = retomar.indice; retomar = null; irPara(i); }}>Continuar</button>
          <button class="botao leve" onclick={() => { retomar = null; recomecar(); }}>Começar de novo</button>
        </div>
      </div>
    {/if}
  </div>

  {#if menu}
    <div class="livro-menu" id="livro-menu" role="menu">
      <button role="menuitem" onclick={recomecar}>Reiniciar receita</button>
      <hr />
      {#each paginas as pg, i}
        {#if pg.tipo !== 'capa' && (pg.tipo !== 'preparo' || pg.parte === 1)}
          <button role="menuitem" class="ir" onclick={() => irPara(i)}>{pg.tipo === 'preparo' ? pg.rotulo.replace(/ \d+\/\d+$/, '') : pg.rotulo}<span class="meta">{String(i).padStart(2, '0')}</span></button>
        {/if}
      {/each}
      <hr />
      <label><span>Manter tela ligada</span><input type="checkbox" checked={telaLigada} onchange={(e) => alternarTela(e.currentTarget.checked)} /></label>
      <button role="menuitem" onclick={compartilhar}>Compartilhar</button>
      <button role="menuitem" onclick={sair}>Sair</button>
    </div>
  {/if}
  <Folha bind:aberta={guiaAberto} titulo="Como usar o Mão na Massa">{#if guiaAberto}<GuiaMaoNaMassa />{/if}</Folha>
</dialog>
