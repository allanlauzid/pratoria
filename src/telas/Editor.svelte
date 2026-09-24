<script>
  // Formulário guiado, SEM IA: escrever uma receita nova ou editar uma do caderno.
  // Mesma estrutura do Pratoria: lista de compras → etapas de preparo (ingredientes + passos) → extras.
  // Campos vão aparecendo conforme você preenche; o que ficar vazio é ignorado.
  // Edição: a 1ª vez guarda o original (dá para restaurar). Aparelho + nuvem. Rascunho: só no aparelho.
  import Topo from '../componentes/Topo.svelte';
  import Icone from '../componentes/Icone.svelte';
  import Folha from '../componentes/Folha.svelte';
  import { app, banco, salvarNoCaderno, salvarEdicao, restaurarOriginal } from '../lib/caderno.svelte.js';
  import { ir } from '../lib/rota.svelte.js';
  import { avisar } from '../lib/avisos.svelte.js';
  import { formularioDaReceita, receitaDoFormulario, corDoPasso, dividirPasso, ingredientesDasCompras, novaEtapa, linhaCompra, linhaIngrediente, LIMITE_PASSO } from '../core/editor.js';
  import { UNIDADES } from '../core/formato/texto-livre.js';
  import { temTempo } from '../core/tempos.js';
  import { isoLocal } from '../core/id.js';
  import { CATEGORIAS, DIFICULDADES, SECOES_MERCADO } from '../core/import/listas.js';
  import { untrack, tick } from 'svelte';

  let { id = null } = $props();
  const reg = $derived(id ? app.receitas.find((x) => x.id === id) : null);
  const inicial = untrack(() => id);            // a tela é recriada ({#key}) quando o id muda
  const CHAVE = `editor:${inicial ?? 'novo'}`;

  let f = $state(formularioDaReceita(inicial ? app.receitas.find((x) => x.id === inicial)?.dados : null));
  let carregado = $state(false);
  let tentouSalvar = $state(false);
  let salvando = $state(false);
  let confirmarRestaurar = $state(false);
  let mudou = $state(false);

  $effect(() => {
    banco().obterRascunho(CHAVE).then((d) => {
      if (d?.formulario?.etapas) { f = d.formulario; mudou = true; avisar('Rascunho recuperado', { acao: { rotulo: 'Descartar', fazer: descartarRascunho } }); }
      carregado = true;
    });
  });
  $effect(() => { const copia = $state.snapshot(f); if (carregado && mudou) banco().salvarRascunho(CHAVE, { formulario: copia }); });
  const marcar = () => (mudou = true);

  const saida = $derived(receitaDoFormulario($state.snapshot(f), reg ? $state.snapshot(reg.dados) : null, { usuario: app.perfil.nome || 'sem nome', agora: isoLocal(new Date()) }));
  const erros = $derived(saida.resultado.erros);

  // ---- linhas que vão aparecendo ----
  const vazia = (o) => (typeof o === 'string' ? !o.trim() : Object.values(o).every((v) => !String(v ?? '').trim()));
  function crescer(lista, fabrica) { if (!lista.length || !vazia(lista.at(-1))) lista.push(fabrica()); }
  function enxugar(lista, i) { if (i < lista.length - 1 && vazia(lista[i])) lista.splice(i, 1); }
  const tirar = (lista, i) => { lista.splice(i, 1); marcar(); };

  function descartarRascunho() { banco().apagarRascunho(CHAVE); f = formularioDaReceita(reg?.dados ?? null); mudou = false; }
  function quantasEtapas(n) {
    while (f.etapas.length < n) f.etapas.push(novaEtapa());
    while (f.etapas.length > n && f.etapas.length > 1 && !f.etapas.at(-1).passos.some((p) => p.trim()) && !f.etapas.at(-1).ingredientes.some((i) => i.item.trim())) f.etapas.pop();
    marcar();
  }
  function igualCompras(e, sim) {
    e.perguntouIgual = true;
    if (sim) { e.ingredientes = ingredientesDasCompras(f.compras); avisar('Copiados. Agora ajuste as quantidades usadas na receita.'); }
    marcar();
  }
  async function dividir(e, k) {
    const [a, b] = dividirPasso(e.passos[k]);
    if (!b) { avisar('Não achei onde dividir. Separe em duas frases.'); return; }
    e.passos.splice(k, 1, a, b); crescer(e.passos, () => ''); marcar();
    await tick(); document.getElementById(`passo-${f.etapas.indexOf(e)}-${k + 1}`)?.focus();
  }
  function subir(i) { if (i > 0) { const [p] = f.etapas.splice(i, 1); f.etapas.splice(i - 1, 0, p); marcar(); } }

  async function salvar() {
    tentouSalvar = true;
    if (!saida.resultado.valido) { await tick(); document.querySelector('.erros')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    salvando = true;
    try {
      let destino = id;
      if (reg) await salvarEdicao(id, saida.resultado.receita, saida.texto);
      else destino = (await salvarNoCaderno(saida.resultado.receita, { texto: saida.texto })).id;
      await banco().apagarRascunho(CHAVE);
      mudou = false;
      avisar(reg ? 'Receita atualizada' : 'Receita salva no caderno');
      ir(`/receita/${destino}`, { substituir: true });
    } catch (e) { console.error(e); avisar('Não consegui salvar. Tente de novo.'); }
    salvando = false;
  }
  async function restaurar() {
    await restaurarOriginal(id); await banco().apagarRascunho(CHAVE);
    confirmarRestaurar = false; mudou = false;
    avisar('Versão original restaurada');
    ir(`/receita/${id}`, { substituir: true });
  }
  const temCompras = $derived(f.compras.some((c) => c.item.trim()));
  const MENSAGEM = {
    amarelo: 'Passo longo. No Modo Cozinhar ele ocupa boa parte da página: em celulares pequenos a letra pode ficar menor ou o texto pode precisar rolar, e fica mais difícil achar onde parou com as mãos ocupadas. Se der, divida em dois.',
    vermelho: `Longo demais para o Modo Cozinhar (mais de ${LIMITE_PASSO.amarelo} caracteres). Divida em mais de um campo`,
  };
</script>

<Topo voltarPara={id ? `/receita/${id}` : '/'} titulo={id ? 'Editar receita' : 'Preencher receita'} />

<div class="tela" oninput={marcar}>
  <header>
    <p class="rotulo">{id ? 'Editar' : 'Formulário, sem IA'}</p>
    <h1>{id ? (reg?.dados.titulo ?? 'Receita') : 'Sua receita, passo a passo'}</h1>
  </header>

  {#if !reg && id}
    <p>Receita não encontrada. <a href="#/">Voltar ao caderno</a></p>
  {:else}
  {#if !id}
    <section class="guia folha-papel">
      <h2>Como a receita fica organizada</h2>
      <ol>
        <li><strong>Lista de compras:</strong> o que precisa comprar, com a quantidade de mercado (ex.: 1 lata).</li>
        <li><strong>Etapas de preparo:</strong> uma receita pode ter mais de uma. Ex.: a salada de sardinha tem “Grão-de-bico” (cozinhar o grão) e “Salada” (montar). Cada etapa tem os <em>seus</em> ingredientes e os <em>seus</em> passos.</li>
        <li><strong>Passos curtos:</strong> um trecho por campo. É assim que eles cabem bonitos no Modo Cozinhar.</li>
      </ol>
      <div class="quantas" role="group" aria-label="Quantas etapas de preparo">
        <span>Quantas etapas de preparo?</span>
        {#each [1, 2, 3, 4] as n}<button class="chip" aria-pressed={f.etapas.length === n} onclick={() => quantasEtapas(n)}>{n}</button>{/each}
      </div>
      <p class="ia"><Icone nome="mensagem" tamanho={18} /> Receita longa ou bagunçada? <a href="#/importar?modo=escrever">Escreva do seu jeito e deixe o ChatGPT organizar</a>. Ele confere o que falta e monta tudo neste formato.</p>
    </section>
  {/if}

  <section class="folha-papel bloco">
    <h2>O básico</h2>
    <label class="campo"><span>Nome da receita *</span>
      <input class="entrada" bind:value={f.titulo} placeholder="Ex.: Bolo de fubá da vó" aria-invalid={tentouSalvar && !f.titulo.trim()} /></label>
    <label class="campo"><span>Descrição curta</span><input class="entrada" bind:value={f.descricao} placeholder="Uma frase sobre o prato" /></label>
    <div class="dupla">
      <label class="campo"><span>Categoria</span>
        <input class="entrada" bind:value={f.categoria} list="categorias" placeholder="Escolha ou escreva" />
        <datalist id="categorias">{#each CATEGORIAS as c}<option value={c}></option>{/each}</datalist></label>
      <label class="campo"><span>Serve (porções)</span><input class="entrada" bind:value={f.porcoes} inputmode="numeric" placeholder="4" /></label>
    </div>
    <div class="tripla">
      <label class="campo"><span>Preparo (min)</span><input class="entrada" bind:value={f.tempoPreparo} inputmode="numeric" placeholder="20" /></label>
      <label class="campo"><span>Cozimento (min)</span><input class="entrada" bind:value={f.tempoCozimento} inputmode="numeric" placeholder="40" /></label>
      <label class="campo"><span>Espera (min)</span><input class="entrada" bind:value={f.tempoEspera} placeholder="—" /></label>
    </div>
    <div class="campo"><span>Dificuldade</span>
      <div class="seg" role="radiogroup" aria-label="Dificuldade">
        {#each DIFICULDADES as d}<button type="button" role="radio" aria-checked={f.dificuldade === d} onclick={() => { f.dificuldade = f.dificuldade === d ? '' : d; marcar(); }}>{d}</button>{/each}
      </div>
    </div>
    <label class="campo"><span>Forno</span><input class="entrada" bind:value={f.temperaturaForno} placeholder="Ex.: 180 °C (deixe vazio se não usa)" /></label>
  </section>

  <section class="folha-papel bloco">
    <h2><Icone nome="carrinho" /> Lista de compras</h2>
    <p class="meta">Um item por campo. Ao começar a escrever, aparece o próximo.</p>
    <datalist id="secoes">{#each SECOES_MERCADO as s}<option value={s}></option>{/each}</datalist>
    <ul class="linhas">
      {#each f.compras as c, i (i)}
        <li class="compra" class:vazia={vazia(c)}>
          <input class="entrada item" bind:value={c.item} placeholder={i === 0 ? 'Ex.: grão-de-bico seco' : 'Próximo item'} aria-label={`Item ${i + 1}`}
            oninput={() => crescer(f.compras, linhaCompra)} onblur={() => enxugar(f.compras, i)} />
          <input class="entrada qtd" bind:value={c.quantidade} placeholder="1 pacote" aria-label={`Quantidade do item ${i + 1}`} oninput={() => crescer(f.compras, linhaCompra)} />
          <input class="entrada secao" bind:value={c.secao} list="secoes" placeholder="seção" aria-label={`Seção do mercado do item ${i + 1}`} />
          {#if !vazia(c)}<button class="x" onclick={() => tirar(f.compras, i)} aria-label={`Tirar ${c.item || 'item'}`}><Icone nome="fechar" tamanho={16} /></button>{/if}
        </li>
      {/each}
    </ul>
  </section>

  <datalist id="unidades">{#each UNIDADES.filter((u, k, l) => l.indexOf(u) === k) as u}<option value={u}></option>{/each}</datalist>

  {#each f.etapas as e, i (i)}
    <section class="folha-papel bloco etapa">
      <div class="cab">
        <h2><span class="num">{i + 1}</span> {f.etapas.length > 1 ? (e.nome.trim() || `Etapa ${i + 1}`) : 'Preparo'}</h2>
        {#if f.etapas.length > 1}
          <div class="acoes-etapa">
            {#if i > 0}<button type="button" class="botao-icone" onclick={() => subir(i)} aria-label={`Subir etapa ${i + 1}`}>↑</button>{/if}
            <button type="button" class="botao-icone" onclick={() => tirar(f.etapas, i)} aria-label={`Remover etapa ${i + 1}`}><Icone nome="lixeira" /></button>
          </div>
        {/if}
      </div>
      {#if f.etapas.length > 1}
        <label class="campo"><span>Nome da etapa</span><input class="entrada" bind:value={e.nome} placeholder="Ex.: Massa, Recheio, Grão-de-bico" /></label>
      {/if}

      <h3>Ingredientes {f.etapas.length > 1 ? 'desta etapa' : ''}</h3>
      {#if !e.perguntouIgual && temCompras && !e.ingredientes.some((x) => x.item.trim())}
        <div class="pergunta">
          <p>Os ingredientes {f.etapas.length > 1 ? 'desta etapa' : ''} são os mesmos da lista de compras?</p>
          <div class="linha">
            <button class="botao escuro" onclick={() => igualCompras(e, true)}>Sim, copiar</button>
            <button class="botao leve" onclick={() => igualCompras(e, false)}>Não, vou escrever</button>
          </div>
          <small class="meta">Copiando, você só ajusta as quantidades usadas na receita (ex.: “1 lata” vira “100 g”).</small>
        </div>
      {:else}
        <ul class="linhas">
          {#each e.ingredientes as g, k (k)}
            <li class="ingrediente" class:vazia={vazia(g)}>
              <input class="entrada item" bind:value={g.item} placeholder={k === 0 ? 'Ingrediente (ex.: tomate)' : 'Próximo ingrediente'} aria-label={`Ingrediente ${k + 1}`}
                oninput={() => crescer(e.ingredientes, linhaIngrediente)} onblur={() => enxugar(e.ingredientes, k)} />
              <input class="entrada qtd" bind:value={g.quantidade} inputmode="decimal" placeholder="qtd" aria-label={`Quantidade de ${g.item || 'ingrediente'}`} oninput={() => crescer(e.ingredientes, linhaIngrediente)} />
              <input class="entrada unid" bind:value={g.unidade} list="unidades" placeholder="unidade" aria-label={`Unidade de ${g.item || 'ingrediente'}`} />
              <input class="entrada obs" bind:value={g.obs} placeholder="picado, a gosto…" aria-label={`Observação de ${g.item || 'ingrediente'}`} />
              {#if !vazia(g)}<button class="x" onclick={() => tirar(e.ingredientes, k)} aria-label={`Tirar ${g.item || 'ingrediente'}`}><Icone nome="fechar" tamanho={16} /></button>{/if}
            </li>
          {/each}
        </ul>
        <p class="credito">A quantidade é a que muda quando você ajusta as porções. Use números e frações: 1, 1/2, 1 1/2, 1 a 2.</p>
      {/if}

      <h3>Modo de preparo</h3>
      <p class="meta dica-passo">Um trecho por campo: uma ação, até 2 frases curtas. <span class="leg verde">até {LIMITE_PASSO.verde}</span> <span class="leg amarelo">até {LIMITE_PASSO.amarelo}</span> <span class="leg vermelho">mais que isso</span></p>
      <ol class="passos">
        {#each e.passos as p, k (k)}
          {@const cor = corDoPasso(p)}
          {@const n = p.trim().length}
          <li class="passo" data-cor={p.trim() ? cor : 'vazio'}>
            <span class="n">{k + 1}</span>
            <div class="caixa">
              <textarea id={`passo-${i}-${k}`} class="entrada texto" rows="2" bind:value={e.passos[k]} placeholder={k === 0 ? 'Ex.: Lave o grão-de-bico.' : 'Próximo passo'}
                aria-invalid={cor === 'vermelho'} aria-describedby={`msg-${i}-${k}`}
                oninput={() => crescer(e.passos, () => '')} onblur={() => enxugar(e.passos, k)}></textarea>
              {#if n}<span class="contador" aria-hidden="true">{n}</span>{/if}
              {#if n && cor !== 'verde'}
                <p class="msg" id={`msg-${i}-${k}`} role={cor === 'vermelho' ? 'alert' : undefined}>
                  {#if cor === 'amarelo'}{MENSAGEM.amarelo}{:else}{MENSAGEM.vermelho}, ou <a href="#/importar?modo=escrever">use o modo com ChatGPT</a> para organizar melhor.{/if}
                  <button class="link" onclick={() => dividir(e, k)}>Dividir em dois</button>
                </p>
              {/if}
            </div>
          </li>
        {/each}
      </ol>
      {#if e.passos.some(temTempo)}<p class="credito"><Icone nome="cronometro" tamanho={14} /> Os tempos dos passos viram cronômetros no Modo Cozinhar.</p>{/if}

      <details class="mais">
        <summary>Dicas e observação {f.etapas.length > 1 ? 'desta etapa' : ''}</summary>
        <ul class="linhas">
          {#each e.dicas as d, k (k)}
            <li><input class="entrada" bind:value={e.dicas[k]} placeholder="Uma dica" oninput={() => crescer(e.dicas, () => '')} onblur={() => enxugar(e.dicas, k)} aria-label={`Dica ${k + 1}`} /></li>
          {/each}
        </ul>
        <label class="campo"><span>Observação (ex.: em que ordem os ingredientes entram)</span><input class="entrada" bind:value={e.nota} /></label>
      </details>
    </section>
  {/each}
  <button type="button" class="botao leve bloco" onclick={() => { f.etapas.push(novaEtapa()); marcar(); }}><Icone nome="mais" /> Adicionar etapa de preparo (massa, recheio, cobertura…)</button>

  <details class="folha-papel bloco dobra">
    <summary><h2>Extras</h2><span class="meta">Servir, guardar, variações, utensílios, dieta</span></summary>
    <label class="campo"><span>Como servir <small>(uma por linha)</small></span><textarea class="entrada texto" bind:value={f.servir} rows="2"></textarea></label>
    <label class="campo"><span>Conservação</span><textarea class="entrada texto" bind:value={f.conservacao} rows="2"></textarea></label>
    <label class="campo"><span>Variações</span><textarea class="entrada texto" bind:value={f.variacoes} rows="2"></textarea></label>
    <label class="campo"><span>Utensílios <small>(separados por vírgula)</small></span><input class="entrada" bind:value={f.equipamentos} placeholder="forma de 22 cm, batedeira" /></label>
    <label class="campo"><span>Dieta</span><input class="entrada" bind:value={f.dieta} placeholder="vegetariana, sem glúten…" /></label>
    <label class="campo"><span>Etiquetas</span><input class="entrada" bind:value={f.tags} placeholder="rápida, festa…" /></label>
  </details>

  <details class="folha-papel bloco dobra">
    <summary><h2>De onde veio</h2><span class="meta">Crédito discreto na receita (opcional)</span></summary>
    <label class="campo"><span>Site, livro ou pessoa</span><input class="entrada" bind:value={f.fonteSite} placeholder="Ex.: Caderno da vó Lurdes" /></label>
    <label class="campo"><span>Autor</span><input class="entrada" bind:value={f.fonteAutor} /></label>
    <label class="campo"><span>Link original</span><input class="entrada" type="url" inputmode="url" bind:value={f.fonteUrl} placeholder="Deixe vazio se não tem" /></label>
  </details>

  {#if tentouSalvar && erros.length}
    <div class="erros" role="alert"><Icone nome="alerta" /><div><strong>Falta pouco:</strong><ul>{#each erros as e}<li>{e.replace(/Nenhuma preparação encontrada.*/, 'Escreva pelo menos um passo.')}</li>{/each}</ul></div></div>
  {/if}
  {#if reg?.original}
    <p class="credito restaurar">Editada em {new Date(reg.editadaEm).toLocaleDateString('pt-BR')}. <button class="link" onclick={() => (confirmarRestaurar = true)}>Voltar para a versão original</button></p>
  {/if}
  {/if}
</div>

<div class="barra-salvar">
  <a class="botao leve" href={id ? `#/receita/${id}` : '#/'} onclick={() => mudou && banco().apagarRascunho(CHAVE)}>Cancelar</a>
  <button class="botao primario" onclick={salvar} disabled={salvando}><Icone nome="check" /> {reg ? 'Salvar alterações' : 'Salvar no caderno'}</button>
</div>

<Folha bind:aberta={confirmarRestaurar} titulo="Voltar para a original?">
  <p>As suas alterações nesta receita serão descartadas. Anotações, favorita, coleções e fotos continuam.</p>
  <div class="fim">
    <button class="botao leve" onclick={() => (confirmarRestaurar = false)}>Cancelar</button>
    <button class="botao primario" onclick={restaurar}>Restaurar original</button>
  </div>
</Folha>

<style>
  .tela { width: min(100% - 2rem, 44rem); margin-inline: auto; padding: 1rem 0 6rem; display: grid; gap: 1rem; }
  header { display: grid; gap: .25rem; }
  header p { margin: 0; }
  h1 { font-size: var(--t-h2); }
  h2 { font-size: 1.25rem; display: flex; align-items: center; gap: .5rem; }
  h3 { font-size: 1rem; font-family: var(--fonte-texto); margin: .4rem 0 0; color: var(--tinta-suave); text-transform: uppercase; letter-spacing: .06em; font-size: .78rem; }
  .bloco { padding: 1.1rem; display: grid; gap: .75rem; }
  .bloco > p { margin: 0; }
  .guia { padding: 1.1rem 1.1rem 1rem; border-left: 4px solid var(--mostarda); display: grid; gap: .6rem; }
  .guia ol { margin: 0; padding-left: 1.2rem; display: grid; gap: .45rem; }
  .guia p { margin: 0; }
  .quantas { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; font-weight: 700; }
  .quantas span { margin-right: .25rem; }
  .chip { min-width: 44px; min-height: 44px; border-radius: 999px; border: 1.5px solid var(--linha); background: var(--papel-folha); font-weight: 800; cursor: pointer; }
  .chip[aria-pressed='true'] { background: var(--tinta); color: var(--papel-folha); border-color: var(--tinta); }
  .ia { display: flex; gap: .45rem; align-items: flex-start; font-size: .92rem; color: var(--tinta-suave); }
  .dupla { display: grid; grid-template-columns: 1fr 8rem; gap: .6rem; }
  .tripla { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5rem; }
  .tripla .campo span { font-size: .78rem; }
  .campo span small { font-weight: 400; }
  .seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 4px; border-radius: var(--raio-m); background: var(--papel-kraft); }
  .seg button { min-height: 44px; border: 0; border-radius: 10px; background: transparent; font-weight: 700; color: var(--tinta-suave); cursor: pointer; text-transform: capitalize; }
  .seg button[aria-checked='true'] { background: var(--papel-folha); color: var(--tinta); box-shadow: var(--sombra-baixa); }
  .num { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--terracota-forte); color: #fff; font-size: .9rem; font-family: var(--fonte-texto); }
  .cab { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
  .acoes-etapa { display: flex; gap: .25rem; }

  .linhas { list-style: none; margin: 0; padding: 0; display: grid; gap: .45rem; }
  .compra { display: grid; grid-template-columns: 1fr 7rem 36px; grid-template-areas: 'item item x' 'qtd secao x'; gap: .35rem; align-items: center; }
  .ingrediente { display: grid; grid-template-columns: 4.5rem 7.5rem 1fr 36px; grid-template-areas: 'item item item x' 'qtd unid obs x'; gap: .35rem; align-items: center; }
  .compra, .ingrediente { padding-bottom: .45rem; border-bottom: 1px dashed var(--linha); }
  .vazia { opacity: .8; border-bottom-color: transparent; }
  .vazia .qtd, .vazia .unid, .vazia .obs, .vazia .secao { display: none; }
  .item { grid-area: item; } .qtd { grid-area: qtd; } .unid { grid-area: unid; } .obs { grid-area: obs; } .secao { grid-area: secao; }
  .compra .qtd { grid-column: 1; } .compra .secao { grid-column: 2; }
  .x { grid-area: x; width: 36px; height: 36px; border: 0; border-radius: 50%; background: transparent; color: var(--tinta-fraca); cursor: pointer; display: grid; place-items: center; }
  .x:hover { background: color-mix(in srgb, var(--linha) 45%, transparent); }
  @media (min-width: 40rem) {
    .compra { grid-template-columns: 1fr 9rem 11rem 36px; grid-template-areas: 'item qtd secao x'; }
    .compra .qtd, .compra .secao { grid-column: auto; }
    .ingrediente { grid-template-columns: 1.4fr 4.5rem 7.5rem 1fr 36px; grid-template-areas: 'item qtd unid obs x'; }
    .vazia .qtd, .vazia .unid, .vazia .obs, .vazia .secao { display: block; visibility: hidden; }
  }
  .pergunta { display: grid; gap: .5rem; padding: .8rem .9rem; border-radius: var(--raio-m); background: color-mix(in srgb, var(--mostarda) 12%, var(--papel-folha)); }
  .pergunta p { margin: 0; font-weight: 700; }
  .linha { display: flex; gap: .5rem; flex-wrap: wrap; }

  .dica-passo { display: flex; flex-wrap: wrap; gap: .35rem .6rem; align-items: center; }
  .leg { font-size: .75rem; font-weight: 800; padding: .05rem .5rem; border-radius: 999px; }
  .leg.verde { background: color-mix(in srgb, var(--oliva) 18%, transparent); color: var(--oliva); }
  .leg.amarelo { background: color-mix(in srgb, var(--mostarda) 22%, transparent); color: #7a5410; }
  .leg.vermelho { background: color-mix(in srgb, var(--erro) 14%, transparent); color: var(--erro); }
  .passos { list-style: none; margin: 0; padding: 0; display: grid; gap: .55rem; }
  .passo { display: grid; grid-template-columns: 30px 1fr; gap: .5rem; align-items: start; }
  .passo .n { display: grid; place-items: center; width: 30px; height: 30px; margin-top: .45rem; border-radius: 50%; background: var(--papel-kraft); font-weight: 800; font-family: var(--fonte-titulo); }
  .caixa { position: relative; display: grid; gap: .3rem; }
  textarea.texto { font-family: var(--fonte-texto); font-size: max(16px, 1rem); line-height: 1.45; min-height: 0; resize: vertical; padding-right: 3rem; }
  .contador { position: absolute; right: .6rem; top: .55rem; font-size: .75rem; font-weight: 800; font-variant-numeric: tabular-nums; padding: .05rem .45rem; border-radius: 999px; }
  [data-cor='verde'] textarea { border-color: color-mix(in srgb, var(--oliva) 55%, var(--linha)); }
  [data-cor='verde'] .contador { background: color-mix(in srgb, var(--oliva) 18%, transparent); color: var(--oliva); }
  [data-cor='amarelo'] textarea { border-color: var(--mostarda); box-shadow: 0 0 0 2px color-mix(in srgb, var(--mostarda) 25%, transparent); }
  [data-cor='amarelo'] .contador { background: color-mix(in srgb, var(--mostarda) 25%, transparent); color: #7a5410; }
  [data-cor='vermelho'] textarea { border-color: var(--erro); box-shadow: 0 0 0 2px color-mix(in srgb, var(--erro) 20%, transparent); }
  [data-cor='vermelho'] .contador { background: var(--erro); color: #fff; }
  .msg { margin: 0; font-size: .84rem; line-height: 1.4; padding: .5rem .65rem; border-radius: 10px; }
  [data-cor='amarelo'] .msg { background: color-mix(in srgb, var(--mostarda) 14%, var(--papel-folha)); color: #5e420c; }
  [data-cor='vermelho'] .msg { background: color-mix(in srgb, var(--erro) 9%, var(--papel-folha)); color: var(--erro); }
  .msg .link { margin-left: .35rem; font-weight: 800; }

  .mais summary { cursor: pointer; font-weight: 700; color: var(--tinta-suave); min-height: 44px; display: flex; align-items: center; }
  .mais[open] { display: grid; gap: .6rem; }
  .dobra summary { cursor: pointer; display: grid; gap: .1rem; list-style: none; }
  .dobra summary::-webkit-details-marker { display: none; }
  .dobra summary h2::after { content: ' ›'; color: var(--tinta-fraca); }
  .dobra[open] summary h2::after { content: ' ⌄'; }
  .erros { display: flex; gap: .6rem; padding: .9rem 1rem; border-radius: var(--raio-m); background: color-mix(in srgb, var(--erro) 10%, var(--papel-folha)); color: var(--erro); border: 1.5px solid color-mix(in srgb, var(--erro) 40%, transparent); }
  .erros ul { margin: .25rem 0 0; padding-left: 1.1rem; }
  .restaurar { text-align: center; }
  .link { border: 0; background: none; padding: 0; color: var(--terracota-forte); text-decoration: underline; cursor: pointer; font: inherit; }
  .barra-salvar { position: fixed; inset: auto 0 0 0; z-index: 35; display: grid; grid-template-columns: auto 1fr; gap: .6rem; padding: .7rem 1rem calc(.7rem + env(safe-area-inset-bottom));
    background: color-mix(in srgb, var(--papel-folha) 94%, transparent); backdrop-filter: blur(8px); border-top: 1px solid var(--linha); }
  .fim { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1rem; }
  @media (max-width: 22rem) { .tripla { grid-template-columns: 1fr 1fr; } .dupla { grid-template-columns: 1fr; } .ingrediente { grid-template-columns: 3.8rem 6rem 1fr 36px; } }
  @media (min-width: 64rem) { .tela { padding-top: 2.5rem; } .barra-salvar { left: 15rem; grid-template-columns: auto auto; justify-content: end; padding-inline: 2rem; } }
</style>
