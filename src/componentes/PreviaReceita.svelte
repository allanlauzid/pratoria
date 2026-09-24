<script>
  // Prévia do que foi colado: erros (bloqueiam), avisos (informam) e resumo.
  import Icone from './Icone.svelte';
  import { formatarMinutos, tempoAtivo } from '../lib/formatar.js';
  let { resultado } = $props();
  const r = $derived(resultado.receita);
</script>

{#if resultado.erros.length}
  <div class="caixa erro" role="alert">
    <strong><Icone nome="alerta" tamanho={18} /> Precisa corrigir antes de salvar</strong>
    <ul>{#each resultado.erros as e}<li>{e}</li>{/each}</ul>
    <p class="meta">Dica: peça à IA para "responder de novo exatamente no formato PRATORIA v1, num único bloco de código".</p>
  </div>
{/if}
{#if resultado.avisos.length}
  <details class="caixa aviso" open={resultado.erros.length === 0 && resultado.avisos.length < 4}>
    <summary>{resultado.avisos.length} observação(ões)</summary>
    <ul>{#each resultado.avisos as a}<li>{a}</li>{/each}</ul>
  </details>
{/if}

{#if r.titulo}
  <article class="resumo folha-papel">
    {#if r.categoria}<span class="rotulo">{r.categoria}</span>{/if}
    <h3>{r.titulo}</h3>
    <p class="meta">{[r.rendimento?.texto, formatarMinutos(tempoAtivo(r)), r.dificuldade].filter(Boolean).join(' · ')}</p>
    {#each r.preparacoes as p}
      <p><strong>{p.nome}</strong> — {p.ingredientes.length} ingrediente(s), {p.passos.length} passo(s)</p>
    {/each}
    {#if r.fonte?.site || r.fonte?.url}<p class="credito">Fonte: {r.fonte.site || r.fonte.url}{r.fonte.autor ? ` · ${r.fonte.autor}` : ''}</p>{/if}
  </article>
{/if}

<style>
  .caixa { border-radius: var(--raio-m); padding: .75rem 1rem; margin: .75rem 0; }
  .caixa ul { margin: .4rem 0 0; padding-left: 1.2rem; }
  .erro { background: color-mix(in srgb, var(--erro) 10%, var(--papel-folha)); border: 1px solid color-mix(in srgb, var(--erro) 40%, transparent); }
  .erro strong { display: flex; gap: .4rem; align-items: center; color: var(--erro); }
  .aviso { background: color-mix(in srgb, var(--mostarda) 12%, var(--papel-folha)); border: 1px solid color-mix(in srgb, var(--mostarda) 40%, transparent); font-size: .92rem; }
  .aviso summary { cursor: pointer; font-weight: 700; }
  .resumo { padding: 1rem; margin-top: .75rem; }
  .resumo h3 { font-size: 1.3rem; margin: .2rem 0; }
  .resumo p { margin: .3rem 0; }
</style>
