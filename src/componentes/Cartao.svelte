<script>
  import ImagemReceita from './ImagemReceita.svelte';
  import Icone from './Icone.svelte';
  import { formatarMinutos, tempoAtivo } from '../lib/formatar.js';
  let { registro } = $props();
  const r = $derived(registro.dados);
  const tempo = $derived(formatarMinutos(tempoAtivo(r)));
</script>

<a class="cartao" href={`#/receita/${registro.id}`}>
  <div class="foto"><ImagemReceita id={registro.id} /></div>
  <div class="texto">
    {#if r.categoria}<span class="rotulo">{r.categoria}</span>{/if}
    <h3>{r.titulo}</h3>
    <p class="meta">
      {#if tempo}<span><Icone nome="relogio" tamanho={16} /> {tempo}</span>{/if}
      {#if r.rendimento?.texto}<span>{r.rendimento.texto}</span>{/if}
      {#if registro.pessoal?.favorita}<span class="fav" aria-label="Favorita"><Icone nome="coracao" tamanho={16} /></span>{/if}
    </p>
  </div>
</a>

<style>
  .cartao {
    display: grid; grid-template-columns: 7.5rem 1fr; gap: .9rem; align-items: center;
    padding: .6rem; text-decoration: none; color: inherit;
    background: var(--papel-folha); border: 1px solid var(--linha); border-radius: var(--raio-m);
    box-shadow: var(--sombra-baixa); transition: transform var(--dur-curta) var(--mola-padrao);
  }
  .cartao:active { transform: scale(.985); }
  .foto { aspect-ratio: 4 / 3; border-radius: 8px; background: var(--papel); overflow: hidden; }
  h3 { font-size: 1.15rem; margin: .1rem 0 .3rem; }
  .meta { display: flex; flex-wrap: wrap; gap: .25rem .75rem; margin: 0; }
  .meta span { display: inline-flex; align-items: center; gap: .25rem; }
  .fav { color: var(--terracota); }
  @media (min-width: 40rem) {
    .cartao { grid-template-columns: 1fr; align-items: start; padding: .75rem; }
    .foto { aspect-ratio: 3 / 2; }
    .texto { padding: 0 .25rem .25rem; }
  }
</style>
