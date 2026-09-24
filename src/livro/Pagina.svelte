<script>
  // Uma folha do livro. As páginas de preparo têm a MESMA marcação de htmlPreparo()
  // (Livro.svelte), usada para medir se o texto cabe.
  import ImagemReceita from '../componentes/ImagemReceita.svelte';
  import Prateleira from '../componentes/Prateleira.svelte';
  import PassoTexto from '../componentes/PassoTexto.svelte';
  import { FONTES_SUBSTITUICAO } from '../core/import/fontes.js';
  import CartaoCronometro from '../componentes/CartaoCronometro.svelte';
  import { cronometrosDosItens } from '../core/tempos.js';
  import { creditoCurto } from '../core/formato/credito.js';
  import { SECOES_MERCADO } from '../core/import/listas.js';
  let { pagina: pg, receita: r, id, marcados = {}, aoMarcar, aoVerGuia, aoRecomecar, aoSair, total, prateleira = null } = $props();
  import Icone from '../componentes/Icone.svelte';
  // teclado: Enter/Espaço marcam a linha (o toque é tratado pelo motor do livro)
  const teclaMarca = (chave) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); aoMarcar(chave); } };
  const num = (n) => String(n).padStart(2, '0');
  const cronos = $derived(pg.tipo === 'preparo' ? cronometrosDosItens(pg.itens) : []);
  const credito = $derived(creditoCurto(r));
  const secoes = $derived.by(() => {
    if (pg.tipo !== 'compras') return [];
    const m = new Map();
    for (const c of r.compras) { const s = c.secao || 'outros'; if (!m.has(s)) m.set(s, []); m.get(s).push(c); }
    const ordem = (s) => { const i = SECOES_MERCADO.indexOf(s); return i < 0 ? 99 : i; };
    return [...m.entries()].sort((a, b) => ordem(a[0]) - ordem(b[0]));
  });
</script>

