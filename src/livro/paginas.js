// Monta as páginas do livro (Modo Cozinhar) a partir dos dados da receita.
// As páginas de PREPARO são divididas por medição real (ver Livro.svelte):
// nunca têm rolagem; se não couber, vira outra folha.

import { formatarMinutos, tempoAtivo } from '../lib/formatar.js';

/** Blocos lógicos antes da paginação. */
export function blocosDaReceita(r) {
  const b = [{ tipo: 'capa', chave: 'capa', rotulo: 'Capa' }, { tipo: 'guia', chave: 'guia', rotulo: 'Como usar' }];
  if (r.compras?.length) b.push({ tipo: 'compras', chave: 'compras', rotulo: 'Lista de compras' });
  b.push({
    tipo: 'rendimento', chave: 'rendimento', rotulo: 'Rendimento',
    texto: r.rendimento?.texto || '', porcoes: r.rendimento?.porcoes ?? null,
    ativo: formatarMinutos(tempoAtivo(r)), espera: r.tempos?.espera?.min ? formatarMinutos(r.tempos.espera) : '',
    equipamentos: r.equipamentos ?? [],
  });
  r.preparacoes.forEach((p, i) => {
    if (p.ingredientes.length || p.nota) b.push({ tipo: 'ingredientes', chave: `ing:${i}`, rotulo: `${p.nome} · Ingredientes`, prep: i });
    const itens = [
      ...p.passos.map((texto, n) => ({ tipo: 'passo', n: n + 1, texto })),
      ...p.dicas.map((texto) => ({ tipo: 'dica', texto })),
    ];
    b.push({ tipo: 'preparo', chave: `prep:${i}`, rotulo: `${p.nome} · Preparo`, prep: i, itens });
  });
  if (r.substituicoes?.some((s) => s.fonte) || r.servir?.length || r.conservacao?.length) b.push({ tipo: 'extras', chave: 'extras', rotulo: 'Para servir' });
  b.push({ tipo: 'final', chave: 'final', rotulo: 'Receita concluída' });
  return b;
}

/**
 * Expande os blocos em páginas. `cabe(bloco, itens)` diz se aqueles itens cabem
 * numa folha de preparo (medição feita no DOM).
 */
export function paginar(blocos, cabe) {
  const paginas = [];
  for (const b of blocos) {
    if (b.tipo !== 'preparo') { paginas.push({ ...b }); continue; }
    const grupos = []; let atual = [];
    for (const item of b.itens) {
      if (!atual.length || cabe(b, [...atual, item])) atual.push(item);
      else { grupos.push(atual); atual = [item]; }
    }
    if (atual.length) grupos.push(atual);
    grupos.forEach((itens, k) => paginas.push({
      ...b, itens, parte: k + 1, partes: grupos.length,
      chave: `${b.chave}:${itens.find((x) => x.tipo === 'passo')?.n ?? 'd' + k}`,
      rotulo: `${b.rotulo} ${k + 1}/${grupos.length}`,
    }));
  }
  paginas.forEach((p, i) => { p.numero = p.tipo === 'capa' ? null : i; });
  return paginas;
}

/** Encontra a página equivalente depois de repaginar (ex.: girou o celular). */
export function indiceDaChave(paginas, chave) {
  if (!chave) return 0;
  const exata = paginas.findIndex((p) => p.chave === chave);
  if (exata >= 0) return exata;
  const m = chave.match(/^prep:(\d+):(\d+)$/);
  if (m) {
    const [, prep, passo] = m.map(Number);
    const i = paginas.findIndex((p) => p.tipo === 'preparo' && p.prep === prep && p.itens.some((x) => x.n === passo));
    if (i >= 0) return i;
  }
  const base = paginas.findIndex((p) => chave.startsWith(p.chave.split(':').slice(0, 2).join(':')));
  return Math.max(0, base);
}
