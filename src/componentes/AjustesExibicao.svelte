<script>
  // Ajustes de EXIBIÇÃO (gerais; sem IA; não alteram o .md). Porções ficam por receita.
  import { app, salvarPrefs } from '../lib/caderno.svelte.js';
  let { porcoes = $bindable(1), base = 1, comPorcoes = true } = $props();
  const ex = $derived(app.prefs.exibicao);
  const mudar = (campo, valor) => salvarPrefs('exibicao', { ...JSON.parse(JSON.stringify(ex)), [campo]: valor });
  const secao = (campo, valor) => mudar('secoes', { ...ex.secoes, [campo]: valor });
</script>

{#if comPorcoes}<div class="grupo">
  <span class="nome">Porções desta receita</span>
  <div class="passo">
    <button class="botao leve" onclick={() => (porcoes = Math.max(1, porcoes - 1))} aria-label="Menos porções">−</button>
    <output aria-live="polite">{porcoes} {porcoes === 1 ? 'porção' : 'porções'}</output>
    <button class="botao leve" onclick={() => (porcoes = porcoes + 1)} aria-label="Mais porções">+</button>
    {#if porcoes !== base}<button class="botao sutil" onclick={() => (porcoes = base)}>Original ({base})</button>{/if}
  </div>
</div>{/if}
<div class="grupo">
  <span class="nome">Medidas de volume</span>
  <div class="seg" role="radiogroup" aria-label="Medidas">
    <button role="radio" aria-checked={ex.unidades === 'original'} onclick={() => mudar('unidades', 'original')}>Como na receita</button>
    <button role="radio" aria-checked={ex.unidades === 'metrico'} onclick={() => mudar('unidades', 'metrico')}>Em ml</button>
  </div>
</div>
<div class="grupo">
  <span class="nome">Tamanho do texto</span>
  <div class="seg tres" role="radiogroup" aria-label="Tamanho do texto">
    {#each [['normal', 'Normal'], ['grande', 'Grande'], ['muito-grande', 'Muito grande']] as [v, r]}
      <button role="radio" aria-checked={ex.tamanhoTexto === v} onclick={() => mudar('tamanhoTexto', v)}>{r}</button>
    {/each}
  </div>
</div>
<label class="grupo linha"><span class="nome">Contraste alto <small>(texto mais escuro, bordas visíveis)</small></span>
  <input type="checkbox" checked={!!ex.contraste} onchange={(e) => mudar('contraste', e.currentTarget.checked)} /></label>
<div class="grupo">
  <span class="nome">Mostrar</span>
  {#each [['dicas', 'Dicas'], ['substituicoes', 'Substituições'], ['variacoes', 'Variações'], ['nutricao', 'Saúde e nutrição']] as [c, r]}
    <label class="linha"><span>{r}</span><input type="checkbox" checked={ex.secoes[c]} onchange={(e) => secao(c, e.currentTarget.checked)} /></label>
  {/each}
</div>
<div class="grupo">
  <label class="campo"><span class="nome">Tenho em casa (fica fora da lista de compras)</span>
    <input class="entrada" value={(ex.despensa ?? []).join(', ')} onchange={(e) => mudar('despensa', e.currentTarget.value.split(',').map((x) => x.trim()).filter(Boolean))} />
  </label>
</div>
<p class="credito">Valem para todo o Pratoria e todas as receitas. A receita original não muda.</p>

<style>
  .grupo { display: grid; gap: .4rem; padding: .6rem 0; border-bottom: 1px dashed var(--linha); }
  .nome { font-weight: 700; font-size: .9rem; color: var(--tinta-suave); }
  .passo { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
  .passo output { min-width: 6.5rem; text-align: center; font-weight: 700; }
  .passo .botao { min-width: 48px; }
  .sutil { border-color: transparent; color: var(--tinta-suave); }
  .seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: var(--raio-m); background: var(--papel-kraft); }
  .seg.tres { grid-template-columns: repeat(3, 1fr); }
  .seg button { min-height: 44px; border: 0; border-radius: 10px; background: transparent; font-weight: 700; color: var(--tinta-suave); cursor: pointer; }
  .seg button[aria-checked='true'] { background: var(--papel-folha); color: var(--tinta); box-shadow: var(--sombra-baixa); }
  .linha { display: flex; justify-content: space-between; align-items: center; min-height: 44px; }
  .linha input { width: 24px; height: 24px; accent-color: var(--oliva); flex: none; }
  .nome small { font-weight: 400; }
</style>
