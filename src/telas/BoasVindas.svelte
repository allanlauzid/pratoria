<script>
  // 1ª abertura (uma tela, pulável). "Já vi" fica só no aparelho; o nome vai para o perfil.
  import Marca from '../componentes/Marca.svelte';
  import Icone from '../componentes/Icone.svelte';
  import { app, salvarNome, fecharBoasVindas } from '../lib/caderno.svelte.js';
  let nome = $state(app.perfil.nome);
  let el;
  $effect(() => { el?.querySelector('input')?.focus({ preventScroll: true }); });
  async function comecar() {
    if (nome.trim() && nome.trim() !== app.perfil.nome) await salvarNome(nome);
    await fecharBoasVindas();
  }
</script>

<div class="boas-vindas" role="dialog" aria-modal="true" aria-labelledby="bv-titulo" bind:this={el}>
  <div class="cartao folha-papel">
    <Marca />
    <h1 id="bv-titulo">Seu caderno de receitas, no celular</h1>
    <ul>
      <li><span class="ic"><Icone nome="link" /></span><span>Traga receitas de <strong>qualquer site</strong> ou escreva as da família.</span></li>
      <li><span class="ic"><Icone nome="livro" /></span><span>Cozinhe <strong>passo a passo</strong>, com a tela ligada e cronômetros.</span></li>
      <li><span class="ic"><Icone nome="check" /></span><span>Funciona <strong>sem internet e sem conta</strong>. Tudo fica neste aparelho.</span></li>
    </ul>
    <label class="campo"><span>Seu nome <small>(opcional)</small></span>
      <small class="ajuda">Aparece como autor das receitas que você cria ou compartilha. Ex.: “Receita do caderno da Ana”.</small>
      <input class="entrada" bind:value={nome} autocomplete="given-name" placeholder="Seu nome" enterkeyhint="go" onkeydown={(e) => e.key === 'Enter' && comecar()} /></label>
    <button class="botao primario bloco" onclick={comecar}>Começar</button>
    <p class="credito">Já tem uma receita de exemplo no caderno para você explorar.</p>
  </div>
</div>

<style>
  .boas-vindas { position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 1rem; background: color-mix(in srgb, var(--papel) 92%, #000 8%); overflow-y: auto; }
  .cartao { width: min(100%, 28rem); padding: 1.5rem 1.25rem; display: grid; gap: 1rem; }
  h1 { font-size: clamp(1.6rem, 1.2rem + 2vw, 2.1rem); margin: 0; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .7rem; }
  li { display: grid; grid-template-columns: 40px 1fr; gap: .7rem; align-items: center; }
  .ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--papel); color: var(--terracota-forte); }
  .campo small { font-weight: 400; }
  .ajuda { display: block; color: var(--tinta-suave); font-size: .82rem; margin-top: -.15rem; }
  .credito { margin: 0; text-align: center; }
</style>
