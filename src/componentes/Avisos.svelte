<script>
  import { avisos, fecharAviso } from '../lib/avisos.svelte.js';
  import { pwa, atualizarAgora, trava } from '../lib/pwa.svelte.js';
</script>

<div class="pilha" role="status" aria-live="polite">
  {#if pwa.novaVersao && !trava.cozinhando}
    <div class="aviso">
      <span>Uma nova versão do Pratoria está disponível.</span>
      <button class="botao leve" onclick={atualizarAgora}>Atualizar</button>
    </div>
  {/if}
  {#each avisos.lista as a (a.id)}
    <div class="aviso">
      <span>{a.texto}</span>
      {#if a.acao}<button class="botao leve" onclick={() => { a.acao.fazer(); fecharAviso(a.id); }}>{a.acao.rotulo}</button>{/if}
    </div>
  {/each}
</div>

<style>
  .pilha {
    position: fixed; left: 50%; transform: translateX(-50%); z-index: 3000;
    bottom: calc(76px + env(safe-area-inset-bottom)); width: min(100% - 2rem, 30rem);
    display: grid; gap: .5rem; pointer-events: none;
  }
  .aviso {
    pointer-events: auto; display: flex; align-items: center; justify-content: space-between; gap: .75rem;
    background: var(--tinta); color: var(--papel-folha); padding: .6rem .6rem .6rem 1rem; border-radius: var(--raio-m);
    box-shadow: 0 10px 30px -10px rgba(0,0,0,.5); font-size: .95rem; animation: sobe .22s var(--mola-padrao);
  }
  .aviso .botao { min-height: 40px; padding: .35rem .8rem; color: var(--tinta); }
  @keyframes sobe { from { transform: translateY(12px); opacity: 0; } }
  @media (min-width: 64rem) { .pilha { bottom: 1.5rem; margin-left: 7.5rem; } }
</style>
