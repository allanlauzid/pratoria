<script>
  // Cronômetro pré-configurado de um passo (Modo Mão na Massa e página da receita).
  // Sempre começa no tempo sugerido pela receita; dá para ajustar antes de iniciar e reiniciar depois.
  import Anel from './Anel.svelte';
  import Icone from './Icone.svelte';
  import { cron, iniciarCronometro, porChave, pausar, retomar, parar, maisUmMinuto, restante, relogioTexto, progresso } from '../lib/cronometros.svelte.js';
  import { rotuloDuracao } from '../core/tempos.js';

  let { tempo, chave, rotulo = '', detalhe = '', receitaId = '', titulo = '', compacto = true } = $props();
  let escolhido = $state(null);                 // segundos (null = o sugerido)
  const dur = $derived(escolhido ?? tempo.min);
  const ativo = $derived(porChave(chave));
  const estado = $derived(!ativo ? 'parado' : ativo.tocando ? 'pronto' : ativo.pausadoCom != null ? 'pausado' : 'rodando');
  const passo = (s) => (s <= 60 ? 15 : s < 1800 ? 60 : s < 7200 ? 300 : 1800);
  const menos = () => (escolhido = Math.max(15, dur - passo(dur - 1)));
  const mais = () => (escolhido = dur + passo(dur));
  const iniciar = () => iniciarCronometro({ min: dur, max: Math.max(dur, tempo.max) }, { rotulo, receitaId, titulo, chave });
  function zerar() { if (ativo) parar(ativo.id); escolhido = null; }
  const texto = $derived(ativo ? (ativo.tocando ? 'Pronto' : relogioTexto(restante(ativo))) : relogioTexto(dur));
  const resta = $derived(ativo ? (cron.agora, 1 - progresso(ativo)) : 1);
  const legenda = $derived(estado === 'pronto' ? 'Tempo esgotado!' : estado === 'rodando' ? 'Contando…' : estado === 'pausado' ? 'Pausado'
    : escolhido != null && escolhido !== tempo.min ? `Sugerido: ${rotuloDuracao(tempo.min)}` : tempo.max > tempo.min ? `Pode ir até ${rotuloDuracao(tempo.max)}` : 'Tempo da receita');
</script>

<div class="cc" class:compacto data-estado={estado} data-sem-virar role="group" aria-label={`Cronômetro ${rotulo}: ${rotuloDuracao(dur)}`}>
  <Anel tamanho={compacto ? 52 : 64} {texto} {resta} {estado} />
  <div class="txt">
    <strong>{rotulo}{#if detalhe}<span class="det">&nbsp;· {detalhe}</span>{/if}</strong>
    <small aria-live="polite">{legenda}</small>
  </div>
  <div class="ctl">
    {#if estado === 'parado'}
      <button class="b" onclick={menos} aria-label="Diminuir tempo">−</button>
      <button class="b" onclick={mais} aria-label="Aumentar tempo">+</button>
      <button class="b play" onclick={iniciar} aria-label={`Iniciar ${rotuloDuracao(dur)}`}><Icone nome="tocar" tamanho={20} /></button>
    {:else if estado === 'rodando'}
      <button class="b" onclick={() => maisUmMinuto(ativo.id)} aria-label="Mais 1 minuto">+1</button>
      <button class="b" onclick={zerar} aria-label="Reiniciar no tempo sugerido">↺</button>
      <button class="b play" onclick={() => pausar(ativo.id)} aria-label="Pausar"><Icone nome="pausa" tamanho={20} /></button>
    {:else if estado === 'pausado'}
      <button class="b" onclick={zerar} aria-label="Reiniciar no tempo sugerido">↺</button>
      <button class="b play" onclick={() => retomar(ativo.id)} aria-label="Continuar"><Icone nome="tocar" tamanho={20} /></button>
    {:else}
      <button class="b" onclick={() => maisUmMinuto(ativo.id)} aria-label="Mais 1 minuto">+1</button>
      <button class="b play ok" onclick={zerar}>OK</button>
    {/if}
  </div>
</div>

<style>
  .cc { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: .6rem; padding: .35rem .45rem .35rem .4rem; box-sizing: border-box;
    border-radius: 18px; background: var(--papel-folha); border: 1.5px solid color-mix(in srgb, var(--mostarda) 45%, var(--linha));
    box-shadow: 0 1px 0 rgba(60,40,20,.05), 0 6px 16px -10px rgba(60,40,20,.35); font-family: var(--fonte-texto); }
  .cc[data-estado='rodando'] { border-color: color-mix(in srgb, var(--terracota) 55%, var(--linha)); }
  .cc[data-estado='pronto'] { border-color: var(--oliva); background: color-mix(in srgb, var(--oliva) 10%, var(--papel-folha)); }
  .txt { display: grid; min-width: 0; line-height: 1.2; }
  .txt strong { font-size: .92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--tinta); }
  .det { font-weight: 400; color: var(--tinta-suave); }
  .txt small { font-size: .74rem; color: var(--tinta-suave); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  [data-estado='pronto'] .txt small { color: var(--oliva); }
  .ctl { display: flex; gap: .3rem; align-items: center; }
  .b { width: 40px; height: 40px; border-radius: 999px; border: 1.5px solid var(--linha); background: var(--papel); color: var(--tinta); font: 800 1.1rem/1 var(--fonte-texto);
    display: grid; place-items: center; cursor: pointer; padding: 0; touch-action: manipulation; }
  .b:active { transform: scale(.94); }
  .play { width: 46px; height: 46px; border: 0; background: var(--terracota-forte); color: #fff; box-shadow: 0 4px 10px -4px rgba(142,60,36,.6); }
  [data-estado='rodando'] .play { background: var(--tinta); }
  .play.ok { background: var(--oliva); font-size: .95rem; }
  .compacto .b { width: 36px; height: 36px; font-size: 1rem; }
  .compacto .play { width: 42px; height: 42px; }
  @media (max-width: 360px) {
    .cc { gap: .4rem; }
    .compacto .b { width: 32px; height: 32px; font-size: .95rem; }
    .compacto .play { width: 38px; height: 38px; }
    .compacto .ctl { gap: .2rem; }
    .compacto :global(.anel) { width: 46px !important; height: 46px !important; }
    .compacto :global(.anel svg) { width: 46px; height: 46px; }
  }
</style>
