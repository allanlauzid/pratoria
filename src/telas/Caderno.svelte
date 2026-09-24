<script>
  import Topo from '../componentes/Topo.svelte';
  import Cartao from '../componentes/Cartao.svelte';
  import Icone from '../componentes/Icone.svelte';
  import { app, banco } from '../lib/caderno.svelte.js';
  import ImagemReceita from '../componentes/ImagemReceita.svelte';
  import { tempoAtivo } from '../lib/formatar.js';
  import { exportarCaderno, adiarLembreteBackup } from '../lib/caderno.svelte.js';
  import { baixarArquivo } from '../lib/baixar.js';
  import { avisar } from '../lib/avisos.svelte.js';
  import { lembrarBackup } from '../core/lembretes.js';
  import { DIAS, diaDeHoje } from '../core/cardapio.js';

  const lembrete = $derived(lembrarBackup({ ...app.backup, receitas: app.receitas.length }));
  let fazendoBackup = $state(false);
  async function backupAgora() {
    fazendoBackup = true;
    try { const { arquivo, receitas } = await exportarCaderno(); baixarArquivo(arquivo); avisar(`Backup com ${receitas} receita(s) baixado. Guarde num lugar seguro.`); }
    catch (e) { console.error(e); avisar('Não consegui fazer o backup.'); }
    fazendoBackup = false;
  }
  const hoje = diaDeHoje();
  const nomeHoje = DIAS.find(([k]) => k === hoje)[1];
  const deHoje = $derived((app.cardapio.dias[hoje] ?? []).map((id) => app.receitas.find((r) => r.id === id)).filter(Boolean));

  // "Continuar cozinhando": receita com o livro aberto no meio (estado só no aparelho)
  let continuar = $state(null);
  $effect(() => {
    app.receitas.length;
    banco().listarEstados().then((lista) => {
      const e = lista.filter((x) => x.pagina && x.pagina !== 'capa' && x.pagina !== 'final' && app.receitas.some((r) => r.id === x.receitaId))
        .sort((a, b) => (b.atualizadoEm ?? '').localeCompare(a.atualizadoEm ?? ''))[0];
      continuar = e ? { ...e, reg: app.receitas.find((r) => r.id === e.receitaId) } : null;
    });
  });
  let rapidas = $state(false);
  let semForno = $state(false);

  let busca = $state('');
  let categoria = $state('');
  let colecao = $state('');
  let soFavoritas = $state(false);

  const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const indice = (r) => semAcento([
    r.titulo, r.tituloOriginal, r.categoria, r.cozinha, ...(r.tags ?? []), ...(r.refeicao ?? []),
    ...(r.preparacoes ?? []).flatMap((p) => p.ingredientes.map((i) => i.item)),
  ].join(' '));

  const categorias = $derived([...new Set(app.receitas.map((x) => x.dados.categoria).filter(Boolean))].sort());
  const lista = $derived.by(() => {
    const termos = semAcento(busca).split(/\s+/).filter(Boolean);
    return app.receitas.filter((x) =>
      (!categoria || x.dados.categoria === categoria) &&
      (!colecao || x.pessoal?.colecoes?.includes(colecao)) &&
      (!soFavoritas || x.pessoal?.favorita) &&
      (!rapidas || ((tempoAtivo(x.dados)?.max ?? 999) <= 30)) &&
      (!semForno || !/forno/i.test([...(x.dados.equipamentos ?? []), x.dados.temperaturaForno].join(' '))) &&
      termos.every((t) => indice(x.dados).includes(t)));
  });
</script>

<Topo />

