<script>
  // Texto de um passo com os tempos viráveis em cronômetro (⏱). Mesma marcação de htmlPasso() (medição do livro).
  import { trechosComTempo } from '../core/tempos.js';
  import { iniciarCronometro } from '../lib/cronometros.svelte.js';
  import { avisar } from '../lib/avisos.svelte.js';
  // chave: o 1º tempo do passo usa a mesma chave do cartão do livro (um cronômetro só por passo)
  let { texto, receitaId = '', titulo = '', passo = '', chave = '' } = $props();
  const trechos = $derived(trechosComTempo(texto));
  const primeiro = $derived(trechos.find((t) => t.tempo));
  function iniciar(t) {
    iniciarCronometro(t.tempo, { rotulo: passo ? `Passo ${passo}` : t.tempo.rotulo, receitaId, titulo, chave: t === primeiro ? chave : '' });
    avisar(`Cronômetro de ${t.tempo.rotulo.split('–')[0]} iniciado`);
  }
</script>

{#each trechos as t}{#if t.tempo}<button type="button" class="passo-tempo" onclick={() => iniciar(t)} aria-label={`Iniciar cronômetro: ${t.texto}`}>{t.texto}</button>{:else}{t.texto}{/if}{/each}
