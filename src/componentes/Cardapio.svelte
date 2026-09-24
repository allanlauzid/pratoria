<script>
  // Cardápio da semana (semana-modelo, não datada). Aparelho + nuvem.
  import Icone from './Icone.svelte';
  import Folha from './Folha.svelte';
  import ImagemReceita from './ImagemReceita.svelte';
  import { app, salvarCardapio, atualizarPessoal } from '../lib/caderno.svelte.js';
  import { avisar } from '../lib/avisos.svelte.js';
  import { DIAS, adicionarAoDia, tirarDoDia, receitasDoCardapio, cardapioVazio, diaDeHoje } from '../core/cardapio.js';

  const hoje = diaDeHoje();
  let escolhendo = $state('');       // dia para o qual está escolhendo receita
  let escolhendoAberta = $state(false);
  const abrir = (k) => { escolhendo = k; busca = ''; escolhendoAberta = true; };
  let busca = $state('');
  let limpando = $state(false);
  const porId = (id) => app.receitas.find((r) => r.id === id);
  const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const opcoes = $derived(app.receitas.filter((r) => semAcento(r.dados.titulo + ' ' + (r.dados.categoria ?? '')).includes(semAcento(busca.trim()))));
  const semana = $derived(receitasDoCardapio(app.cardapio).filter(porId));
  const copia = () => JSON.parse(JSON.stringify(app.cardapio));

  async function por(id) { await salvarCardapio(adicionarAoDia(copia(), escolhendo, id)); escolhendoAberta = false; }
  const tirar = (dia, id) => salvarCardapio(tirarDoDia(copia(), dia, id));
  async function paraLista() {
    for (const id of semana) if (!porId(id)?.pessoal?.naLista) await atualizarPessoal(id, { naLista: true });
    avisar(`${semana.length} receita(s) da semana na lista de compras`);
  }
  async function limpar() { await salvarCardapio(cardapioVazio()); limpando = false; avisar('Semana limpa'); }
</script>

<ol class="dias">
  {#each DIAS as [k, nome]}
    {@const ids = (app.cardapio.dias[k] ?? []).filter(porId)}
    <li class="dia folha-papel" class:hoje={k === hoje}>
      <div class="cab"><h2>{nome}{#if k === hoje}<small>hoje</small>{/if}{#if !ids.length}<span class="nada">nada ainda</span>{/if}</h2>
        <button class="botao-icone" onclick={() => abrir(k)} aria-label={`Adicionar receita na ${nome}`}><Icone nome="mais" /></button></div>
      {#if ids.length}
        <ul>
          {#each ids as id (id)}
            <li>
              <a href={`#/receita/${id}`}><span class="mini"><ImagemReceita {id} /></span><span>{porId(id).dados.titulo}</span></a>
              <button class="x" onclick={() => tirar(k, id)} aria-label={`Tirar ${porId(id).dados.titulo} de ${nome}`}><Icone nome="fechar" tamanho={18} /></button>
            </li>
          {/each}
        </ul>
      {/if}
    </li>
  {/each}
</ol>

{#if semana.length}
  <div class="acoes">
    <button class="botao primario" onclick={paraLista}><Icone nome="carrinho" /> Pôr a semana na lista de compras</button>
    <button class="botao leve" onclick={() => (limpando = true)}>Limpar semana</button>
  </div>
{/if}

<Folha bind:aberta={escolhendoAberta} titulo={`Receita para ${DIAS.find(([k]) => k === escolhendo)?.[1] ?? ''}`}>
  {#if escolhendoAberta}
    <input class="entrada" type="search" bind:value={busca} placeholder="Buscar no caderno" aria-label="Buscar receita" />
    <ul class="escolher">
      {#each opcoes as r (r.id)}
        <li><button onclick={() => por(r.id)} disabled={app.cardapio.dias[escolhendo]?.includes(r.id)}>
          <span class="mini"><ImagemReceita id={r.id} /></span><span>{r.dados.titulo}</span>
          {#if app.cardapio.dias[escolhendo]?.includes(r.id)}<Icone nome="check" tamanho={18} />{/if}</button></li>
      {:else}<li class="meta">Nenhuma receita encontrada.</li>{/each}
    </ul>
  {/if}
</Folha>

<Folha bind:aberta={limpando} titulo="Limpar a semana?">
  <p>Todas as receitas saem do cardápio. Elas continuam no caderno.</p>
  <div class="fim"><button class="botao leve" onclick={() => (limpando = false)}>Cancelar</button><button class="botao primario" onclick={limpar}>Limpar</button></div>
</Folha>

<style>
  .dias { list-style: none; margin: 0; padding: 0; display: grid; gap: .6rem; }
  @media (min-width: 64rem) { .dias { grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); } }
  .dia { padding: .6rem .8rem .7rem; }
  .dia.hoje { box-shadow: 0 0 0 2px var(--oliva), var(--sombra-folha); }
  .cab { display: flex; justify-content: space-between; align-items: center; }
  h2 { font-size: 1.1rem; display: flex; gap: .5rem; align-items: baseline; }
  h2 small { font-family: var(--fonte-texto); font-size: .7rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--oliva); }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .3rem; }
  .dia li { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: .3rem; }
  .dia a { display: grid; grid-template-columns: 40px 1fr; gap: .6rem; align-items: center; color: var(--tinta); text-decoration: none; font-weight: 700; min-height: 48px; }
  .mini { width: 40px; height: 40px; border-radius: 8px; overflow: hidden; background: var(--papel); display: block; }
  .x { width: 40px; height: 40px; border: 0; background: transparent; color: var(--tinta-fraca); cursor: pointer; display: grid; place-items: center; }
  .nada { font-family: var(--fonte-texto); font-size: .82rem; font-weight: 400; color: var(--tinta-fraca); }
  .dia:not(:has(ul)) { padding-block: .3rem; }
  .acoes { display: flex; flex-wrap: wrap; gap: .5rem; }
  .escolher { margin-top: .75rem; max-height: 55vh; overflow-y: auto; }
  .escolher button { width: 100%; display: grid; grid-template-columns: 40px 1fr auto; gap: .7rem; align-items: center; text-align: left; min-height: 56px; padding: .35rem;
    border: 0; border-radius: var(--raio-m); background: transparent; font: inherit; font-weight: 700; color: var(--tinta); cursor: pointer; }
  .escolher button:hover:not(:disabled) { background: color-mix(in srgb, var(--linha) 35%, transparent); }
  .escolher button:disabled { opacity: .55; cursor: default; }
  .fim { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1rem; }
</style>
