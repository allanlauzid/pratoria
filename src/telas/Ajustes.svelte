<script>
  import Topo from '../componentes/Topo.svelte';
  import Icone from '../componentes/Icone.svelte';
  import NuvemStatus from '../componentes/NuvemStatus.svelte';
  import PreferenciasPrompt from '../componentes/PreferenciasPrompt.svelte';
  import AjustesExibicao from '../componentes/AjustesExibicao.svelte';
  import { app, salvarNome, pedirPersistencia, exportarCaderno, restaurarCaderno, usoDoArmazenamento, renomearColecao, apagarColecao } from '../lib/caderno.svelte.js';
  import { baixarArquivo } from '../lib/baixar.js';
  import { tamanhoLegivel } from '../core/lembretes.js';
  import Folha from '../componentes/Folha.svelte';
  import { pwa, instalar } from '../lib/pwa.svelte.js';
  import { avisar } from '../lib/avisos.svelte.js';
  import { PROMPT_VERSAO } from '../core/import/prompts.js';

  let nome = $state(app.perfil.nome);
  let ocupado = $state(false);

  async function guardarNome() { await salvarNome(nome); avisar('Nome salvo'); }

  let uso = $state(null);
  $effect(() => { app.receitas.length; usoDoArmazenamento().then((u) => (uso = u)); });

  async function exportar() {
    ocupado = true;
    try {
      const { arquivo, receitas } = await exportarCaderno();
      baixarArquivo(arquivo);
      avisar(`Backup com ${receitas} receita(s) baixado`);
    } catch (e) { console.error(e); avisar('Não consegui fazer o backup.'); }
    finally { ocupado = false; }
  }
  async function importar(e) {
    const input = e.currentTarget, f = input.files?.[0]; if (!f) return;
    ocupado = true;
    try {
      const { novas, atualizadas } = await restaurarCaderno(f);
      avisar(`${novas} nova(s), ${atualizadas} atualizada(s)`);
    } catch (err) { avisar(err.message || 'Arquivo inválido'); }
    finally { ocupado = false; input.value = ''; }
  }

  // coleções
  let editandoColecao = $state('');
  let novoNome = $state('');
  let colecaoAberta = $state(false);
  const qtd = (c) => app.receitas.filter((r) => r.pessoal?.colecoes?.includes(c)).length;
  const abrirColecao = (c) => { editandoColecao = c; novoNome = c; colecaoAberta = true; };
  async function renomear() { await renomearColecao(editandoColecao, novoNome); colecaoAberta = false; avisar('Coleção renomeada'); }
  async function apagar() { await apagarColecao(editandoColecao); colecaoAberta = false; avisar('Coleção apagada (as receitas continuam no caderno)'); }
</script>

<Topo titulo="Mais" />

