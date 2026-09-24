<script>
  // Receita repetida: Atualizar / Manter as duas / Cancelar.
  import Folha from './Folha.svelte';
  import { MOTIVO_DUPLICADA } from '../core/duplicadas.js';
  let { aberta = $bindable(false), dup = null, aoEscolher } = $props();
  const escolher = (op) => { aberta = false; aoEscolher?.(op); };
  const quando = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');
</script>

<Folha bind:aberta titulo="Receita repetida">
  {#if dup}
    <p>{MOTIVO_DUPLICADA[dup.motivo]}</p>
    <p class="existente folha-papel"><strong>{dup.registro.dados.titulo}</strong>
      <small class="meta">no caderno desde {quando(dup.registro.criadoEm)}{dup.registro.original ? ' · editada por você' : ''}</small></p>
    <div class="opcoes">
      <button class="botao primario bloco" onclick={() => escolher('atualizar')}>
        <span><strong>Atualizar a do caderno</strong><small>Fica a versão nova. Favorita, anotações, coleções e fotos continuam.</small></span></button>
      <button class="botao leve bloco" onclick={() => escolher('duas')}>
        <span><strong>Manter as duas</strong><small>A nova entra como outra receita.</small></span></button>
      <button class="botao bloco sutil" onclick={() => escolher('cancelar')}>Cancelar</button>
    </div>
  {/if}
</Folha>

<style>
  p { margin: 0 0 .75rem; }
  .existente { padding: .7rem .9rem; display: grid; gap: .15rem; }
  .opcoes { display: grid; gap: .5rem; }
  .opcoes span { display: grid; text-align: left; gap: .1rem; }
  .opcoes small { font-weight: 400; font-size: .82rem; opacity: .85; }
  .sutil { border-color: transparent; color: var(--tinta-suave); }
</style>
