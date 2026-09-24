<script>
  // Em quais dias da semana-modelo esta receita entra (aparelho + nuvem).
  import { app, salvarCardapio } from '../lib/caderno.svelte.js';
  import { DIAS, adicionarAoDia, tirarDoDia, diaDeHoje } from '../core/cardapio.js';
  let { id, aoTerminar } = $props();
  let dias = $state(DIAS.filter(([k]) => app.cardapio.dias[k]?.includes(id)).map(([k]) => k));
  const hoje = diaDeHoje();
  const alternar = (k) => (dias = dias.includes(k) ? dias.filter((x) => x !== k) : [...dias, k]);
  async function salvar() {
    let c = JSON.parse(JSON.stringify(app.cardapio));
    for (const [k] of DIAS) c = dias.includes(k) ? adicionarAoDia(c, k, id) : tirarDoDia(c, k, id);
    await salvarCardapio(c);
    aoTerminar?.();
  }
</script>

<p class="meta">Escolha os dias. O cardápio fica em <strong>Compras → Cardápio</strong> e monta a lista de compras da semana.</p>
<div class="dias" role="group" aria-label="Dias da semana">
  {#each DIAS as [k, nome]}
    <button class="dia" aria-pressed={dias.includes(k)} onclick={() => alternar(k)}>
      <span>{nome.slice(0, 3)}</span>{#if k === hoje}<small>hoje</small>{/if}
    </button>
  {/each}
</div>
<button class="botao primario bloco" onclick={salvar}>Salvar</button>

<style>
  .meta { margin: 0; }
  .dias { display: grid; grid-template-columns: repeat(7, 1fr); gap: .3rem; margin: 1rem 0; }
  .dia { display: grid; place-items: center; min-height: 56px; border-radius: 12px; border: 1.5px solid var(--linha); background: var(--papel-folha);
    font-weight: 800; cursor: pointer; padding: .2rem 0; font-size: .9rem; }
  .dia small { font-size: .62rem; font-weight: 700; color: var(--terracota-forte); }
  .dia[aria-pressed='true'] { background: var(--oliva); border-color: var(--oliva); color: #fff; }
  .dia[aria-pressed='true'] small { color: #fff; }
</style>
