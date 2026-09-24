<script>
  // Cartela de ilustrações a giz: prompt (ChatGPT) → enviar → recorte automático → conferir.
  import AcoesPrompt from './AcoesPrompt.svelte';
  import Icone from './Icone.svelte';
  import { montarPromptIlustracoes, gradeDaCartela } from '../core/import/prompts.js';
  import { recortarCartela } from '../lib/cartela.js';
  import { biblioteca, chaveIngrediente, salvarIlustracoesDaReceita } from '../lib/caderno.svelte.js';

  let { receita, id, aoTerminar, aoPular = null } = $props();

  const todos = $derived((receita.ilustracoes ?? []).slice().sort((a, b) => a.ordem - b.ordem).slice(0, 12));
  let jaTenho = $state(new Map());
  $effect(() => { biblioteca().then((b) => (jaTenho = b)); });
  const faltam = $derived(todos.filter((i) => !jaTenho.has(chaveIngrediente(i.ingrediente))));
  const prompt = $derived(faltam.length ? montarPromptIlustracoes({ ilustracoes: faltam }) : '');
  const grade = $derived(gradeDaCartela(faltam.length || 1));

  let resultado = $state(null);   // {cartela, recortes:[{blob,url,ingrediente}]}
  let processando = $state(false);
  let erro = $state('');

  async function escolher(e) {
    const f = e.currentTarget.files?.[0]; if (!f) return;
    processando = true; erro = '';
    try {
      const r = await recortarCartela(f, grade);
      const recortes = r.recortes.slice(0, faltam.length).map((blob, i) => ({ blob, url: blob ? URL.createObjectURL(blob) : '', ingrediente: faltam[i].ingrediente }));
      if (!recortes.some((x) => x.blob)) erro = 'Não encontrei desenhos separados. Gere de novo pedindo mais espaço entre eles.';
      resultado = { cartela: r.cartela, recortes };
    } catch (err) { console.error(err); erro = 'Não consegui abrir essa imagem.'; }
    processando = false;
  }
  async function salvar() {
    const daBiblioteca = todos.filter((i) => jaTenho.has(chaveIngrediente(i.ingrediente)))
      .map((i) => ({ ingrediente: i.ingrediente, blob: jaTenho.get(chaveIngrediente(i.ingrediente)).blob }));
    const novos = (resultado?.recortes ?? []).filter((r) => r.blob).map(({ ingrediente, blob }) => ({ ingrediente, blob }));
    await salvarIlustracoesDaReceita(id, { cartela: resultado?.cartela ?? null, grade, recortes: [...novos, ...daBiblioteca] });
    aoTerminar?.();
  }
  function trocar(i, ingrediente) { resultado.recortes[i].ingrediente = ingrediente; }
</script>

{#if !todos.length}
  <p class="meta">Esta receita não tem a lista de ilustrações. Receitas importadas com a versão nova do prompt já vêm com ela.</p>
{:else}
  <p class="meta">Ingredientes: {todos.map((i) => i.ingrediente).join(', ')}.
    {#if todos.length - faltam.length}<br />{todos.length - faltam.length} já estão na sua biblioteca e serão reaproveitados.{/if}</p>
  {#if faltam.length}
    <ol class="passos">
      <li><strong>Gere a cartela</strong><p class="meta">Uma imagem com {faltam.length} desenhos em grade {grade.colunas}×{grade.linhas}. Salve no aparelho.</p><AcoesPrompt {prompt} /></li>
      <li><strong>Envie a cartela</strong>
        <label class="botao leve bloco envio"><Icone nome="upload" /> Escolher imagem
          <input type="file" accept="image/png,image/webp,image/jpeg" class="visualmente-oculto" onchange={escolher} /></label>
        {#if processando}<p class="meta" aria-live="polite">Recortando os desenhos…</p>{/if}
        {#if erro}<p class="erro" role="alert">{erro}</p>{/if}
        {#if resultado}
          <p class="meta">Confira: cada desenho deve estar com o nome certo.</p>
          <ul class="recortes">
            {#each resultado.recortes as rc, i}
              <li>
                {#if rc.url}<img src={rc.url} alt={rc.ingrediente} />{:else}<span class="vazio">não achei</span>{/if}
                <select class="entrada" value={rc.ingrediente} onchange={(e) => trocar(i, e.currentTarget.value)} aria-label="Ingrediente deste desenho">
                  {#each faltam as f}<option value={f.ingrediente}>{f.ingrediente}</option>{/each}
                </select>
              </li>
            {/each}
          </ul>
        {/if}
      </li>
    </ol>
  {/if}
  <button class="botao primario bloco" disabled={faltam.length > 0 && !resultado?.recortes.some((r) => r.blob)} onclick={salvar}>Usar estas ilustrações</button>
{/if}
{#if aoPular}<button class="botao bloco pular" onclick={aoPular}>Pular por enquanto</button>{/if}

<style>
  .passos { margin: .5rem 0 1rem; padding-left: 1.25rem; display: grid; gap: 1.25rem; }
  .passos li::marker { font-family: var(--fonte-titulo); font-weight: 700; color: var(--terracota); }
  .passos p { margin: .2rem 0 .5rem; }
  .envio { cursor: pointer; }
  .recortes { list-style: none; padding: 0; margin: .5rem 0 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: .5rem; }
  .recortes li { display: grid; gap: .3rem; justify-items: center; padding: .4rem; border: 1px solid var(--linha); border-radius: var(--raio-m); background: repeating-conic-gradient(#efe6d6 0 25%, #f8f3ea 0 50%) 0 0 / 16px 16px; }
  .recortes img { width: 72px; height: 72px; object-fit: contain; }
  .recortes select { min-height: 36px; padding: .2rem .4rem; font-size: 14px !important; }
  .vazio { width: 72px; height: 72px; display: grid; place-items: center; font-size: .75rem; color: var(--tinta-fraca); }
  .pular { margin-top: .75rem; border-color: transparent; color: var(--tinta-suave); }
  .erro { color: var(--erro); }
</style>
