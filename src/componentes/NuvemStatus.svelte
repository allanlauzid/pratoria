<script>
  // Indicador de sincronização (sempre visível). Sem conta: "Só neste aparelho".
  import Icone from './Icone.svelte';
  import { app } from '../lib/caderno.svelte.js';
  let { compacto = false } = $props();
  const rotulos = { local: 'Só neste aparelho', sincronizando: 'Sincronizando…', sincronizado: 'Sincronizado', pendente: 'Sincronização pendente' };
  const rotulo = $derived(rotulos[app.nuvem.estado] ?? rotulos.local);
</script>

<a class="nuvem" class:compacto href="#/ajustes" title={rotulo} aria-label={`Nuvem: ${rotulo}. Abrir ajustes`} data-estado={app.nuvem.estado}>
  <Icone nome="nuvem" tamanho={18} />{#if !compacto}<span>{rotulo}</span>{/if}
</a>

<style>
  .nuvem { display: inline-flex; align-items: center; gap: .35rem; min-height: 36px; padding: 0 .7rem; border-radius: 999px;
    border: 1px solid var(--linha); background: var(--papel-folha); color: var(--tinta-suave); font-size: .78rem; font-weight: 700; text-decoration: none; white-space: nowrap; }
  .compacto { width: 40px; height: 40px; padding: 0; justify-content: center; border-color: transparent; background: transparent; }
  [data-estado='sincronizado'] { color: var(--oliva); }
  [data-estado='pendente'] { color: var(--terracota-forte); }
</style>
