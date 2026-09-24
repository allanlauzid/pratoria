<script>
  import { rota } from './lib/rota.svelte.js';
  import { app } from './lib/caderno.svelte.js';
  import Navegacao from './componentes/Navegacao.svelte';
  import Avisos from './componentes/Avisos.svelte';
  import TelaCaderno from './telas/Caderno.svelte';
  import TelaReceita from './telas/Receita.svelte';
  import TelaImportar from './telas/Importar.svelte';
  import TelaReceber from './telas/Receber.svelte';
  import TelaAjustes from './telas/Ajustes.svelte';
  import TelaCompras from './telas/Compras.svelte';
  import TelaEditor from './telas/Editor.svelte';
  import BoasVindas from './telas/BoasVindas.svelte';
  import Cronometros from './componentes/Cronometros.svelte';
  import FolhaCronometro from './componentes/FolhaCronometro.svelte';
  import VozControle from './componentes/VozControle.svelte';
  import AlarmeTela from './componentes/AlarmeTela.svelte';
  import { iniciarPipAutomatico } from './lib/pip.svelte.js';
  $effect(() => { if (app.pronto) iniciarPipAutomatico(); });

  // Rolagem ao topo ao trocar de tela (exceto ao abrir/fechar o livro).
  let ultima = '';
  $effect(() => {
    const chave = rota.nome === 'cozinhar' ? `receita:${rota.params.id}` : `${rota.nome}:${rota.params.id ?? ''}`;
    if (chave !== ultima) { ultima = chave; scrollTo({ top: 0 }); }
  });
</script>

<a class="pular" href="#conteudo" onclick={(e) => { e.preventDefault(); document.getElementById('conteudo')?.focus(); }}>Pular para o conteúdo</a>

<div class="casca" class:em-receita={['receita', 'cozinhar', 'editar', 'escrever'].includes(rota.nome)}>
  <Navegacao />
  <main id="conteudo" tabindex="-1">
    {#if app.erro}
      <p class="erro">{app.erro}</p>
    {:else if !app.pronto}
      <p class="carregando" aria-busy="true">Abrindo o caderno…</p>
    {:else if rota.nome === 'receita' || rota.nome === 'cozinhar'}
      {#key rota.params.id}<TelaReceita id={rota.params.id} cozinhando={rota.nome === 'cozinhar'} />{/key}
    {:else if rota.nome === 'importar'}
      <TelaImportar />
    {:else if rota.nome === 'receber'}
      <TelaReceber />
    {:else if rota.nome === 'ajustes'}
      <TelaAjustes />
    {:else if rota.nome === 'compras'}
      <TelaCompras />
    {:else if rota.nome === 'editar' || rota.nome === 'escrever'}
      {#key rota.params.id}<TelaEditor id={rota.params.id ?? null} />{/key}
    {:else}
      <TelaCaderno />
    {/if}
  </main>
</div>
{#if app.pronto && rota.nome !== 'cozinhar'}<Cronometros />{/if}
{#if app.pronto}<FolhaCronometro /><VozControle /><AlarmeTela />{/if}
{#if app.pronto && app.boasVindas}<BoasVindas />{/if}
<Avisos />

<style>
  .casca { min-height: 100dvh; }
  main { padding-bottom: calc(84px + env(safe-area-inset-bottom)); outline: none; }
  .pular { position: fixed; left: .75rem; top: -4rem; z-index: 5000; background: var(--tinta); color: var(--papel-folha); padding: .6rem 1rem; border-radius: var(--raio-m); }
  .pular:focus { top: calc(.75rem + env(safe-area-inset-top)); }
  .carregando, .erro { padding: 3rem 1.25rem; text-align: center; color: var(--tinta-suave); }
  .erro { color: var(--erro); }
  /* no celular, a receita troca a barra inferior pela barra "Cozinhar" */
  @media (max-width: 63.99rem) { .em-receita :global(.nav) { display: none; } .em-receita main { padding-bottom: 0; } }
  @media (min-width: 64rem) { main { margin-left: 15rem; padding-bottom: 3rem; } }
</style>
