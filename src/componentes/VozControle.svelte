<script>
  // Controle flutuante da leitura em voz alta (fora do livro).
  import Icone from './Icone.svelte';
  import { voz, pausar, retomar, parar, mudarTaxa } from '../lib/voz.svelte.js';
  const TAXAS = [0.85, 1, 1.2];
</script>

{#if voz.falando && voz.origem !== 'livro'}
  <div class="voz" role="region" aria-label="Leitura em voz alta">
    <span class="onda" class:parada={voz.pausado} aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <span class="txt"><strong>{voz.pausado ? 'Pausado' : 'Lendo em voz alta'}</strong><small>{voz.titulo}</small></span>
    <button class="b" onclick={() => mudarTaxa(TAXAS[(TAXAS.indexOf(voz.taxa) + 1) % TAXAS.length] ?? 1)} aria-label="Velocidade da leitura">{String(voz.taxa).replace('.', ',')}×</button>
    {#if voz.pausado}<button class="b" onclick={retomar} aria-label="Continuar"><Icone nome="tocar" tamanho={18} /></button>
    {:else}<button class="b" onclick={pausar} aria-label="Pausar"><Icone nome="pausa" tamanho={18} /></button>{/if}
    <button class="b" onclick={() => parar()} aria-label="Parar a leitura"><Icone nome="parar" tamanho={18} /></button>
  </div>
{/if}

<style>
  .voz { position: fixed; left: 50%; translate: -50% 0; bottom: calc(96px + env(safe-area-inset-bottom)); z-index: 2400; width: min(calc(100% - 1rem), 26rem);
    display: grid; grid-template-columns: auto 1fr auto auto auto; gap: .45rem; align-items: center; padding: .4rem .45rem .4rem .8rem; border-radius: 999px;
    background: var(--tinta); color: var(--papel-folha); box-shadow: 0 10px 28px -10px rgba(0,0,0,.5); }
  @media (min-width: 64rem) { .voz { left: calc(50% + 7.5rem); bottom: 1.5rem; } }
  .txt { display: grid; line-height: 1.15; min-width: 0; }
  small { font-size: .72rem; opacity: .8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .b { min-width: 40px; height: 40px; border-radius: 999px; border: 0; background: rgba(255,255,255,.12); color: inherit; font-weight: 800; cursor: pointer; display: grid; place-items: center; padding: 0 .5rem; font-size: .85rem; }
  .onda { display: flex; gap: 3px; align-items: center; height: 20px; }
  .onda i { width: 3px; border-radius: 2px; background: var(--mostarda); animation: onda 1s ease-in-out infinite; height: 8px; }
  .onda i:nth-child(2) { animation-delay: .15s; } .onda i:nth-child(3) { animation-delay: .3s; } .onda i:nth-child(4) { animation-delay: .45s; }
  .onda.parada i { animation: none; height: 6px; }
  @keyframes onda { 50% { height: 18px; } }
  @media (prefers-reduced-motion: reduce) { .onda i { animation: none; height: 10px; } }
</style>
