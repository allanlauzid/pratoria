<script>
  import Marca from '../componentes/Marca.svelte';
  import Icone from '../componentes/Icone.svelte';
  import NuvemStatus from '../componentes/NuvemStatus.svelte';
  import ImagemReceita from '../componentes/ImagemReceita.svelte';
  import Prateleira from '../componentes/Prateleira.svelte';
  import Compartilhar from '../componentes/Compartilhar.svelte';
  import Folha from '../componentes/Folha.svelte';
  import EtapaImagem from '../componentes/EtapaImagem.svelte';
  import EtapaIlustracoes from '../componentes/EtapaIlustracoes.svelte';
  import AjustesExibicao from '../componentes/AjustesExibicao.svelte';
  import Livro from '../livro/Livro.svelte';
  import PassoTexto from '../componentes/PassoTexto.svelte';
  import Substituicoes from '../componentes/Substituicoes.svelte';
  import { abrirCronometro } from '../lib/cronometros.svelte.js';
  import { voz, falar, parar as pararVoz } from '../lib/voz.svelte.js';
  import { roteiroCompleto } from '../core/fala.js';
  import EscolherColecoes from '../componentes/EscolherColecoes.svelte';
  import EscolherDias from '../componentes/EscolherDias.svelte';
  import { DIAS } from '../core/cardapio.js';
  import { app, banco, recarregar, atualizarPessoal, excluir, trocarImagem, carregarIlustracoes, imagemBlob } from '../lib/caderno.svelte.js';
  import { baixarArquivo } from '../lib/baixar.js';
  import { extensaoDe } from '../lib/imagem.js';
  import { ir } from '../lib/rota.svelte.js';
  import { avisar } from '../lib/avisos.svelte.js';
  import { copiarTexto } from '../core/compartilhar/compartilhar.js';
  import { textoWhatsApp } from '../core/compartilhar/whatsapp.js';
  import { urlDoSite } from '../lib/urlSite.js';
  import { creditoCurto } from '../core/formato/credito.js';
  import { ingredienteExibido, fatorPorcoes } from '../core/formato/escala.js';
  import { formatarMinutos, tempoAtivo, primeiraMaiuscula } from '../lib/formatar.js';

  let { id, cozinhando = false } = $props();
  const reg = $derived(app.receitas.find((x) => x.id === id));
  const r = $derived(reg?.dados);
  const credito = $derived(r ? creditoCurto(r) : null);
  const ativo = $derived(r ? formatarMinutos(tempoAtivo(r)) : '');
  const espera = $derived(r?.tempos?.espera?.min >= 60 ? formatarMinutos(r.tempos.espera) : '');
  const ex = $derived(app.prefs.exibicao);

  // porções: por receita (guardadas em "pessoal", aparelho + nuvem)
  const base = $derived(r?.rendimento?.porcoes || 1);
  let porcoes = $state(1);
  $effect(() => { porcoes = reg?.pessoal?.porcoesPreferidas || base; });
  $effect(() => { if (reg && porcoes !== (reg.pessoal?.porcoesPreferidas || base)) atualizarPessoal(id, { porcoesPreferidas: porcoes === base ? null : porcoes }); });
  const fator = $derived(fatorPorcoes(r, porcoes));
  function ouvir() {
    if (voz.falando && voz.origem === 'receita') { pararVoz(); return; }
    if (!falar(roteiroCompleto(r), { titulo: r.titulo, origem: 'receita' })) avisar('Este navegador não lê em voz alta.');
  }
  async function baixarFoto() {
    const blob = await imagemBlob(id); if (!blob) return;
    baixarArquivo(new File([blob], `${r.slug || 'foto'}.${extensaoDe(blob)}`, { type: blob.type }));
  }
  async function copiarParaWhatsApp() {
    const ok = await copiarTexto(textoWhatsApp(r, { porcoes, unidades: ex.unidades, siteUrl: urlDoSite() }));
    avisar(ok ? 'Receita copiada. É só colar no WhatsApp.' : 'Não foi possível copiar.');
  }
  const ing = (i) => ingredienteExibido(i, { fator, unidades: ex.unidades });

  $effect(() => { carregarIlustracoes(id); });
  const ilus = $derived(app.ilustracoes[id]);

  let compartilhar = $state(false);
  let trocandoImagem = $state(false);
  let fazendoIlus = $state(false);
  let ajustes = $state(false);
  let confirmarExclusao = $state(false);
  let escolhendoColecoes = $state(false);
  let escolhendoDias = $state(false);
  const diasNoCardapio = $derived(DIAS.filter(([k]) => app.cardapio.dias[k]?.includes(id)).map(([, n]) => n.slice(0, 3)));
  let anotacoes = $state('');
  $effect(() => { anotacoes = (r?.anotacoes ?? []).join('\n'); });

  async function salvarAnotacoes() {
    const lista = anotacoes.split('\n').map((s) => s.trim()).filter(Boolean);
    if (JSON.stringify(lista) === JSON.stringify(r.anotacoes ?? [])) return;
    await banco().salvarReceita({ ...$state.snapshot(r), anotacoes: lista });
    await recarregar();
    avisar('Anotações salvas');
  }
  async function apagar() { await excluir(id); ir('/', { substituir: true }); avisar('Receita removida'); }
  const irPara = (e, alvo) => { e.preventDefault(); document.getElementById(alvo)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); };
  const temExtras = $derived(r && ((ex.secoes.substituicoes && r.substituicoes.some((x) => x.fonte)) || (ex.secoes.variacoes && r.variacoes.length) || r.servir.length || r.conservacao.length));
