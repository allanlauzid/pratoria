<script>
  // ChatGPT (com o prompt embutido no link) + Copiar prompt. Só ChatGPT no Pratoria.
  // Prompt longo demais para o link: o botão copia e abre o ChatGPT vazio para colar.
  import Icone from './Icone.svelte';
  import { acoesDoPrompt } from '../core/import/prompts.js';
  import { copiarTexto } from '../core/compartilhar/compartilhar.js';
  import { avisar } from '../lib/avisos.svelte.js';

  let { prompt, aoAbrir = () => {}, rotulo = 'Abrir no ChatGPT', dica = 'O pedido já vai pronto' } = $props();
  let copiado = $state(false);
  $effect(() => { prompt; copiado = false; });
  const [gpt] = $derived(acoesDoPrompt(prompt));

  async function copiar() {
    if (await copiarTexto(prompt)) { copiado = true; avisar('Prompt copiado. É só colar no ChatGPT.'); return true; }
    avisar('Não consegui copiar. Abra "Ver o prompt" e copie à mão.');
    return false;
  }
  async function abrir(e) {
    if (gpt.longo) {
      e.preventDefault();
      await copiar();
      window.open('https://chatgpt.com/', '_blank', 'noopener');
    }
    aoAbrir('chatgpt');
  }
</script>

<div class="acoes">
  <a class="botao bloco gpt" href={gpt.href} target="_blank" rel="noopener" onclick={abrir}>
    <span class="logo" aria-hidden="true"><Icone nome="mensagem" tamanho={20} /></span>
    <span class="nome">{rotulo}<small>{gpt.longo ? 'Pedido longo: ele é copiado para você colar' : dica}</small></span>
    <Icone nome="abrir_fora" tamanho={18} />
  </a>
  <button class="botao bloco leve copiar" onclick={copiar}>
    <Icone nome={copiado ? 'check' : 'copiar'} /> {copiado ? 'Prompt copiado' : 'Copiar prompt'}
  </button>
</div>

<details class="ver">
  <summary>Ver o prompt</summary>
  <textarea class="entrada" readonly rows="8">{prompt}</textarea>
</details>

<style>
  .acoes { display: grid; gap: .5rem; }
  .gpt { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: .75rem; text-align: left; min-height: 60px;
    background: #10a37f; border-color: #10a37f; color: #fff; }
  .gpt:hover { background: #0e906f; }
  .logo { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,.18); }
  .nome { display: grid; font-weight: 800; line-height: 1.2; }
  .nome small { font-weight: 400; opacity: .9; font-size: .8rem; }
  .ver { margin-top: .5rem; }
  .ver summary { cursor: pointer; color: var(--tinta-suave); font-size: var(--t-meta); padding: .5rem 0; }
</style>