<div class="tela">
  <header><p class="rotulo">Mais</p><h1>Seu Pratoria</h1></header>

  <section class="folha-papel bloco">
    <h2>Seu nome</h2>
    <p class="meta">Vai no registro de cada receita que você importa ou compartilha.</p>
    <div class="linha">
      <input class="entrada" bind:value={nome} autocomplete="given-name" aria-label="Seu nome" />
      <button class="botao leve" onclick={guardarNome} disabled={nome.trim() === app.perfil.nome}>Salvar</button>
    </div>
  </section>

  <section class="folha-papel bloco">
    <h2>Sincronização</h2>
    <p><NuvemStatus /></p>
    <p class="meta">Suas receitas, fotos, ilustrações e preferências ficam sempre neste aparelho. Com uma conta (em breve), também ficam na nuvem, e aqui mostra se está tudo sincronizado.</p>
  </section>

  <details class="folha-papel bloco dobra">
    <summary><h2>Preferências da receita</h2><span class="meta">Como a IA organiza as receitas que você importa</span></summary>
    <PreferenciasPrompt />
  </details>

  <details class="folha-papel bloco dobra">
    <summary><h2>Exibição</h2><span class="meta">Medidas, tamanho do texto, seções e o que você tem em casa</span></summary>
    <AjustesExibicao comPorcoes={false} />
  </details>

  <section class="folha-papel bloco">
    <h2>Coleções</h2>
    {#if app.colecoes.length}
      <ul class="colecoes">
        {#each app.colecoes as c}
          <li><button onclick={() => abrirColecao(c)}><Icone nome="etiqueta" tamanho={18} /><span>{c}</span><small class="meta">{qtd(c)} receita(s)</small><Icone nome="editar" tamanho={16} /></button></li>
        {/each}
      </ul>
    {:else}
      <p class="meta">Crie coleções na página de cada receita (ex.: “Natal”, “Marmitas”). Elas aparecem como filtro no caderno.</p>
    {/if}
  </section>

  <section class="folha-papel bloco">
    <h2>Instalar no celular</h2>
    {#if pwa.instalado}
      <p><Icone nome="check" tamanho={18} /> O Pratoria já está instalado.</p>
    {:else if pwa.podeInstalar}
      <p class="meta">Abre como app, funciona sem internet e protege suas receitas.</p>
      <button class="botao primario bloco" onclick={instalar}>Instalar o Pratoria</button>
    {:else if pwa.ios}
      <p class="meta">No iPhone: toque em <strong>Compartilhar</strong> no Safari e depois em <strong>Adicionar à Tela de Início</strong>. Importante: sem instalar, o Safari pode apagar os dados após alguns dias sem uso.</p>
    {:else}
      <p class="meta">Use a opção "Instalar app" ou "Adicionar à tela inicial" no menu do navegador.</p>
    {/if}
  </section>

  <section class="folha-papel bloco">
    <h2>Suas receitas ficam neste aparelho</h2>
    <p class="meta">Sem conta, tudo fica guardado só aqui. O backup é um único arquivo <strong>.pratoria</strong> com o caderno inteiro: receitas, fotos, desenhos a giz, coleções e cardápio.</p>
    <p class="meta">
      {#if app.backup.ultimo}Último backup: {new Date(app.backup.ultimo.em).toLocaleDateString('pt-BR')} ({app.backup.ultimo.receitas} receitas).{:else}Nenhum backup ainda.{/if}
      {#if uso?.usado}· O Pratoria ocupa {tamanhoLegivel(uso.usado)} neste aparelho.{/if}
    </p>
    <p>
      {#if app.persistente}<Icone nome="check" tamanho={18} /> Armazenamento protegido contra limpeza automática.
      {:else}<button class="botao leve" onclick={async () => avisar((await pedirPersistencia()) ? 'Armazenamento protegido' : 'O navegador não permitiu agora. Instalar o app ajuda.')}>Proteger armazenamento</button>{/if}
    </p>
    <div class="linha">
      <button class="botao leve" onclick={exportar} disabled={ocupado}><Icone nome="download" /> Fazer backup</button>
      <label class="botao leve"><Icone nome="upload" /> Restaurar
        <input class="visualmente-oculto" type="file" accept=".pratoria,.zip,application/zip,application/json,.json" onchange={importar} disabled={ocupado} />
      </label>
    </div>
  </section>

  <section class="folha-papel bloco">
    <h2>Conta</h2>
    <p class="meta">Em breve: entrar para guardar uma cópia na nuvem, usar em vários aparelhos e enviar receitas para contatos. O Pratoria continua funcionando sem conta.</p>
  </section>

  <Folha bind:aberta={colecaoAberta} titulo="Coleção">
    <label class="campo"><span>Nome</span><input class="entrada" bind:value={novoNome} maxlength="40" /></label>
    <div class="linha fim">
      <button class="botao leve perigo" onclick={apagar}><Icone nome="lixeira" /> Apagar coleção</button>
      <button class="botao primario" onclick={renomear} disabled={!novoNome.trim() || novoNome.trim() === editandoColecao}>Renomear</button>
    </div>
  </Folha>

  <p class="credito sobre">Pratoria · formato PRATORIA v1 · prompts {PROMPT_VERSAO}</p>
</div>

<style>
  .tela { width: min(100% - 2rem, 40rem); margin-inline: auto; padding-top: 1rem; display: grid; gap: 1rem; }
  h1 { font-size: var(--t-h2); }
  h2 { font-size: 1.2rem; }
  .bloco { padding: 1.1rem; display: grid; gap: .6rem; }
  .bloco p { margin: 0; display: flex; gap: .4rem; align-items: center; flex-wrap: wrap; }
  .linha { display: flex; gap: .5rem; flex-wrap: wrap; }
  .linha .entrada { flex: 1; min-width: 10rem; }
  label.botao { cursor: pointer; }
  .sobre { text-align: center; }
  .perigo { color: var(--erro); }
  .colecoes { list-style: none; margin: 0; padding: 0; display: grid; }
  .colecoes button { width: 100%; display: grid; grid-template-columns: auto 1fr auto auto; gap: .6rem; align-items: center; min-height: 48px; border: 0; border-bottom: 1px dashed var(--linha);
    background: transparent; font: inherit; font-weight: 700; color: var(--tinta); cursor: pointer; text-align: left; padding: 0 .25rem; }
  .fim { justify-content: space-between; margin-top: 1rem; }
  .dobra summary { cursor: pointer; display: grid; gap: .1rem; list-style: none; }
  .dobra summary::-webkit-details-marker { display: none; }
  .dobra summary h2::after { content: ' ›'; color: var(--tinta-fraca); }
  .dobra[open] summary h2::after { content: ' ⌄'; }
  @media (min-width: 64rem) { .tela { padding-top: 2.5rem; } }
</style>
