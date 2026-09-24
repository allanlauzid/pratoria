<script>
  // Substituições da receita — só as que têm FONTE CONFIÁVEL (ou a própria receita original).
  // Cada troca mostra de onde veio, com link. Sem fonte → não aparece.
  import Icone from './Icone.svelte';
  import { FONTES_SUBSTITUICAO, FONTE_RECEITA } from '../core/import/fontes.js';
  let { receita } = $props();

  const fonteDe = (c) => (c === 'RECEITA' ? FONTE_RECEITA : FONTES_SUBSTITUICAO[c]);
  const validas = $derived((receita.substituicoes ?? []).filter((s) => fonteDe(s.fonte)));
  const principal = $derived(validas.filter((s) => s.para === 'principal').slice(0, 2));
  const ABAS = [['geral', 'Não tem em casa?'], ['vegetariano', 'Vegetariano'], ['vegano', 'Vegano'], ['sem glúten', 'Sem glúten']];
  const abas = $derived(ABAS.filter(([k]) => validas.some((s) => s.para === k)));
  let aba = $state('');
  const atual = $derived(abas.some(([k]) => k === aba) ? aba : abas[0]?.[0] ?? '');
  const itens = $derived(validas.filter((s) => s.para === atual));
  const usadas = $derived([...new Set(validas.map((s) => s.fonte))].map(fonteDe));
  const nomePrincipal = $derived(receita.ingredientePrincipal || principal[0]?.original || '');
</script>

{#if validas.length}
  <div class="subs bloco folha-papel">
    <h3>Substituições</h3>

    {#if principal.length}
      <p class="rotulo-sub">Trocar o ingrediente principal{nomePrincipal ? `: ${nomePrincipal}` : ''}</p>
      <ul class="principal">
        {#each principal as s}
          {@const f = fonteDe(s.fonte)}
          <li>
            <strong>{s.substituto}</strong>
            {#if s.obs}<span class="obs">{s.obs}</span>{/if}
            <span class="fonte">Fonte: {#if f.url}<a href={f.url} target="_blank" rel="noopener">{f.curto}<Icone nome="abrir_fora" tamanho={12} /></a>{:else}{f.curto}{/if}</span>
          </li>
        {/each}
      </ul>
    {/if}

    {#if abas.length}
      <div class="abas" role="tablist" aria-label="Tipo de substituição">
        {#each abas as [k, rotulo]}<button role="tab" aria-selected={atual === k} onclick={() => (aba = k)}>{rotulo}</button>{/each}
      </div>
      <ul class="lista">
        {#each itens as s}
          {@const f = fonteDe(s.fonte)}
          <li>
            <span class="troca"><span class="de">{s.original}</span> <span class="seta" aria-hidden="true">→</span> <strong>{s.substituto}</strong></span>
            {#if s.obs}<span class="obs">{s.obs}</span>{/if}
            <span class="fonte">Fonte: {#if f.url}<a href={f.url} target="_blank" rel="noopener">{f.curto}<Icone nome="abrir_fora" tamanho={12} /></a>{:else}{f.curto}{/if}</span>
          </li>
        {/each}
      </ul>
      {#if atual === 'sem glúten'}
        <p class="alerta-gluten">Para celíacos, use produtos rotulados “sem glúten” e utensílios separados: a contaminação cruzada também faz mal. <a href={FONTES_SUBSTITUICAO.FENACELBRA.url} target="_blank" rel="noopener">FENACELBRA</a></p>
      {/if}
    {/if}

    <p class="credito">Só mostramos trocas de fontes confiáveis:
      {#each usadas as f, i}{#if f.url}<a href={f.url} target="_blank" rel="noopener">{f.nome}</a>{:else}{f.nome}{/if}{i < usadas.length - 1 ? '; ' : '.'}{/each}
    </p>
  </div>
{/if}

<style>
  .subs { display: grid; gap: .7rem; padding: 1.1rem; }
  .rotulo-sub { text-transform: none !important; letter-spacing: 0 !important; font-size: .9rem !important; }
  h3 { margin: 0; }
  .rotulo-sub { margin: 0; font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--terracota); }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }
  .principal { grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }
  .principal li { display: grid; gap: .2rem; padding: .7rem .8rem; border-radius: var(--raio-m); background: color-mix(in srgb, var(--oliva) 8%, var(--papel-folha)); border: 1.5px solid color-mix(in srgb, var(--oliva) 30%, var(--linha)); }
  .lista li { display: grid; gap: .15rem; padding: .5rem 0; border-bottom: 1px dashed var(--linha); }
  .lista li:last-child { border-bottom: 0; }
  .de { color: var(--tinta-suave); }
  .seta { color: var(--terracota); font-weight: 800; }
  .obs { font-size: .9rem; color: var(--tinta-suave); }
  .fonte { font-size: .76rem; color: var(--tinta-fraca); }
  .fonte a { color: inherit; display: inline-flex; align-items: center; gap: .2rem; }
  .abas { display: flex; gap: .35rem; flex-wrap: wrap; }
  .abas button { min-height: 40px; padding: .3rem .85rem; border-radius: 999px; border: 1.5px solid var(--linha); background: var(--papel-folha); font-weight: 700; cursor: pointer; color: var(--tinta-suave); }
  .abas button[aria-selected='true'] { background: var(--tinta); color: var(--papel-folha); border-color: var(--tinta); }
  .alerta-gluten { margin: 0; font-size: .85rem; padding: .55rem .7rem; border-radius: 10px; background: color-mix(in srgb, var(--mostarda) 14%, var(--papel-folha)); }
  .credito a { color: inherit; }
</style>
