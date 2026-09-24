<script>
  // Escolher as coleções de uma receita (aparelho + nuvem).
  import Icone from './Icone.svelte';
  import { app, colecoesDaReceita } from '../lib/caderno.svelte.js';
  let { id, aoTerminar } = $props();
  const reg = $derived(app.receitas.find((x) => x.id === id));
  let marcadas = $state([...(app.receitas.find((x) => x.id === id)?.pessoal?.colecoes ?? [])]);
  let nova = $state('');
  const todas = $derived([...new Set([...app.colecoes, ...marcadas])]);
  const alternar = (c) => (marcadas = marcadas.includes(c) ? marcadas.filter((x) => x !== c) : [...marcadas, c]);
  function criar() {
    const n = nova.trim().replace(/\s+/g, ' ');
    if (!n) return;
    if (!marcadas.includes(n)) marcadas = [...marcadas, n];
    nova = '';
  }
  async function salvar() { await colecoesDaReceita(id, marcadas); aoTerminar?.(); }
</script>

<p class="meta">Agrupe receitas do seu jeito: “Natal”, “Marmitas”, “Da vó”…</p>
{#if todas.length}
  <div class="opcoes" role="group" aria-label="Coleções">
    {#each todas as c}
      <button class="chip" aria-pressed={marcadas.includes(c)} onclick={() => alternar(c)}>{#if marcadas.includes(c)}<Icone nome="check" tamanho={16} />{/if}{c}</button>
    {/each}
  </div>
{/if}
<div class="nova">
  <input class="entrada" bind:value={nova} placeholder="Nova coleção" maxlength="40" enterkeyhint="done" aria-label="Nome da nova coleção"
    onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), criar())} />
  <button class="botao leve" onclick={criar} disabled={!nova.trim()}><Icone nome="mais" /> Criar</button>
</div>
<button class="botao primario bloco" onclick={salvar}>Salvar</button>

<style>
  .opcoes { display: flex; flex-wrap: wrap; gap: .45rem; margin: .75rem 0; }
  .chip { display: inline-flex; align-items: center; gap: .3rem; min-height: 44px; padding: .4rem .9rem; border-radius: 999px; border: 1.5px solid var(--linha);
    background: var(--papel-folha); font-weight: 700; cursor: pointer; font-size: .95rem; }
  .chip[aria-pressed='true'] { background: var(--tinta); color: var(--papel-folha); border-color: var(--tinta); }
  .nova { display: flex; gap: .5rem; margin: .5rem 0 1rem; }
  .nova .entrada { flex: 1; min-width: 0; }
  .meta { margin: 0; }
</style>