</script>

{#if !r}
  <div class="vazio"><p>Receita não encontrada. <a href="#/">Voltar ao caderno</a></p></div>
{:else}
  <header class="topo">
    <div class="esq">
      <a class="botao-icone" href="#/" aria-label="Voltar ao caderno"><Icone nome="voltar" /></a>
      <Marca compacta />
      <button class="botao-icone" onclick={copiarParaWhatsApp} aria-label="Copiar receita formatada para WhatsApp"><Icone nome="copiar" /></button>
    </div>
    <div class="dir">
      <NuvemStatus compacto />
      <button class="botao-icone" aria-pressed={!!reg.pessoal?.favorita} aria-label={reg.pessoal?.favorita ? 'Remover dos favoritos' : 'Favoritar'}
        onclick={() => atualizarPessoal(id, { favorita: !reg.pessoal?.favorita })}><Icone nome="coracao" /></button>
      <button class="botao-icone" onclick={() => (compartilhar = true)} aria-label="Compartilhar"><Icone nome="compartilhar" /></button>
    </div>
  </header>

  <article class="receita">
    <div class="abertura">
      <div class="titulo">
        {#if r.categoria}<p class="rotulo">{r.categoria}{r.cozinha ? ` · ${r.cozinha}` : ''}</p>{/if}
        <h1>{r.titulo}</h1>
      </div>
      <figure class="foto">
        <div class="moldura">
          <ImagemReceita {id} alt={r.visual || r.titulo} carregar="eager" />
          {#if ilus?.recortes?.length}<div class="prat-foto"><Prateleira itens={ilus.recortes.slice(0, 5)} tamanho={40} /></div>{/if}
        </div>
        {#if credito}<figcaption class="credito">{#if credito.url}<a href={credito.url} target="_blank" rel="noopener">{credito.texto}</a>{:else}{credito.texto}{/if}</figcaption>
        {:else}<figcaption class="credito">[sem link original]</figcaption>{/if}
      </figure>
      <div class="lado">
        <ul class="info" aria-label="Informações rápidas">
          <li class="pilula">{porcoes} {porcoes === 1 ? 'porção' : 'porções'}</li>
          {#if ativo}<li class="pilula"><Icone nome="relogio" tamanho={16} /> {ativo}</li>{/if}
          {#if r.dificuldade}<li class="pilula">{primeiraMaiuscula(r.dificuldade)}</li>{/if}
          {#if r.temperaturaForno}<li class="pilula">Forno {r.temperaturaForno}</li>{/if}
        </ul>
        {#if espera}<p class="alerta"><Icone nome="relogio" tamanho={20} /><span>Tem <strong>{espera}</strong> de espera (molho, descanso ou geladeira). Comece com antecedência.</span></p>{/if}
        {#if r.ajustes?.length}<p class="credito">Adaptada com: {r.ajustes.join(', ')}.</p>{/if}
        {#if r.descricao}<p class="descricao">{r.descricao}</p>{/if}
        <div class="acoes-desktop">
          <a class="botao primario cozinhar" href={`#/receita/${id}/cozinhar`}><Icone nome="livro" tamanho={24} /><span><strong>Cozinhar</strong></span></a>
          <div class="acoes-par">
            <button class="botao leve" onclick={() => (compartilhar = true)}><Icone nome="compartilhar" /> Compartilhar</button>
            <button class="botao leve" onclick={copiarParaWhatsApp}><Icone nome="copiar" /> Copiar p/ WhatsApp</button>
          </div>
        </div>
        <button class="botao leve lista" aria-pressed={!!reg.pessoal?.naLista} onclick={() => atualizarPessoal(id, { naLista: !reg.pessoal?.naLista })}>
          <Icone nome={reg.pessoal?.naLista ? 'check' : 'mais'} tamanho={18} /> {reg.pessoal?.naLista ? 'Na lista de compras' : 'Adicionar à lista de compras'}
        </button>
      </div>
    </div>

    <nav class="indice" aria-label="Nesta receita">
      {#if r.compras?.length}<a href="#compras" onclick={(e) => irPara(e, 'compras')}>Compras</a>{/if}
      <a href="#ingredientes" onclick={(e) => irPara(e, 'ingredientes')}>Ingredientes</a>
      <a href="#preparo" onclick={(e) => irPara(e, 'preparo')}>Preparo</a>
      {#if temExtras}<a href="#extras" onclick={(e) => irPara(e, 'extras')}>Extras</a>{/if}
      <a href="#notas" onclick={(e) => irPara(e, 'notas')}>Notas</a>
      {#if voz.suportado}<button class="aa ouvir" onclick={ouvir} aria-label={voz.falando && voz.origem === 'receita' ? 'Parar a leitura' : 'Ouvir a receita'}><Icone nome={voz.falando && voz.origem === 'receita' ? 'parar' : 'som'} tamanho={20} /></button>{/if}
      <button class="aa" onclick={() => (ajustes = true)} aria-label="Ajustes de exibição: porções, medidas, tamanho do texto"><span aria-hidden="true">Aa</span></button>
    </nav>

    {#if r.compras?.length}
      <details id="compras" class="compras bloco folha-papel" open>
        <summary><h2>Lista de compras</h2><span class="meta">{r.compras.length} {r.compras.length === 1 ? 'item' : 'itens'}{fator !== 1 ? ` · para ${base} ${base === 1 ? 'porção' : 'porções'}` : ''}</span></summary>
        <ul class="lista-compras">{#each r.compras as c}<li><span>{c.item}</span>{#if c.quantidade}<small>{c.quantidade}</small>{/if}</li>{/each}</ul>
      </details>
    {/if}

    <div class="corpo">
      <section id="ingredientes" class="bloco folha-papel">
        <div class="cab">
          <h2>Ingredientes</h2>
          <div class="porcoes" role="group" aria-label="Porções">
            <button onclick={() => (porcoes = Math.max(1, porcoes - 1))} aria-label="Menos porções">−</button>
            <output aria-live="polite">{porcoes}</output>
            <button onclick={() => (porcoes += 1)} aria-label="Mais porções">+</button>
          </div>
        </div>
        {#if fator !== 1 || ex.unidades !== 'original'}<p class="credito">Quantidades ajustadas {fator !== 1 ? `para ${porcoes} ${porcoes === 1 ? 'porção' : 'porções'}` : ''}{ex.unidades !== 'original' ? ' · volume em ml' : ''}.</p>{/if}
        {#each r.preparacoes as p, i (i)}
          {#if p.ingredientes.length}
            {#if r.preparacoes.length > 1}<h3>{p.nome}</h3>{/if}
            {#if p.nota}<p class="nota">{p.nota}</p>{/if}
            <ul class="ingredientes">{#each p.ingredientes as x}<li>{ing(x)}</li>{/each}</ul>
          {/if}
        {/each}
      </section>

      <section id="preparo" class="bloco folha-papel">
        <h2>Preparo</h2>
        {#each r.preparacoes as p, i (i)}
          {#if r.preparacoes.length > 1}<h3><span class="rotulo">Parte {i + 1}</span> {p.nome}</h3>{/if}
          <ol class="passos">{#each p.passos as passo, n}<li><PassoTexto texto={passo} receitaId={id} titulo={r.titulo} passo={n + 1} chave={`${id}:${i}:${n + 1}`} /></li>{/each}</ol>
          {#if ex.secoes.dicas && p.dicas.length}<div class="dicas"><strong>Dicas</strong><ul>{#each p.dicas as d}<li>{d}</li>{/each}</ul></div>{/if}
        {/each}
      </section>
    </div>

    {#if temExtras}
      <section id="extras" class="extras">
        {#if ex.secoes.substituicoes}<Substituicoes receita={r} />{/if}
        {#if r.servir.length}<div class="bloco folha-papel"><h3>Como servir</h3><ul>{#each r.servir as s}<li>{s}</li>{/each}</ul></div>{/if}
        {#if r.conservacao.length}<div class="bloco folha-papel"><h3>Conservação</h3><ul>{#each r.conservacao as s}<li>{s}</li>{/each}</ul></div>{/if}
        {#if ex.secoes.variacoes && r.variacoes.length}<div class="bloco folha-papel"><h3>Variações</h3><ul>{#each r.variacoes as s}<li>{s}</li>{/each}</ul></div>{/if}
      </section>
    {/if}

    {#if ex.secoes.nutricao && (r.dieta.length || r.alergenos.length || r.nutricao.length || r.equipamentos.length)}
      <section class="saude bloco folha-papel">
        {#if r.equipamentos.length}<p><strong>Utensílios:</strong> {r.equipamentos.join(', ')}</p>{/if}
        {#if r.dieta.length}<p><strong>Dieta:</strong> {r.dieta.join(', ')}</p>{/if}
        {#if r.alergenos.length}<p><strong>Contém:</strong> {r.alergenos.join(', ')}</p>{/if}
        {#if r.nutricao.length}<p><strong>Por porção:</strong> {r.nutricao.map((n) => `${n.nome} ${n.valor}`).join(' · ')}</p>{/if}
        {#if r.dieta.length || r.alergenos.length || r.nutricao.length}<p class="credito">Estimado pela IA a partir da receita — confira os rótulos.</p>{/if}
      </section>
    {/if}

    <section class="bloco folha-papel ilus">
      <div class="cab"><h3>Ilustrações a giz</h3>
        <button class="botao leve" onclick={() => (fazendoIlus = true)}><Icone nome="imagem" tamanho={18} /> {ilus?.recortes?.length ? 'Refazer' : 'Criar'}</button></div>
      {#if ilus?.recortes?.length}<Prateleira itens={ilus.recortes} tamanho={56} />
      {:else}<p class="meta">Desenhos dos ingredientes que aparecem no Modo Mão na Massa, passo a passo.</p>{/if}
    </section>

    <section id="notas" class="pessoal bloco folha-papel">
      <h3>Minhas anotações</h3>
      <div class="status" role="group" aria-label="Situação">
        {#each ['quero fazer', 'já fiz'] as s}
          <button class="botao leve" aria-pressed={reg.pessoal?.status === s} onclick={() => atualizarPessoal(id, { status: s })}>{primeiraMaiuscula(s)}</button>
        {/each}
      </div>
      <label class="campo"><span class="visualmente-oculto">Anotações</span>
        <textarea class="entrada notas" bind:value={anotacoes} onblur={salvarAnotacoes} placeholder="Ex.: usei limão-siciliano; dobrar o grão-de-bico"></textarea>
      </label>
      <p class="credito">Suas anotações não vão junto quando você compartilha.</p>
      <div class="organizar">
        <div class="org-linha">
          <span class="org-nome"><Icone nome="etiqueta" tamanho={18} /> Coleções</span>
          <span class="org-valor">{#each reg.pessoal?.colecoes ?? [] as c}<span class="pilula">{c}</span>{:else}<span class="meta">nenhuma</span>{/each}</span>
          <button class="botao leve" onclick={() => (escolhendoColecoes = true)}>{reg.pessoal?.colecoes?.length ? 'Mudar' : 'Adicionar'}</button>
        </div>
        <div class="org-linha">
          <span class="org-nome"><Icone nome="calendario" tamanho={18} /> Cardápio</span>
          <span class="org-valor">{#if diasNoCardapio.length}{diasNoCardapio.join(', ')}{:else}<span class="meta">fora da semana</span>{/if}</span>
          <button class="botao leve" onclick={() => (escolhendoDias = true)}>{diasNoCardapio.length ? 'Mudar' : 'Adicionar'}</button>
        </div>
      </div>
    </section>

    <footer class="rodape">
      <p class="credito">
        {#if r.fonte?.url || r.fonte?.site}Receita original{r.tituloOriginal ? `: “${r.tituloOriginal}”` : ''}{r.fonte.site ? ` — ${r.fonte.site}` : ''}{r.fonte.autor ? `, ${r.fonte.autor}` : ''}.
          {#if r.fonte.url}<a href={r.fonte.url} target="_blank" rel="noopener">Ver original</a>{:else}[sem link original]{/if}
          {#if r.fonte.video} · <a href={r.fonte.video} target="_blank" rel="noopener">Vídeo</a>{/if}
        {:else}[sem link original]{/if}
        A imagem exibida é própria do Pratoria.
      </p>
      {#if r.historicoCompartilhamento?.length}<p class="credito">Passou por: {r.historicoCompartilhamento.map((h) => h.replace(/\s+\S+$/, '')).join(' → ')}</p>{/if}
      {#if reg.original}<p class="credito">Editada por você{reg.editadaEm ? ` em ${new Date(reg.editadaEm).toLocaleDateString('pt-BR')}` : ''}. A versão original está guardada.</p>{/if}
      <p class="credito">{r.usuario ? `Caderno de ${r.usuario}` : ''}{r.geradoPor ? ` · organizada por ${r.geradoPor}` : ''} · {id}</p>
      <div class="linha">
        <a class="botao leve" href={`#/editar/${id}`}><Icone nome="editar" /> Editar receita</a>
        <button class="botao leve" onclick={() => (trocandoImagem = true)}><Icone nome="imagem" /> {app.imagens[id] ? 'Trocar foto' : 'Adicionar foto'}</button>
        {#if app.imagens[id]}<button class="botao leve" onclick={baixarFoto}><Icone nome="download" /> Baixar foto</button>{/if}
        <button class="botao leve perigo" onclick={() => (confirmarExclusao = true)}><Icone nome="lixeira" /> Remover</button>
      </div>
    </footer>
  </article>

  <div class="barra-acao">
    <a class="botao primario cozinhar" href={`#/receita/${id}/cozinhar`}><Icone nome="livro" tamanho={26} /><span><strong>Cozinhar</strong></span></a>
    <button class="botao leve quadrado" onclick={abrirCronometro} aria-label="Cronômetro"><Icone nome="cronometro" /></button>
    <button class="botao leve quadrado" onclick={() => (compartilhar = true)} aria-label="Compartilhar"><Icone nome="compartilhar" /></button>
  </div>

  <Compartilhar bind:aberta={compartilhar} registro={reg} />
  <Folha bind:aberta={ajustes} titulo="Ajustes de exibição">{#if ajustes}<AjustesExibicao bind:porcoes {base} />{/if}</Folha>
  <Folha bind:aberta={trocandoImagem} titulo="Foto do prato">
    {#if trocandoImagem}<EtapaImagem receita={r} aoSalvar={async (b) => { await trocarImagem(id, b); trocandoImagem = false; avisar('Foto atualizada'); }} />{/if}
  </Folha>
  <Folha bind:aberta={fazendoIlus} titulo="Ilustrações a giz">
    {#if fazendoIlus}<EtapaIlustracoes receita={r} {id} aoTerminar={() => { fazendoIlus = false; avisar('Ilustrações salvas'); }} />{/if}
  </Folha>
  <Folha bind:aberta={escolhendoColecoes} titulo="Coleções">{#if escolhendoColecoes}<EscolherColecoes {id} aoTerminar={() => (escolhendoColecoes = false)} />{/if}</Folha>
  <Folha bind:aberta={escolhendoDias} titulo="Cardápio da semana">{#if escolhendoDias}<EscolherDias {id} aoTerminar={() => (escolhendoDias = false)} />{/if}</Folha>
  <Folha bind:aberta={confirmarExclusao} titulo="Remover receita?">
    <p>“{r.titulo}” sai do seu caderno neste aparelho.</p>
    <div class="linha fim">
      <button class="botao leve" onclick={() => (confirmarExclusao = false)}>Cancelar</button>
      <button class="botao primario" onclick={apagar}>Remover</button>
    </div>
  </Folha>

  {#if cozinhando}
    <Livro registro={reg} aoSair={() => ir(`/receita/${id}`, { substituir: true })} />
  {/if}
{/if}

<style>
  .vazio { padding: 3rem 1rem; text-align: center; }
  .topo {
    position: sticky; top: 0; z-index: 20; display: flex; justify-content: space-between; align-items: center;
    padding: calc(env(safe-area-inset-top) + .25rem) max(.5rem, env(safe-area-inset-right)) .25rem max(.25rem, env(safe-area-inset-left));
    background: color-mix(in srgb, var(--papel) 94%, transparent); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px solid color-mix(in srgb, var(--linha) 60%, transparent);
  }
  .esq, .dir { display: flex; align-items: center; gap: .1rem; }
  .dir [aria-pressed='true'] { color: var(--terracota); }
  .dir [aria-pressed='true'] :global(path) { fill: currentColor; }

  .receita { width: min(100% - 2rem, 72rem); margin-inline: auto; padding: .75rem 0 7.5rem; }
  h1 { font-size: var(--t-h1); margin: .15rem 0 .75rem; }
  .foto { margin: 0; }
  .moldura { position: relative; aspect-ratio: 16 / 10; max-height: 36dvh; margin-inline: auto; background: radial-gradient(ellipse at 50% 60%, var(--papel-kraft), transparent 70%); border-radius: var(--raio-m); }
  .prat-foto { position: absolute; right: .25rem; bottom: .25rem; }
  figcaption { margin-top: .35rem; text-align: right; }
  .info { list-style: none; padding: 0; margin: 1rem 0 .5rem; display: flex; flex-wrap: wrap; gap: .4rem; }
  .alerta :global(svg) { flex: none; margin-top: .15rem; }
  .alerta { display: flex; gap: .5rem; align-items: flex-start; padding: .7rem .9rem; border-radius: var(--raio-m);
    background: color-mix(in srgb, var(--mostarda) 16%, var(--papel-folha)); border: 1px solid color-mix(in srgb, var(--mostarda) 45%, transparent); margin: .5rem 0; }
  .descricao { color: var(--tinta-suave); }
  .acoes-desktop { display: none; }
  .organizar { display: grid; gap: .25rem; border-top: 1px dashed var(--linha); padding-top: .6rem; }
  .org-linha { display: grid; grid-template-columns: auto 1fr auto; gap: .6rem; align-items: center; min-height: 48px; }
  .org-nome { display: inline-flex; gap: .35rem; align-items: center; font-weight: 700; color: var(--tinta-suave); font-size: .92rem; }
  .org-valor { display: flex; flex-wrap: wrap; gap: .3rem; font-size: .92rem; min-width: 0; }
  .org-valor .pilula { font-size: .8rem; padding: .15rem .55rem; }
  .lista { margin-top: .25rem; }
  .lista[aria-pressed='true'] { border-color: var(--oliva); color: var(--oliva); }

  .indice { position: sticky; top: calc(env(safe-area-inset-top) + 57px); z-index: 15; display: flex; align-items: center; gap: 1.1rem; margin: 1.25rem -1rem 0; padding: 0 1rem;
    background: var(--papel); border-bottom: 1px dashed var(--linha); overflow-x: auto; scrollbar-width: none; }
  .indice a { flex: none; padding: .75rem 0; font-weight: 700; font-size: .95rem; color: var(--tinta-suave); text-decoration: none; }
  .indice a:hover { color: var(--tinta); }
  .aa + .aa { margin-left: .35rem; }
  .ouvir { display: grid; place-items: center; color: var(--terracota-forte); }
  .aa { margin-left: auto; flex: none; width: 44px; height: 36px; border: 1.5px solid var(--linha); border-radius: 999px; background: var(--papel-folha); font-family: var(--fonte-titulo); font-weight: 700; cursor: pointer; }

  .corpo { display: grid; gap: .9rem; margin-top: 1rem; }
  .compras { margin-top: 1rem; }
  .compras summary { list-style: none; cursor: pointer; display: flex; justify-content: space-between; align-items: baseline; gap: .5rem; flex-wrap: wrap; }
  .compras summary::-webkit-details-marker { display: none; }
  .compras summary h2::after { content: ' ⌄'; color: var(--tinta-fraca); font-size: .8em; }
  .compras:not([open]) summary h2::after { content: ' ›'; }
  .lista-compras { list-style: none; margin: .6rem 0 0; padding: 0; columns: 2 12rem; column-gap: 1.5rem; }
  .lista-compras li { break-inside: avoid; display: flex; justify-content: space-between; gap: .5rem; padding: .35rem 0; border-bottom: 1px dashed var(--linha); }
  .lista-compras small { color: var(--tinta-suave); text-align: right; }
  section, .receita [id] { scroll-margin-top: 130px; }
  .bloco { padding: 1rem 1.1rem; }
  .bloco h2 { font-size: 1.45rem; }
  .bloco h3 { font-size: 1.15rem; margin: 1rem 0 .4rem; display: flex; gap: .5rem; align-items: baseline; }
  .cab { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
  .cab h3 { margin: 0; }
  .porcoes { display: inline-flex; align-items: center; border: 1.5px solid var(--linha); border-radius: 999px; background: var(--papel); }
  .porcoes button { width: 44px; height: 40px; border: 0; background: transparent; font-size: 1.2rem; cursor: pointer; }
  .porcoes output { min-width: 1.5rem; text-align: center; font-weight: 700; }
  .nota { font-family: var(--fonte-titulo); font-size: 1.05em; line-height: 1.5; border-left: 4px solid var(--mostarda); padding: .1rem 0 .1rem .9rem; margin: .5rem 0; }
  .ingredientes { list-style: none; padding: 0; margin: 0; }
  .ingredientes li { padding: .6rem 0 .6rem 1.4rem; border-bottom: 1px dashed var(--linha); position: relative; }
  .ingredientes li:last-child { border-bottom: 0; }
  .ingredientes li::before { content: ''; position: absolute; left: .2rem; top: 1.05rem; width: 8px; height: 8px; border-radius: 50%; border: 2px solid var(--mostarda); }
  .passos { counter-reset: p; list-style: none; padding: 0; margin: .5rem 0 0; display: grid; gap: .9rem; }
  .passos li { counter-increment: p; position: relative; padding-left: 2.6rem; }
  .passos li::before { content: counter(p); position: absolute; left: 0; top: -.1rem; width: 1.9rem; height: 1.9rem; display: grid; place-items: center; border-radius: 50%; background: var(--papel-kraft); font-family: var(--fonte-titulo); font-weight: 700; }
  .dicas { margin-top: 1rem; padding-top: .75rem; border-top: 1px dashed var(--linha); }
  .dicas ul { margin: .3rem 0 0; padding-left: 1.2rem; }
  .extras { margin-top: .9rem; display: grid; gap: .9rem; }
  .extras ul { margin: 0; padding-left: 1.2rem; display: grid; gap: .35rem; }
  .saude, .pessoal, .ilus { margin-top: .9rem; display: grid; gap: .5rem; }
  .saude p { margin: 0; }
  .status { display: flex; gap: .5rem; }
  .status [aria-pressed='true'] { background: var(--oliva); border-color: var(--oliva); color: #fff; }
  .notas { font-family: var(--fonte-texto); font-size: 1rem; min-height: 6rem; }
  .rodape { margin: 2rem 0 1rem; display: grid; gap: .5rem; }
  .rodape p { margin: 0; }
  .linha { display: flex; gap: .5rem; flex-wrap: wrap; }
  .fim { justify-content: flex-end; margin-top: 1rem; }
  .perigo { color: var(--erro); }

  .barra-acao { position: fixed; left: 0; right: 0; bottom: 0; z-index: 25; display: grid; grid-template-columns: 1fr 56px 56px; gap: .6rem;
    padding: .6rem 1rem calc(.6rem + env(safe-area-inset-bottom)); background: var(--papel-folha); border-top: 1px solid var(--linha); }
  .cozinhar { justify-content: flex-start; gap: .8rem; min-height: 60px; text-align: left; }
  .cozinhar span { display: grid; line-height: 1.2; }
  .cozinhar strong { font-size: 1.1rem; }
  .cozinhar small { font-weight: 400; opacity: .9; }
  .quadrado { min-height: 60px; padding: 0; }

  @media (min-width: 56rem) {
    .corpo { grid-template-columns: minmax(16rem, 2fr) 3fr; align-items: start; }
    #ingredientes { position: sticky; top: 7rem; }
    .extras { grid-template-columns: 1fr 1fr; }
  }
  @media (min-width: 64rem) {
    .topo, .barra-acao { display: none; }
    .receita { padding-top: 2rem; padding-bottom: 3rem; }
    .abertura { display: grid; grid-template-columns: 1.1fr 1fr; grid-template-areas: 'titulo titulo' 'foto lado'; gap: 0 2.5rem; align-items: start; }
    .titulo { grid-area: titulo; } .foto { grid-area: foto; } .lado { grid-area: lado; }
    .moldura { aspect-ratio: 4 / 3; max-height: none; }
    .info { margin-top: 0; }
    .acoes-par { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
    .acoes-par .botao { white-space: nowrap; padding-inline: .8rem; }
    .acoes-desktop { display: grid; gap: .6rem; max-width: 27rem; margin: 1rem 0 .5rem; }
    .indice { top: 0; }
  }
  @media print {
    .topo, .barra-acao, .indice, .pessoal, .ilus, .rodape .linha, .lista, :global(.nav), :global(.pilha) { display: none !important; }
    :global(main) { margin: 0 !important; padding: 0 !important; }
    .folha-papel { box-shadow: none; border-color: #ccc; break-inside: avoid; }
  }
</style>
