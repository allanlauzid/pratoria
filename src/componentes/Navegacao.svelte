<script>
  // Celular: barra inferior (Caderno · Compras · + · [Cronômetro grande, ocupando duas vagas]).
  //   "Mais" e a nuvem ficam no topo (Topo.svelte).
  // Desktop (≥ 64rem): trilho lateral (Caderno · Compras · Nova receita · Mais · Cronômetro · nuvem).
  // "+": criar (link, ChatGPT, formulário) ou receber de alguém (arquivo .pratoria, QR code).
  //   Descrições escondidas atrás do (i); o avião marca o que funciona sem internet.
  import Icone from './Icone.svelte';
  import Marca from './Marca.svelte';
  import NuvemStatus from './NuvemStatus.svelte';
  import Folha from './Folha.svelte';
  import CirculoCronometro from './CirculoCronometro.svelte';
  import { rota, ir } from '../lib/rota.svelte.js';
  import { cron, abrirCronometro } from '../lib/cronometros.svelte.js';
  let novo = $state(false);
  let info = $state(null);          // opção cuja descrição está aberta
  let infoAberta = $state(false);
  const itens = [
    { nome: 'caderno', href: '#/', rotulo: 'Caderno', icone: 'caderno' },
    { nome: 'compras', href: '#/compras', rotulo: 'Compras', icone: 'carrinho' },
    { nome: 'novo', rotulo: 'Novo', icone: 'mais', destaque: true },
    { nome: 'ajustes', href: '#/ajustes', rotulo: 'Mais', icone: 'menu', soDesktop: true },
  ];
  const ativo = (n) => rota.nome === n || (n === 'caderno' && ['receita', 'editar'].includes(rota.nome)) || (n === 'novo' && ['importar', 'escrever', 'receber'].includes(rota.nome));
  const grupos = [
    { titulo: 'Criar uma receita', opcoes: [
      { id: 'link', icone: 'link', titulo: 'Tenho um link de receita', desc: 'Você pode colar o link aqui para importar a receita.', ir: '/importar' },
      { id: 'escrever', icone: 'mensagem', titulo: 'Escrever e organizar com o ChatGPT', desc: 'Escreva do seu jeito (ou cole de onde tiver). O ChatGPT confere, pergunta o que faltar e devolve a receita organizada para você colar aqui.', ir: '/importar?modo=escrever' },
      { id: 'form', icone: 'escrever', titulo: 'Preencher o formulário', desc: 'Passo a passo, sem IA: lista de compras, etapas e passos. Os campos aparecem conforme você escreve.', ir: '/escrever', offline: true },
    ] },
    { titulo: 'Recebeu de alguém?', opcoes: [
      { id: 'arquivo', icone: 'arquivo', titulo: 'Abrir arquivo .pratoria', desc: 'Recebeu por WhatsApp, e-mail, AirDrop, Quick Share, Bluetooth ou Drive? Escolha o arquivo e revise antes de salvar. Também restaura um backup do caderno. (Recebeu um link do Pratoria? Basta tocar nele: a receita abre direto no app.)', arquivo: true, offline: true },
      { id: 'qr', icone: 'qr', titulo: 'Ler QR code', desc: 'Aponte a câmera para o QR mostrado na tela de outro celular. Cara a cara, sem internet.', ir: '/receber?qr=1', offline: true },
    ] },
  ];
  function escolher(o) { novo = false; ir(o.ir); }
  function arquivoEscolhido(e) {
    const f = e.currentTarget.files?.[0]; e.currentTarget.value = '';
    if (!f) return;
    novo = false; rota.cargaRecebida = f; ir('/receber');
  }
  function mostrarInfo(o) { info = o; infoAberta = true; }
</script>

