<script>
  // Cronômetro livre (botão dedicado): escolha o tempo, dê um nome e inicie. Lista os que estão rodando.
  import Folha from './Folha.svelte';
  import Anel from './Anel.svelte';
  import Icone from './Icone.svelte';
  import CartaoCronometro from './CartaoCronometro.svelte';
  import { cron, iniciarCronometro, relogioTexto, ordenados } from '../lib/cronometros.svelte.js';
  import { rotuloDuracao } from '../core/tempos.js';

  const PRONTOS = [1, 3, 5, 10, 15, 20, 30, 45, 60];
  let seg = $state(10 * 60);
  let nome = $state('');
  const passo = (s) => (s < 600 ? 60 : s < 3600 ? 300 : 900);
  function iniciar() {
    iniciarCronometro({ min: seg, max: seg }, { rotulo: nome.trim() || rotuloDuracao(seg), chave: `livre-${Date.now()}` });
    nome = '';
  }
</script>

<Folha bind:aberta={cron.folhaAberta} titulo="Cronômetro">
  {#if cron.folhaAberta}
    <div class="mostrador">
      <button class="ajuste" onclick={() => (seg = Math.max(60, seg - passo(seg - 1)))} aria-label="Diminuir">−</button>
      <Anel tamanho={176} texto={relogioTexto(seg)} sub={seg >= 3600 ? 'h : min : s' : 'min : s'} resta={Math.min(1, seg / 3600)} estado="parado" />
      <button class="ajuste" onclick={() => (seg = Math.min(24 * 3600, seg + passo(seg)))} aria-label="Aumentar">+</button>
    </div>
    <div class="prontos" role="group" aria-label="Tempos prontos">
      {#each PRONTOS as m}<button class="chip" aria-pressed={seg === m * 60} onclick={() => (seg = m * 60)}>{m < 60 ? `${m} min` : '1 h'}</button>{/each}
    </div>
    <label class="campo"><span>Para quê? <small>(opcional)</small></span>
      <input class="entrada" bind:value={nome} maxlength="40" placeholder="Ex.: bolo no forno, arroz, massa" enterkeyhint="go" onkeydown={(e) => e.key === 'Enter' && iniciar()} /></label>
    <button class="botao primario bloco iniciar" onclick={iniciar}>
      <span class="ic-grande"><Icone nome={cron.lista.length ? 'mais' : 'tocar'} tamanho={30} /></span>
      {cron.lista.length ? 'Adicionar' : 'Iniciar'} {rotuloDuracao(seg)}
    </button>

    {#if cron.lista.length}
      <div class="lista">
        {#each ordenados() as c (c.id)}
          <CartaoCronometro tempo={{ min: c.duracao, max: c.duracao }} chave={c.chave || c.id} rotulo={c.rotulo} detalhe={c.titulo} compacto={false} />
        {/each}
      </div>
    {/if}
    <p class="credito">Toca e vibra quando acabar. Com a tela bloqueada o aviso pode atrasar — no Modo Cozinhar a tela fica ligada. Dois toques na tela param o alarme.</p>
  {/if}
</Folha>

<style>
  .mostrador { display: flex; align-items: center; justify-content: center; gap: 1rem; margin: .25rem 0 1rem; }
  .ajuste { width: 56px; height: 56px; border-radius: 999px; border: 1.5px solid var(--linha); background: var(--papel); font: 800 1.6rem/1 var(--fonte-texto); color: var(--tinta); cursor: pointer; }
  .ajuste:active { transform: scale(.94); }
  .prontos { display: flex; flex-wrap: wrap; gap: .4rem; justify-content: center; margin-bottom: 1rem; }
  .chip { min-height: 40px; padding: .3rem .85rem; border-radius: 999px; border: 1.5px solid var(--linha); background: var(--papel-folha); font-weight: 700; cursor: pointer; }
  .chip[aria-pressed='true'] { background: var(--mostarda); border-color: var(--mostarda); color: #2a1d08; }
  .campo small { font-weight: 400; }
  .iniciar { margin-top: .75rem; min-height: 56px; font-size: 1.1rem; }
  .lista { display: grid; gap: .5rem; margin-top: 1.25rem; }
  .ic-grande { display: grid; place-items: center; margin: -6px 0; }
  .ic-grande :global(path) { stroke-width: 2.4; fill: currentColor; }
  .credito { margin: 1rem 0 0; text-align: center; }
</style>
