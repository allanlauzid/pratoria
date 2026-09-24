<script>
  // Cronômetro pré-configurado de um passo (Modo Cozinhar, página da receita e lista do cronômetro).
  // Antes de iniciar: − / + e um ▶ grande (ou + grande, se já houver outros cronômetros).
  // Contando: tocar no cartão pausa/continua; só o ↺ à direita. Fundo verde pulsando (contando) ou cinza (pausado).
  import Anel from './Anel.svelte';
  import Icone from './Icone.svelte';
  import { cron, iniciarCronometro, porChave, alternar, parar, restante, relogioTexto, progresso, estadoDe } from '../lib/cronometros.svelte.js';
  import { nivelDeAlerta } from '../core/alertas.js';
  import { rotuloDuracao } from '../core/tempos.js';

  let { tempo, chave, rotulo = '', detalhe = '', receitaId = '', titulo = '', compacto = true } = $props();
  let escolhido = $state(null);                 // segundos (null = o sugerido)
  const dur = $derived(escolhido ?? tempo.min);
  const ativo = $derived(porChave(chave));
  const estado = $derived(ativo ? estadoDe(ativo) : 'parado');
  const outros = $derived(cron.lista.length > 0);
  const passo = (s) => (s <= 60 ? 15 : s < 1800 ? 60 : s < 7200 ? 300 : 1800);
  const menos = () => (escolhido = Math.max(15, dur - passo(dur - 1)));
  const mais = () => (escolhido = dur + passo(dur));
  const iniciar = () => iniciarCronometro({ min: dur, max: Math.max(dur, tempo.max) }, { rotulo, receitaId, titulo, chave });
  function zerar(e) { e?.stopPropagation(); if (ativo) parar(ativo.id); escolhido = null; }
  function tocarCartao() { if (!ativo) return; if (ativo.tocando) zerar(); else alternar(ativo.id); }
  const seg = $derived(ativo ? (cron.agora, restante(ativo)) : dur);
  const texto = $derived(ativo?.tocando ? 'Pronto' : relogioTexto(seg));
  const resta = $derived(ativo ? (cron.agora, 1 - progresso(ativo)) : 1);
  const alerta = $derived(ativo && estado === 'rodando' ? nivelDeAlerta(seg) : null);
  const legenda = $derived(estado === 'pronto' ? 'Tempo esgotado! Toque para parar.' : ativo ? ''
    : escolhido != null && escolhido !== tempo.min ? `Sugerido: ${rotuloDuracao(tempo.min)}` : tempo.max > tempo.min ? `Pode ir até ${rotuloDuracao(tempo.max)}` : 'Tempo da receita');
  const rotuloAcao = $derived(estado === 'rodando' ? 'Pausar' : estado === 'pausado' ? 'Continuar' : 'Parar alarme');
</script>