<nav class="nav" aria-label="Principal">
  <div class="marca-lateral"><Marca /></div>
  <ul class="barra">
    {#each itens as i}
      <li class:so-desktop={i.soDesktop}>
        {#if i.href}
          <a href={i.href} aria-current={ativo(i.nome) ? 'page' : undefined}>
            <span class="ic"><Icone nome={i.icone} tamanho={24} /></span><span class="rot">{i.rotulo}</span>
          </a>
        {:else}
          <button class:destaque={i.destaque} onclick={() => (novo = true)} aria-haspopup="dialog" aria-current={ativo(i.nome) ? 'page' : undefined}>
            <span class="ic"><Icone nome={i.icone} tamanho={26} /></span><span class="rot">{i.rotulo}</span>
          </button>
        {/if}
      </li>
    {/each}
    <li class="vaga-crono"><div class="sobe"><CirculoCronometro tamanho={62} /></div></li>
  </ul>
  <button class="crono-lateral" onclick={abrirCronometro}>
    <span class="ic"><Icone nome="cronometro" tamanho={24} /></span><span class="rot">Cronômetro</span>{#if cron.lista.length}<span class="ponto">{cron.lista.length}</span>{/if}
  </button>
  <div class="nuvem-lateral"><NuvemStatus /></div>
</nav>

<Folha bind:aberta={novo} titulo="Nova receita">
  {#each grupos as g}
    <section class="grupo" aria-label={g.titulo}>
      <h3>{g.titulo}</h3>
      <ul class="opcoes">
        {#each g.opcoes as o (o.id)}
          <li class="opcao">
            {#if o.arquivo}
              <label class="escolher">
                <span class="ic2"><Icone nome={o.icone} /></span>
                <span class="txt"><strong>{o.titulo}</strong>{#if o.offline}<small class="aviao"><Icone nome="aviao" tamanho={14} /> funciona até no modo avião</small>{/if}</span>
                <input class="visualmente-oculto" type="file" accept=".pratoria,.zip,.md,.txt,application/zip,text/markdown,text/plain" onchange={arquivoEscolhido} />
              </label>
            {:else}
              <button class="escolher" onclick={() => escolher(o)}>
                <span class="ic2"><Icone nome={o.icone} /></span>
                <span class="txt"><strong>{o.titulo}</strong>{#if o.offline}<small class="aviao"><Icone nome="aviao" tamanho={14} /> funciona até no modo avião</small>{/if}</span>
              </button>
            {/if}
            <button class="info" onclick={() => mostrarInfo(o)} aria-label={`Sobre: ${o.titulo}`}><Icone nome="info" tamanho={20} /></button>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</Folha>

<Folha bind:aberta={infoAberta} titulo={info?.titulo ?? ''}>
  {#if info}
    <p class="desc">{info.desc}</p>
    {#if info.offline}<p class="aviao grande"><Icone nome="aviao" tamanho={18} /> Funciona até no modo avião.</p>{/if}
    <button class="botao leve bloco" onclick={() => (infoAberta = false)}>Entendi</button>
  {/if}
</Folha>

<style>
  .nav { position: fixed; inset: auto 0 0 0; z-index: 30; background: var(--papel-folha); border-top: 1px solid var(--linha); padding-bottom: env(safe-area-inset-bottom); }
  .marca-lateral, .nuvem-lateral, .crono-lateral, .so-desktop { display: none !important; }
  .ponto { min-width: 20px; height: 20px; border-radius: 10px; background: var(--terracota-forte); color: #fff; font-size: .72rem; font-weight: 800; display: grid; place-items: center; padding: 0 5px; }
  .barra { list-style: none; margin: 0; padding: 0 .25rem; display: grid; grid-template-columns: repeat(3, 1fr) 2fr; align-items: end; }
  .barra a, .barra button { width: 100%; display: grid; justify-items: center; gap: 2px; padding: .45rem 0 .5rem; min-height: 58px; border: 0; background: transparent; cursor: pointer;
    color: var(--tinta-suave); text-decoration: none; font-size: .72rem; font-weight: 700; font-family: inherit; }
  [aria-current='page'] { color: var(--terracota-forte); }
  [aria-current='page'] .ic { background: color-mix(in srgb, var(--terracota) 14%, transparent); }
  .ic { display: grid; place-items: center; width: 50px; height: 30px; border-radius: 999px; transition: background var(--dur-curta); }
  .destaque .ic { background: var(--terracota-forte) !important; color: #fff; }
  /* círculo do cronômetro: ocupa as duas últimas vagas e "sai" da barra para cima */
  .vaga-crono { position: relative; height: 58px; }
  .sobe { position: absolute; right: calc(34px + .35rem + 12px); bottom: 8px; }

  /* folha "+" */
  .grupo + .grupo { margin-top: .9rem; }
  h3 { font-size: .8rem; text-transform: uppercase; letter-spacing: .08em; color: var(--tinta-fraca); margin: .25rem 0 .4rem .25rem; }
  .opcoes { list-style: none; margin: 0; padding: 0; display: grid; gap: .25rem; }
  .opcao { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: .25rem; border-radius: var(--raio-m); }
  .opcao:hover { background: color-mix(in srgb, var(--linha) 30%, transparent); }
  .escolher { display: grid; grid-template-columns: 44px minmax(0, 1fr); align-items: center; gap: .75rem; width: 100%; min-height: 60px; padding: .45rem .5rem; border: 0; border-radius: var(--raio-m);
    background: transparent; color: var(--tinta); font: inherit; font-size: 1rem; text-align: left; cursor: pointer; }
  .ic2 { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: var(--papel); color: var(--terracota-forte); }
  .txt { display: grid; gap: 1px; min-width: 0; line-height: 1.25; }
  .aviao { display: inline-flex; align-items: center; gap: .3rem; font-size: .78rem; font-weight: 700; color: var(--oliva); }
  .aviao :global(svg) { flex: none; }
  .aviao :global(path) { fill: currentColor; stroke-width: 1; }
  .info { width: 44px; height: 44px; border: 0; border-radius: 50%; background: transparent; color: var(--tinta-fraca); display: grid; place-items: center; cursor: pointer; }
  .info:hover { color: var(--terracota-forte); background: var(--papel); }
  .desc { margin: 0 0 .75rem; line-height: 1.55; }
  .aviao.grande { font-size: .95rem; margin: 0 0 1rem; }

  @media (min-width: 64rem) {
    .nav { inset: 0 auto 0 0; width: 15rem; border-top: 0; border-right: 1px solid var(--linha); padding: 1.25rem .75rem; display: flex; flex-direction: column; }
    .marca-lateral { display: block !important; padding: 0 .5rem 1.25rem; }
    .so-desktop { display: list-item !important; }
    .vaga-crono { display: none; }
    .nuvem-lateral { display: block !important; margin-top: auto; padding: .5rem; }
    .crono-lateral { display: grid !important; margin-top: .75rem; border-top: 1px dashed var(--linha) !important; border-radius: 0 !important; padding-top: .9rem !important; }
    .barra { grid-template-columns: 1fr; gap: .25rem; padding: 0; }
    .barra a, .barra button, .crono-lateral { grid-auto-flow: column; justify-content: start; align-items: center; gap: .75rem; padding: .5rem .75rem; border-radius: var(--raio-m); font-size: 1rem; min-height: var(--toque); }
    .crono-lateral { width: 100%; border: 0; background: transparent; cursor: pointer; color: var(--tinta-suave); font: 700 1rem var(--fonte-texto); }
    .barra a:hover, .barra button:hover, .crono-lateral:hover { background: color-mix(in srgb, var(--linha) 35%, transparent); }
    .ic { width: 36px; }
  }
</style>
