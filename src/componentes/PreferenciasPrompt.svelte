<script>
  // Ajustes PRÉ-PRONTOS do prompt (gerais). Entram no pedido à IA ao importar.
  import { AJUSTES_PROMPT } from '../core/import/ajustes.js';
  import { app, salvarPrefs } from '../lib/caderno.svelte.js';
  const aj = $derived(app.prefs.ajustes);
  const mudar = (campo, valor) => salvarPrefs('ajustes', { ...JSON.parse(JSON.stringify(aj)), [campo]: valor });
  const alternar = (campo, v) => { const l = new Set(aj[campo] ?? []); l.has(v) ? l.delete(v) : l.add(v); mudar(campo, [...l]); };
  const simples = ['detalhe', 'linguagem', 'medidas', 'tempero', 'ilustracoes'];
  const multiplas = ['dieta', 'semEquipamento', 'extras'];
</script>

{#each simples as campo}
  <fieldset class="grupo">
    <legend>{AJUSTES_PROMPT[campo].rotulo}</legend>
    <div class="chips">
      {#each Object.entries(AJUSTES_PROMPT[campo].opcoes) as [v, op]}
        <button class="chip" aria-pressed={String(aj[campo]) === v} onclick={() => mudar(campo, campo === 'ilustracoes' ? +v : v)}>{op.rotulo}</button>
      {/each}
    </div>
  </fieldset>
{/each}
<fieldset class="grupo">
  <legend>Porções</legend>
  <div class="chips">
    {#each [0, 1, 2, 4, 6, 8] as n}
      <button class="chip" aria-pressed={aj.porcoes === n} onclick={() => mudar('porcoes', n)}>{n === 0 ? 'Como no original' : n}</button>
    {/each}
  </div>
</fieldset>
{#each multiplas as campo}
  <fieldset class="grupo">
    <legend>{AJUSTES_PROMPT[campo].rotulo}</legend>
    <div class="chips">
      {#each Object.entries(AJUSTES_PROMPT[campo].opcoes) as [v, op]}
        <button class="chip" aria-pressed={(aj[campo] ?? []).includes(v)} onclick={() => alternar(campo, v)}>{op.rotulo}</button>
      {/each}
    </div>
  </fieldset>
{/each}
<p class="credito">Valem para as próximas importações. Receitas geradas com ajustes ficam marcadas como adaptadas.</p>

<style>
  .grupo { border: 0; margin: 0; padding: .6rem 0; border-bottom: 1px dashed var(--linha); }
  legend { font-weight: 700; font-size: .9rem; color: var(--tinta-suave); padding: 0; margin-bottom: .4rem; }
  .chips { display: flex; flex-wrap: wrap; gap: .4rem; }
  .chip { min-height: 40px; padding: .35rem .85rem; border-radius: 999px; border: 1.5px solid var(--linha); background: var(--papel-folha); font-weight: 700; font-size: .9rem; cursor: pointer; }
  .chip[aria-pressed='true'] { background: var(--tinta); color: var(--papel-folha); border-color: var(--tinta); }
</style>