{#if ativo}
  <div class="cc ativo" class:compacto data-estado={estado} data-sem-virar role="button" tabindex="0"
    aria-label={`${rotulo || rotuloDuracao(ativo.duracao)}: ${texto}. ${rotuloAcao}.`}
    onclick={tocarCartao} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tocarCartao())}>
    <Anel tamanho={compacto ? 52 : 64} {texto} {resta} {estado} {alerta} />
    <div class="txt">
      <strong>{rotulo}{#if detalhe}<span class="det">&nbsp;· {detalhe}</span>{/if}</strong>
      {#if legenda}<small role="alert">{legenda}</small>{/if}
    </div>
    <div class="ctl">
      <button class="b" onclick={zerar} aria-label="Reiniciar no tempo sugerido"><Icone nome="reiniciar" tamanho={22} /></button>
    </div>
  </div>
{:else}
  <div class="cc" class:compacto data-estado="parado" data-sem-virar role="group" aria-label={`Cronômetro ${rotulo}: ${rotuloDuracao(dur)}`}>
    <Anel tamanho={compacto ? 52 : 64} {texto} resta={1} estado="parado" />
    <div class="txt">
      <strong>{rotulo}{#if detalhe}<span class="det">&nbsp;· {detalhe}</span>{/if}</strong>
      <small>{legenda}</small>
    </div>
    <div class="ctl">
      <button class="b" onclick={menos} aria-label="Diminuir tempo">−</button>
      <button class="b" onclick={mais} aria-label="Aumentar tempo">+</button>
      <button class="b iniciar" onclick={iniciar} aria-label={`${outros ? 'Adicionar cronômetro de' : 'Iniciar'} ${rotuloDuracao(dur)}`}>
        <Icone nome={outros ? 'mais' : 'tocar'} tamanho={outros ? 34 : 30} />
      </button>
    </div>
  </div>
{/if}

<style>
  .cc { position: relative; isolation: isolate; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: .6rem; padding: .35rem .45rem .35rem .4rem; box-sizing: border-box;
    border-radius: 18px; background: var(--papel-folha); border: 1.5px solid color-mix(in srgb, var(--mostarda) 45%, var(--linha));
    box-shadow: 0 1px 0 rgba(60,40,20,.05), 0 6px 16px -10px rgba(60,40,20,.35); font-family: var(--fonte-texto); }
  /* fundo translúcido (nunca cor chapada): verde pulsando = contando; cinza parado = pausado */
  .cc::before { content: ''; position: absolute; inset: 0; z-index: -1; border-radius: inherit; background: transparent; }
  .ativo { cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
  .ativo:active { transform: scale(.985); }
  [data-estado='rodando'] { border-color: color-mix(in srgb, var(--cron-verde) 45%, var(--linha)); }
  [data-estado='rodando']::before { background: var(--cron-verde); opacity: .1; animation: respirar 2.4s ease-in-out infinite; }
  [data-estado='pausado'] { border-color: color-mix(in srgb, var(--cron-cinza) 45%, var(--linha)); }
  [data-estado='pausado']::before { background: var(--cron-cinza); opacity: .16; }
  [data-estado='pronto'] { border-color: var(--cron-vermelho); }
  [data-estado='pronto']::before { background: var(--cron-vermelho); opacity: .1; animation: respirar-forte 1s ease-in-out infinite; }
  @keyframes respirar { 50% { opacity: .24; } }
  @keyframes respirar-forte { 50% { opacity: .28; } }
  @media (prefers-reduced-motion: reduce) { .cc::before { animation: none !important; } }
  .txt { display: grid; min-width: 0; line-height: 1.2; }
  .txt strong { font-size: .92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--tinta); }
  .det { font-weight: 400; color: var(--tinta-suave); }
  .txt small { font-size: .74rem; color: var(--tinta-suave); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  [data-estado='pronto'] .txt small { color: var(--cron-vermelho); white-space: normal; }
  .ctl { display: flex; gap: .3rem; align-items: center; }
  .b { width: 40px; height: 40px; border-radius: 999px; border: 1.5px solid var(--linha); background: var(--papel); color: var(--tinta); font: 800 1.1rem/1 var(--fonte-texto);
    display: grid; place-items: center; cursor: pointer; padding: 0; touch-action: manipulation; }
  .b:active { transform: scale(.94); }
  /* ▶ / + grande: o ícone pode ser maior que o botão */
  .iniciar { width: 48px; height: 48px; border: 0; background: var(--terracota-forte); color: #fff; overflow: visible; box-shadow: 0 4px 10px -4px rgba(142,60,36,.6); }
  .iniciar :global(svg) { margin-left: 2px; }
  .iniciar :global(svg path) { stroke-width: 2.4; fill: currentColor; }
  .compacto .b { width: 36px; height: 36px; font-size: 1rem; }
  .compacto .iniciar { width: 44px; height: 44px; }
  @media (max-width: 360px) {
    .cc { gap: .4rem; }
    .compacto .b { width: 32px; height: 32px; font-size: .95rem; }
    .compacto .iniciar { width: 40px; height: 40px; }
    .compacto .ctl { gap: .2rem; }
    .compacto :global(.anel) { width: 46px !important; height: 46px !important; }
    .compacto :global(.anel svg) { width: 46px; height: 46px; }
  }
</style>