<div class="tela">
  <header class="cabeca">
    <p class="rotulo">Seu caderno</p>
    <h1>O que vamos cozinhar?</h1>
  </header>

  {#if continuar}
    <a class="continuar" href={`#/receita/${continuar.receitaId}/cozinhar`}>
      <span class="mini"><ImagemReceita id={continuar.receitaId} /></span>
      <span class="txt"><small>Continuar cozinhando</small><strong>{continuar.reg.dados.titulo}</strong><span>{continuar.rotulo}</span></span>
    </a>
  {/if}

  {#if lembrete.mostrar}
    <aside class="lembrete folha-papel" aria-label="Lembrete de backup">
      <p><strong>Hora de um backup</strong> <span class="meta">{lembrete.motivo} Sem conta, suas receitas ficam só neste aparelho.</span></p>
      <div class="acoes">
        <button class="botao primario" onclick={backupAgora} disabled={fazendoBackup}><Icone nome="download" /> Fazer backup</button>
        <button class="botao leve" onclick={() => adiarLembreteBackup(7)}>Depois</button>
      </div>
    </aside>
  {/if}

  {#if deHoje.length}
    <a class="hoje folha-papel" href="#/compras?aba=cardapio">
      <span class="ic-hoje"><Icone nome="calendario" /></span>
      <span class="txt"><small>{nomeHoje} no cardápio</small><strong>{deHoje.map((r) => r.dados.titulo).join(' · ')}</strong></span>
    </a>
  {/if}

  <div class="busca" role="search">
    <label class="visualmente-oculto" for="busca">Buscar receitas</label>
    <span class="lupa"><Icone nome="busca" tamanho={20} /></span>
    <input id="busca" class="entrada" type="search" placeholder="Receita, ingrediente ou categoria" bind:value={busca} enterkeyhint="search" autocomplete="off" />
  </div>

  <div class="filtros" role="group" aria-label="Filtrar">
    <button class="chip" aria-pressed={!categoria && !colecao && !soFavoritas && !rapidas && !semForno} onclick={() => { categoria = ''; colecao = ''; soFavoritas = false; rapidas = false; semForno = false; }}>Todas</button>
    <button class="chip" aria-pressed={soFavoritas} onclick={() => (soFavoritas = !soFavoritas)}><Icone nome="coracao" tamanho={16} /> Favoritas</button>
    <button class="chip" aria-pressed={rapidas} onclick={() => (rapidas = !rapidas)}><Icone nome="relogio" tamanho={16} /> Até 30 min</button>
    <button class="chip" aria-pressed={semForno} onclick={() => (semForno = !semForno)}>Sem forno</button>
    {#each app.colecoes.filter((c) => app.receitas.some((r) => r.pessoal?.colecoes?.includes(c))) as c}
      <button class="chip colecao" aria-pressed={colecao === c} onclick={() => (colecao = colecao === c ? '' : c)}><Icone nome="etiqueta" tamanho={15} /> {c}</button>
    {/each}
    {#each categorias as c}
      <button class="chip" aria-pressed={categoria === c} onclick={() => (categoria = categoria === c ? '' : c)}>{c}</button>
    {/each}
  </div>

  {#if lista.length}
    <p class="visualmente-oculto" aria-live="polite">{lista.length} receita(s)</p>
    <ul class="grade">
      {#each lista as r (r.id)}<li><Cartao registro={r} /></li>{/each}
    </ul>
  {:else if app.receitas.length}
    <p class="vazio">Nenhuma receita encontrada. Tente outra palavra.</p>
  {:else}
    <div class="vazio folha-papel">
      <h2>Seu caderno está vazio</h2>
      <p>Importe uma receita de qualquer site ou receba de alguém.</p>
      <a class="botao primario" href="#/importar"><Icone nome="mais" /> Importar receita</a>
    </div>
  {/if}
</div>

<style>
  .tela { width: min(100% - 2rem, 70rem); margin-inline: auto; padding-top: 1rem; }
  .cabeca { margin: .5rem 0 1rem; }
  h1 { font-size: var(--t-h1); }
  .continuar { display: grid; grid-template-columns: 64px 1fr; gap: .8rem; align-items: center; padding: .7rem; margin-bottom: .9rem; border-radius: var(--raio-m);
    background: var(--terracota-forte); color: #fff; text-decoration: none; }
  .continuar .mini { width: 64px; height: 64px; border-radius: 10px; background: rgba(255,255,255,.14); overflow: hidden; }
  .continuar .txt { display: grid; line-height: 1.3; }
  .continuar small { font-size: .72rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; opacity: .85; }
  .continuar span span { font-size: .88rem; opacity: .9; }
  .lembrete { padding: .9rem 1rem; margin-bottom: .9rem; display: grid; gap: .6rem; border-left: 4px solid var(--mostarda); }
  .lembrete p { margin: 0; display: grid; gap: .15rem; }
  .lembrete .acoes { display: flex; gap: .5rem; flex-wrap: wrap; }
  .hoje { display: grid; grid-template-columns: 40px 1fr; gap: .7rem; align-items: center; padding: .7rem .9rem; margin-bottom: .9rem; text-decoration: none; color: var(--tinta); }
  .ic-hoje { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: color-mix(in srgb, var(--oliva) 16%, transparent); color: var(--oliva); }
  .hoje .txt { display: grid; line-height: 1.3; min-width: 0; }
  .hoje small { font-size: .72rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--oliva); }
  .hoje strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .busca { position: relative; }
  .lupa { position: absolute; left: .8rem; top: 50%; transform: translateY(-50%); color: var(--tinta-fraca); pointer-events: none; }
  .busca .entrada { padding-left: 2.5rem; }
  .filtros { display: flex; gap: .5rem; overflow-x: auto; padding: .75rem 0 .5rem; margin-inline: -1rem; padding-inline: 1rem; scrollbar-width: none; }
  .chip {
    flex: none; display: inline-flex; align-items: center; gap: .3rem; min-height: 40px; padding: .4rem .9rem;
    border-radius: 999px; border: 1.5px solid var(--linha); background: var(--papel-folha); font-weight: 700; font-size: .9rem; cursor: pointer;
  }
  .chip[aria-pressed='true'] { background: var(--tinta); color: var(--papel-folha); border-color: var(--tinta); }
  .grade { list-style: none; padding: 0; margin: .5rem 0 0; display: grid; gap: .75rem; }
  @media (min-width: 40rem) { .grade { grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 1rem; } }
  .vazio { text-align: center; color: var(--tinta-suave); padding: 2rem 1rem; display: grid; gap: .75rem; justify-items: center; }
  .vazio h2 { color: var(--tinta); }
  @media (min-width: 64rem) { .tela { padding-top: 2.5rem; } }
</style>
