<script>
  // Círculo grande do cronômetro (barra de baixo, página da receita e Modo Cozinhar).
  // Parado: ícone. Contando: anel + tempo do que acaba primeiro (e quantos há).
  // Quando chega um cronômetro novo, um cronômetro verde pequeno "sai" do círculo.
  // Com cronômetro ativo: botão vermelho ao lado, para abrir a janelinha sobre outros apps.
  import { untrack } from 'svelte';
  import Anel from './Anel.svelte';
  import Icone from './Icone.svelte';
  import { cron, abrirCronometro, ordenados, restante, relogioTexto, progresso, estadoDe } from '../lib/cronometros.svelte.js';
  import { abrirPip, aquecerPip, pipSuportado, pip } from '../lib/pip.svelte.js';
  import { nivelDeAlerta } from '../core/alertas.js';
  let { tamanho = 64, comPip = true, rotulo = false } = $props();

  const primeiro = $derived((cron.agora, ordenados()[0]) ?? null);
  const est = $derived(primeiro ? estadoDe(primeiro) : 'parado');
  const seg = $derived(primeiro ? restante(primeiro) : 0);
  const texto = $derived(!primeiro ? '' : primeiro.tocando ? 'Pronto' : relogioTexto(seg));
  const alerta = $derived(est === 'rodando' ? nivelDeAlerta(seg) : null);
  let visto = untrack(() => cron.novos);   // animação só para cronômetros iniciados daqui em diante
  let voos = $state([]);
  $effect(() => {
    const atual = cron.novos;
    if (atual <= visto) return;
    visto = atual;
    untrack(() => { voos = [...voos, atual]; aquecerPip(); });
    setTimeout(() => (voos = voos.filter((v) => v !== atual)), 1400);
  });
  const podePip = pipSuportado();
</script>

<div class="circulo" style:--t="{tamanho}px">
  <button class="grande" data-estado={est} onclick={abrirCronometro}
    aria-label={primeiro ? `Cronômetro: ${primeiro.rotulo}, ${texto}${cron.lista.length > 1 ? ` (e mais ${cron.lista.length - 1})` : ''}` : 'Cronômetro'}>
    <Anel {tamanho} {texto} resta={primeiro ? (primeiro.tocando ? 1 : 1 - progresso(primeiro)) : 1} estado={est} {alerta} espessura={Math.max(5, tamanho / 11)}>
      {#if !primeiro}<span class="ic"><Icone nome="cronometro" tamanho={Math.round(tamanho * .45)} /></span>{:else}<strong class="t">{texto}</strong>{/if}
    </Anel>
    {#if cron.lista.length > 1}<span class="conta" aria-hidden="true">{cron.lista.length}</span>{/if}
    {#each voos as v (v)}<span class="voo" aria-hidden="true"><Icone nome="cronometro" tamanho={20} /></span>{/each}
  </button>
  {#if rotulo}<span class="rot" aria-hidden="true">Cronômetro</span>{/if}
  {#if comPip && podePip && cron.lista.length}
    <button class="pip" class:aberto={pip.aberto} onclick={abrirPip} aria-label="Mostrar o cronômetro sobre outros apps"><Icone nome="cronometro" tamanho={18} /></button>
  {/if}
</div>

<style>
  .circulo { position: relative; display: grid; justify-items: center; }
  .grande { position: relative; display: grid; place-items: center; width: calc(var(--t) + 12px); height: calc(var(--t) + 12px); padding: 0; border-radius: 50%; cursor: pointer;
    background: var(--papel-folha); border: 1.5px solid var(--linha); color: var(--tinta-suave);
    box-shadow: 0 -2px 0 rgba(255,255,255,.6) inset, 0 10px 24px -10px rgba(60,40,20,.5); -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .grande:active { transform: scale(.95); }
  .grande[data-estado='rodando'] { border-color: color-mix(in srgb, var(--cron-vermelho) 35%, var(--linha)); }
  .grande[data-estado='pausado'] { border-color: color-mix(in srgb, var(--cron-amarelo) 55%, var(--linha)); }
  .ic { display: grid; place-items: center; color: var(--tinta-suave); }
  .t { font-family: var(--fonte-titulo); font-variation-settings: var(--titulo-variacao); font-variant-numeric: tabular-nums; font-weight: 700; color: var(--tinta);
    font-size: calc(var(--t) * .24); letter-spacing: -.03em; }
  .conta { position: absolute; top: -2px; right: -2px; min-width: 22px; height: 22px; padding: 0 5px; border-radius: 11px; background: var(--tinta); color: var(--papel-folha);
    font: 800 .72rem/22px var(--fonte-texto); text-align: center; box-shadow: 0 0 0 2px var(--papel-folha); }
  .voo { position: absolute; left: 50%; top: 50%; translate: -50% -50%; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%;
    background: var(--cron-verde); color: #fff; box-shadow: 0 4px 12px -4px rgba(40,60,20,.6); pointer-events: none; animation: voar 1.3s var(--mola-padrao) forwards; }
  @keyframes voar {
    0% { transform: scale(.3); opacity: 0; }
    25% { transform: scale(1.1); opacity: 1; }
    100% { transform: translate(-26px, calc(var(--t) * -1.3)) scale(.8) rotate(-18deg); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) { .voo { animation-duration: .6s; } }
  .rot { font-size: .72rem; font-weight: 700; color: var(--tinta-suave); margin-top: 2px; }
  .pip { position: absolute; right: calc(-1 * (34px + .35rem)); bottom: 0; width: 34px; height: 34px; border-radius: 50%; border: 0; padding: 0; cursor: pointer;
    display: grid; place-items: center; background: var(--cron-vermelho); color: #fff; box-shadow: 0 4px 10px -4px rgba(150,30,20,.7); }
  .pip.aberto { outline: 2px solid var(--cron-vermelho); outline-offset: 2px; }
  .pip:active { transform: scale(.92); }
</style>
