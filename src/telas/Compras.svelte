<script>
  // Lista de compras geral: junta as receitas marcadas "na lista", soma itens iguais,
  // agrupa por seção do mercado e separa o que você costuma ter em casa.
  // Itens marcados ficam SÓ no aparelho.
  import Topo from '../componentes/Topo.svelte';
  import Icone from '../componentes/Icone.svelte';
  import { app, atualizarPessoal, obterMarcadosCompras, salvarMarcadosCompras } from '../lib/caderno.svelte.js';
  import { SECOES_MERCADO } from '../core/import/listas.js';
  import Cardapio from '../componentes/Cardapio.svelte';
  import { rota } from '../lib/rota.svelte.js';
  const aba = $derived(rota.query.aba === 'cardapio' ? 'cardapio' : 'lista');

  const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  let marcados = $state({});
  $effect(() => { obterMarcadosCompras().then((m) => (marcados = m ?? {})); });

  const naLista = $derived(app.receitas.filter((x) => x.pessoal?.naLista));
  const despensa = $derived(new Set((app.prefs.exibicao.despensa ?? []).map(semAcento)));
  const grupos = $derived.by(() => {
    const itens = new Map();
    for (const reg of naLista) for (const c of reg.dados.compras ?? []) {
      const k = semAcento(c.item);
      const it = itens.get(k) ?? { chave: k, item: c.item, secao: c.secao || 'outros', quantidades: [], receitas: [] };
      if (c.quantidade) it.quantidades.push(c.quantidade);
      if (!it.receitas.includes(reg.dados.titulo)) it.receitas.push(reg.dados.titulo);
      itens.set(k, it);
    }
    const lista = [...itens.values()];
    const emCasa = lista.filter((i) => despensa.has(i.chave));
    const comprar = lista.filter((i) => !despensa.has(i.chave));
    const porSecao = new Map();
    for (const i of comprar) { if (!porSecao.has(i.secao)) porSecao.set(i.secao, []); porSecao.get(i.secao).push(i); }
    const ordem = (s) => { const x = SECOES_MERCADO.indexOf(s); return x < 0 ? 99 : x; };
    return { secoes: [...porSecao.entries()].sort((a, b) => ordem(a[0]) - ordem(b[0])), emCasa, total: comprar.length };
  });
  const feitos = $derived(grupos.secoes.flatMap(([, l]) => l).filter((i) => marcados[i.chave]).length);

  async function marcar(k, v) { marcados = { ...marcados, [k]: v }; await salvarMarcadosCompras($state.snapshot(marcados)); }
  async function limpar() { marcados = {}; await salvarMarcadosCompras({}); }
</script>

<Topo titulo="Compras" />

<div class="tela">
  <header><p class="rotulo">{aba === 'cardapio' ? 'Cardápio da semana' : 'Lista de compras'}</p><h1>{aba === 'cardapio' ? 'O que vamos comer' : 'O que comprar'}</h1></header>

  <nav class="abas" aria-label="Compras e cardápio">
    <a href="#/compras" aria-current={aba === 'lista' ? 'page' : undefined}><Icone nome="carrinho" tamanho={18} /> Lista</a>
    <a href="#/compras?aba=cardapio" aria-current={aba === 'cardapio' ? 'page' : undefined}><Icone nome="calendario" tamanho={18} /> Cardápio</a>
  </nav>

  {#if aba === 'cardapio'}
    <Cardapio />
  {:else if !naLista.length}
    <div class="vazio folha-papel">
      <p>Nenhuma receita na lista ainda.</p>
      <p class="meta">Na página de uma receita, toque em <strong>Adicionar à lista de compras</strong>, ou monte o <a href="#/compras?aba=cardapio">cardápio da semana</a>.</p>
      <a class="botao leve" href="#/">Ir para o caderno</a>
    </div>
  {:else}
    <div class="receitas" aria-label="Receitas na lista">
      {#each naLista as reg (reg.id)}
        <span class="pilula">{reg.dados.titulo}
          <button class="x" aria-label={`Tirar ${reg.dados.titulo} da lista`} onclick={() => atualizarPessoal(reg.id, { naLista: false })}>✕</button></span>
      {/each}
    </div>
    <p class="meta progresso" aria-live="polite">{feitos} de {grupos.total} itens · <button class="link" onclick={limpar}>desmarcar tudo</button></p>

    {#each grupos.secoes as [secao, itens] (secao)}
      <section class="folha-papel secao">
        <h2 class="rotulo">{secao}</h2>
        <ul>
          {#each itens as it (it.chave)}
            <li>
              <label>
                <input type="checkbox" checked={!!marcados[it.chave]} onchange={(e) => marcar(it.chave, e.currentTarget.checked)} />
                <span><span class="item">{it.item}</span>
                  {#if it.quantidades.length}<small>{it.quantidades.join(' + ')}</small>{/if}
                  {#if naLista.length > 1}<small class="de">{it.receitas.join(' · ')}</small>{/if}</span>
              </label>
            </li>
          {/each}
        </ul>
      </section>
    {/each}

    {#if grupos.emCasa.length}
      <details class="folha-papel secao">
        <summary><Icone nome="check" tamanho={16} /> Você costuma ter em casa ({grupos.emCasa.length})</summary>
        <p class="meta">{grupos.emCasa.map((i) => i.item).join(', ')}</p>
        <p class="credito">Altere essa lista em Mais → Exibição.</p>
      </details>
    {/if}
  {/if}
</div>

<style>
  .tela { width: min(100% - 2rem, 44rem); margin-inline: auto; padding-top: 1rem; display: grid; gap: .9rem; }
  h1 { font-size: var(--t-h2); }
  .abas { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: var(--raio-m); background: var(--papel-kraft); }
  .abas a { display: flex; justify-content: center; align-items: center; gap: .4rem; min-height: 44px; border-radius: 10px; font-weight: 700; color: var(--tinta-suave); text-decoration: none; }
  .abas a[aria-current='page'] { background: var(--papel-folha); color: var(--tinta); box-shadow: var(--sombra-baixa); }
  .vazio { padding: 1.25rem; display: grid; gap: .5rem; justify-items: start; }
  .vazio p { margin: 0; }
  .receitas { display: flex; flex-wrap: wrap; gap: .4rem; }
  .x { border: 0; background: transparent; width: 28px; height: 28px; cursor: pointer; color: var(--tinta-fraca); }
  .progresso { margin: 0; }
  .link { border: 0; background: none; padding: 0; color: var(--terracota-forte); text-decoration: underline; cursor: pointer; font: inherit; }
  .secao { padding: .75rem 1rem; }
  .secao h2 { margin-bottom: .25rem; font-family: var(--fonte-texto); font-size: .75rem; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { border-bottom: 1px dashed var(--linha); }
  li:last-child { border-bottom: 0; }
  label { display: flex; align-items: center; gap: .9rem; min-height: 52px; padding: .35rem 0; cursor: pointer; }
  input { flex: none; width: 26px; height: 26px; accent-color: var(--oliva); margin: 0; }
  input:checked + span .item { text-decoration: line-through; color: var(--tinta-fraca); }
  small { display: block; font-size: .85rem; color: var(--tinta-suave); }
  .de { color: var(--tinta-fraca); font-size: .78rem; }
  summary { cursor: pointer; font-weight: 700; display: flex; gap: .4rem; align-items: center; min-height: 44px; }
  @media (min-width: 64rem) { .tela { padding-top: 2.5rem; } }
</style>
