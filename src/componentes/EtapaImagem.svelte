<script>
  // Foto do prato: de onde tirar (foto do site, Bing Imagens, ChatGPT, Criador do Bing) e enviar.
  import AcoesPrompt from './AcoesPrompt.svelte';
  import Icone from './Icone.svelte';
  import ImportarImagem from './ImportarImagem.svelte';
  import { montarPromptImagem, montarPromptImagemCurto, linkBingImagens, linkBingCriador } from '../core/import/prompts.js';
  import { copiarTexto } from '../core/compartilhar/compartilhar.js';
  import { avisar } from '../lib/avisos.svelte.js';
  import { untrack } from 'svelte';

  let { receita, aoSalvar, aoPular = null, rotuloPular = 'Pular por enquanto' } = $props();
  const prompt = $derived(montarPromptImagem(receita));
  let origem = $state(untrack(() => (receita?.fotoOriginal ? 'site' : 'ia')));
  async function criadorBing(e) {
    const curto = montarPromptImagemCurto(receita);
    await copiarTexto(curto);
    avisar('Pedido copiado. Se o campo do Bing vier vazio, é só colar.');
  }
</script>

<div class="origens" role="tablist" aria-label="De onde vem a foto">
  {#if receita?.fotoOriginal}<button role="tab" aria-selected={origem === 'site'} onclick={() => (origem = 'site')}>Foto do site</button>{/if}
  <button role="tab" aria-selected={origem === 'ia'} onclick={() => (origem = 'ia')}>Gerar com IA</button>
  <button role="tab" aria-selected={origem === 'busca'} onclick={() => (origem = 'busca')}>Buscar no Bing</button>
</div>

<div class="painel">
  {#if origem === 'site'}
    <p class="meta">A receita tem uma foto original. Abra, salve no aparelho (tocar e segurar → Salvar imagem) e envie abaixo. Ela fica guardada só para você.</p>
    <a class="botao leve bloco" href={receita.fotoOriginal} target="_blank" rel="noopener"><Icone nome="abrir_fora" /> Abrir a foto original</a>
  {:else if origem === 'ia'}
    <p class="meta">Uma foto nova no estilo do Pratoria: louça de cerâmica e fundo transparente. Depois salve a imagem e envie abaixo.</p>
    <AcoesPrompt {prompt} rotulo="Gerar no ChatGPT" />
    <a class="botao leve bloco bing" href={linkBingCriador(montarPromptImagemCurto(receita))} target="_blank" rel="noopener" onclick={criadorBing}>
      <Icone nome="imagem" /> <span>Criador de Imagens do Bing <small>alternativa gratuita da Microsoft</small></span>
    </a>
  {:else}
    <p class="meta">Procure uma foto de referência do prato. Salve a que gostar e envie abaixo.</p>
    <a class="botao leve bloco" href={linkBingImagens(receita?.titulo)} target="_blank" rel="noopener"><Icone nome="busca" /> Procurar “{receita?.titulo}” no Bing Imagens</a>
  {/if}
</div>

<h3 class="envie">Envie a imagem</h3>
<ImportarImagem aoUsar={aoSalvar} nome={receita?.slug || 'foto'} />
{#if aoPular}<button class="botao bloco pular" onclick={aoPular}>{rotuloPular}</button>{/if}

<style>
  .origens { display: grid; grid-auto-flow: column; gap: 4px; padding: 4px; border-radius: var(--raio-m); background: var(--papel-kraft); margin-bottom: .75rem; }
  .origens button { min-height: 44px; border: 0; border-radius: 10px; background: transparent; font-weight: 700; color: var(--tinta-suave); cursor: pointer; font-size: .9rem; padding: 0 .4rem; }
  .origens button[aria-selected='true'] { background: var(--papel-folha); color: var(--tinta); box-shadow: var(--sombra-baixa); }
  .painel { display: grid; gap: .6rem; }
  .painel p { margin: 0; }
  .bing { justify-content: flex-start; text-align: left; }
  .bing span { display: grid; line-height: 1.2; }
  .bing small { font-weight: 400; color: var(--tinta-suave); font-size: .8rem; }
  .envie { font-size: 1.05rem; margin: 1.25rem 0 .5rem; }
  .pular { margin-top: 1rem; border-color: transparent; color: var(--tinta-suave); }
</style>
