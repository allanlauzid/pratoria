<script>
  // Celular: barra inferior (Caderno · Compras · + · Receber · Mais). Desktop (≥ 64rem): trilho lateral.
  import Icone from './Icone.svelte';
  import Marca from './Marca.svelte';
  import NuvemStatus from './NuvemStatus.svelte';
  import Folha from './Folha.svelte';
  import { rota, ir } from '../lib/rota.svelte.js';
  import { cron, abrirCronometro } from '../lib/cronometros.svelte.js';
  let novo = $state(false);
  const itens = [
    { nome: 'caderno', href: '#/', rotulo: 'Caderno', icone: 'caderno' },
    { nome: 'compras', href: '#/compras', rotulo: 'Compras', icone: 'carrinho' },
    { nome: 'novo', rotulo: 'Novo', icone: 'mais', destaque: true },
    { nome: 'receber', href: '#/receber', rotulo: 'Receber', icone: 'receber' },
    { nome: 'ajustes', href: '#/ajustes', rotulo: 'Mais', icone: 'menu' },
  ];
  const ativo = (n) => rota.nome === n || (n === 'caderno' && ['receita', 'editar'].includes(rota.nome)) || (n === 'novo' && ['importar', 'escrever'].includes(rota.nome));
  const opcoes = [
    { icone: 'link', titulo: 'Tenho o link', desc: 'De qualquer site. O ChatGPT organiza, o Pratoria guarda.', ir: '/importar' },
    { icone: 'mensagem', titulo: 'Escrever e organizar com o ChatGPT', desc: 'Escreva do seu jeito; ele confere e pergunta o que faltar.', ir: '/importar?modo=escrever' },
    { icone: 'escrever', titulo: 'Preencher o formulário', desc: 'Passo a passo, sem IA.', ir: '/escrever' },
    { icone: 'arquivo', titulo: 'Abrir arquivo .pratoria', desc: 'Recebido por WhatsApp, e-mail, AirDrop, Quick Share…', ir: '/receber' },
    { icone: 'qr', titulo: 'Ler QR code', desc: 'Receita mostrada na tela de outro celular.', ir: '/receber?qr=1' },
  ];
</script>

<nav class="nav" aria-label="Principal">
  <div class="marca-lateral"><Marca /></div>
  <ul>
    {#each itens as i}
      <li>
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
  </ul>
  <button class="crono-lateral" onclick={abrirCronometro}>
    <span class="ic"><Icone nome="cronometro" tamanho={24} /></span><span class="rot">Cronômetro</span>{#if cron.lista.length}<span class="ponto">{cron.lista.length}</span>{/if}
  </button>
  <div class="nuvem-lateral"><NuvemStatus /></div>
</nav>

<Folha bind:aberta={novo} titulo="Nova receita">
  <ul class="novo">
    {#each opcoes as o}
      <li><button onclick={() => { novo = false; ir(o.ir); }}>
        <span class="ic2"><Icone nome={o.icone} /></span><span class="txt"><strong>{o.titulo}</strong><small>{o.desc}</small></span>
      </button></li>
    {/each}
  </ul>
</Folha>

<style>
  .nav { position: fixed; inset: auto 0 0 0; z-index: 30; background: var(--papel-folha); border-top: 1px solid var(--linha); padding-bottom: env(safe-area-inset-bottom); }
  .marca-lateral, .nuvem-lateral, .crono-lateral { display: none !important; }
  .ponto { min-width: 20px; height: 20px; border-radius: 10px; background: var(--terracota-forte); color: #fff; font-size: .72rem; font-weight: 800; display: grid; place-items: center; padding: 0 5px; }
  ul { list-style: none; margin: 0; padding: 0 .25rem; display: grid; grid-template-columns: repeat(5, 1fr); }
  a, button { width: 100%; display: grid; justify-items: center; gap: 2px; padding: .45rem 0 .5rem; min-height: 58px; border: 0; background: transparent; cursor: pointer;
    color: var(--tinta-suave); text-decoration: none; font-size: .72rem; font-weight: 700; font-family: inherit; }
  [aria-current='page'] { color: var(--terracota-forte); }
  [aria-current='page'] .ic { background: color-mix(in srgb, var(--terracota) 14%, transparent); }
  .ic { display: grid; place-items: center; width: 50px; height: 30px; border-radius: 999px; transition: background var(--dur-curta); }
  .destaque .ic { background: var(--terracota-forte) !important; color: #fff; }
  .novo { list-style: none; margin: 0; padding: 0; display: grid; gap: .25rem; }
  .novo button { grid-template-columns: 44px 1fr; justify-items: start; align-items: center; gap: .75rem; text-align: left; min-height: 64px; padding: .5rem; border-radius: var(--raio-m); font-size: 1rem; color: var(--tinta); }
  .novo button:hover { background: color-mix(in srgb, var(--linha) 40%, transparent); }
  .ic2 { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: var(--papel); color: var(--terracota-forte); }
  .txt { display: grid; } .txt small { font-weight: 400; color: var(--tinta-suave); font-size: .85rem; }

  @media (min-width: 64rem) {
    .nav { inset: 0 auto 0 0; width: 15rem; border-top: 0; border-right: 1px solid var(--linha); padding: 1.25rem .75rem; display: flex; flex-direction: column; }
    .marca-lateral { display: block !important; padding: 0 .5rem 1.25rem; }
    .nuvem-lateral { display: block !important; margin-top: auto; padding: .5rem; }
    .crono-lateral { display: grid !important; margin-top: .75rem; border-top: 1px dashed var(--linha) !important; border-radius: 0 !important; padding-top: .9rem !important; }
    ul { grid-template-columns: 1fr; gap: .25rem; padding: 0; }
    a, button { grid-auto-flow: column; justify-content: start; align-items: center; gap: .75rem; padding: .5rem .75rem; border-radius: var(--raio-m); font-size: 1rem; min-height: var(--toque); }
    a:hover, ul button:hover { background: color-mix(in srgb, var(--linha) 35%, transparent); }
    .ic { width: 36px; }
    .novo button { font-size: 1rem; }
  }
</style>