{#if pg.tipo === 'capa'}
  <div class="pag capa">
    <div class="pag-foto"><ImagemReceita {id} alt="" carregar="eager" /></div>
    <div class="pag-centro">
      <div class="pag-kicker">Pratoria</div>
      <h2>{r.titulo}</h2>
      {#if r.rendimento?.texto}<p>{r.rendimento.texto}</p>{/if}
      <p class="pag-dica-virar">Deslize para abrir →</p>
      {#if credito}<p class="credito">{credito.texto}</p>{/if}
    </div>
  </div>

{:else if pg.tipo === 'guia'}
  <div class="pag guia">
    <header class="pag-cab"><div class="pag-kicker">Antes de começar</div><h2>Como usar o Mão na Massa</h2></header>
    <div class="pag-corpo rola" data-rola>
      <ul class="pag-guia">
        <li><span class="gi"><Icone nome="livro" tamanho={20} /></span><span><strong>Vire as páginas</strong> deslizando, ou tocando na margem direita.</span></li>
        <li><span class="gi"><span class="marcador demo" aria-hidden="true"></span></span><span><strong>Toque numa linha</strong> para marcar o que já comprou, separou ou fez. É opcional e zera ao recomeçar.</span></li>
        <li><span class="gi"><Icone nome="cronometro" tamanho={20} /></span><span><strong>Tempos viram cronômetros</strong> prontos na página: é só tocar ▶.</span></li>
        <li><span class="gi"><Icone nome="som" tamanho={20} /></span><span><strong>Ouça a receita</strong> pelo botão de som no topo.</span></li>
      </ul>
      <button class="botao leve pag-ver-tudo" onclick={aoVerGuia}>Ver todas as instruções</button>
    </div>
    <span class="pag-numero">{num(pg.numero)}</span>
  </div>

{:else if pg.tipo === 'compras'}
  <div class="pag">
    <header class="pag-cab"><div class="pag-kicker">Antes de começar</div><h2>Lista de compras</h2></header>
    <div class="pag-corpo rola pag-compras" data-rola>
      {#each secoes as [secao, itens]}
        {#if secoes.length > 1}<p class="pag-secao">{secao}</p>{/if}
        <ul class="pag-lista">
          {#each itens as c}
            <li class="marcavel" class:feito={marcados[`c:${c.item}`]} data-marcavel={`c:${c.item}`} role="checkbox" aria-checked={!!marcados[`c:${c.item}`]} tabindex="0" onkeydown={teclaMarca(`c:${c.item}`)}>
              <span class="marcador" aria-hidden="true"></span><span>{c.item}{#if c.quantidade}<small>{c.quantidade}</small>{/if}</span></li>
          {/each}
        </ul>
      {/each}
    </div>
    <span class="pag-numero">{num(pg.numero)}</span>
  </div>

{:else if pg.tipo === 'rendimento'}
  <div class="pag">
    <header class="pag-cab"><div class="pag-kicker">Rendimento</div><h2>Esta receita faz</h2></header>
    <div class="pag-centro">
      {#if pg.porcoes}<div class="pag-grande">{pg.porcoes}</div><p>{pg.porcoes === 1 ? 'porção' : 'porções'}</p>
      {:else}<div class="pag-grande" style="font-size:2.5rem">{pg.texto || '—'}</div>{/if}
      {#if pg.porcoes && pg.texto && !/^\d+\s*por/.test(pg.texto)}<p class="meta">{pg.texto}</p>{/if}
    </div>
    <div class="pag-corpo" style="flex:none">
      {#if pg.ativo}<p>Mão na massa: <strong>{pg.ativo}</strong></p>{/if}
      {#if pg.espera}<p>Espera: <strong>{pg.espera}</strong> — comece com antecedência.</p>{/if}
      {#if pg.equipamentos.length}<p>Separe: {pg.equipamentos.join(', ')}.</p>{/if}
    </div>
    <span class="pag-numero">{num(pg.numero)}</span>
  </div>

{:else if pg.tipo === 'ingredientes'}
  {@const p = r.preparacoes[pg.prep]}
  <div class="pag">
    <header class="pag-cab"><div class="pag-kicker">Ingredientes</div><h2>{p.nome}</h2></header>
    <div class="pag-corpo rola" data-rola>
      {#if p.nota}<p class="pag-nota">{p.nota}</p>{/if}
      <ul class="pag-lista">{#each p.ingredientes as ing, k}
        {@const ch = `i:${pg.prep}:${k}`}
        <li class="marcavel" class:feito={marcados[ch]} data-marcavel={ch} role="checkbox" aria-checked={!!marcados[ch]} tabindex="0" onkeydown={teclaMarca(ch)}><span class="marcador" aria-hidden="true"></span>{ing.texto}</li>
      {/each}</ul>
    </div>
    {#if prateleira}<div class="pag-prateleira"><Prateleira itens={prateleira.itens} novas={prateleira.novas} tamanho={52} /></div>{/if}
    <span class="pag-numero">{num(pg.numero)}</span>
  </div>

{:else if pg.tipo === 'preparo'}
  <div class="pag">
    <header class="pag-cab"><div class="pag-kicker">Preparo</div><h2>{r.preparacoes[pg.prep].nome}</h2>{#if pg.partes > 1}<span class="pag-parte">{pg.parte}/{pg.partes}</span>{/if}</header>
    <div class="pag-corpo"><ol class="pag-passos">
      {#each pg.itens as it}
        {#if it.tipo === 'passo'}<li class="marcavel" class:feito={marcados[`p:${pg.prep}:${it.n}`]} data-marcavel={`p:${pg.prep}:${it.n}`} role="checkbox" aria-checked={!!marcados[`p:${pg.prep}:${it.n}`]} tabindex="0" onkeydown={teclaMarca(`p:${pg.prep}:${it.n}`)}><span class="marcador" aria-hidden="true"></span><span class="n">{it.n}</span><PassoTexto texto={it.texto} receitaId={id} titulo={r.titulo} passo={it.n} chave={`${id}:${pg.prep}:${it.n}`} /></li>{:else}<li class="dica">{it.texto}</li>{/if}
      {/each}
    </ol></div>
    {#if cronos.length}
      <div class="pag-cronos">
        {#each cronos as c (c.n)}
          <CartaoCronometro tempo={c.tempo} chave={`${id}:${pg.prep}:${c.n}`} rotulo={`Passo ${c.n}`} detalhe={c.trecho} receitaId={id} titulo={r.titulo} />
        {/each}
      </div>
    {/if}
    {#if prateleira}<div class="pag-prateleira"><Prateleira itens={prateleira.itens} novas={prateleira.novas} tamanho={52} /></div>{/if}
    <span class="pag-numero">{num(pg.numero)}</span>
  </div>

{:else if pg.tipo === 'extras'}
  <div class="pag">
    <header class="pag-cab"><div class="pag-kicker">Para terminar</div><h2>Servir e guardar</h2></header>
    <div class="pag-corpo rola" data-rola>
      {#if r.servir.length}<p class="pag-secao">Como servir</p><ul class="pag-lista">{#each r.servir as s}<li>{s}</li>{/each}</ul>{/if}
      {#if r.conservacao.length}<p class="pag-secao">Conservação</p><ul class="pag-lista">{#each r.conservacao as s}<li>{s}</li>{/each}</ul>{/if}
      {#if r.substituicoes.some((s) => s.fonte)}<p class="pag-secao">Substituições</p><ul class="pag-lista">{#each r.substituicoes.filter((s) => s.fonte) as s}<li>{s.original} → {s.substituto}{#if s.fonte !== 'RECEITA'}<small class="pag-fonte"> · fonte: {FONTES_SUBSTITUICAO[s.fonte]?.curto}</small>{/if}</li>{/each}</ul>{/if}
    </div>
    <span class="pag-numero">{num(pg.numero)}</span>
  </div>

{:else if pg.tipo === 'final'}
  <div class="pag final">
    <div class="pag-foto"><ImagemReceita {id} alt="" /></div>
    {#if prateleira?.itens.length}<div class="pag-roda"><Prateleira itens={prateleira.itens} tamanho={40} rotulo="Todos os ingredientes" /></div>{/if}
    <div class="pag-centro">
      <div class="pag-kicker">Receita concluída</div>
      <h2>{r.titulo}</h2>
      <div class="pag-botoes">
        <button class="botao leve" onclick={aoRecomecar}>Preparar novamente</button>
        <button class="botao escuro" onclick={aoSair}>Sair</button>
      </div>
    </div>
    <span class="pag-numero">{num(pg.numero)}</span>
  </div>
{/if}
