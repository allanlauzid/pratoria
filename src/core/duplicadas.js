// Pratoria — receita repetida no caderno, sem IA.
// Mesma receita = mesmo id, mesmo id de origem (veio da mesma pessoa/arquivo)
// ou mesmo link original. Título igual sem link não conta (pode ser outra versão).

import { normalizarUrl } from './id.js';

/**
 * @param {Array<{id, dados}>} registros receitas do caderno (não excluídas)
 * @param {object} nova receita interpretada (antes ou depois de prepararParaCaderno)
 * @returns {{registro: object, motivo: 'id'|'origem'|'link'} | null}
 */
export function encontrarDuplicada(registros, nova) {
  const url = nova?.fonte?.url ? normalizarUrl(nova.fonte.url) : '';
  const ids = new Set([nova?.id, nova?.idOrigem].filter(Boolean));
  for (const reg of registros) {
    const d = reg.dados ?? {};
    if (ids.has(reg.id)) return { registro: reg, motivo: 'id' };
    if (d.idOrigem && ids.has(d.idOrigem)) return { registro: reg, motivo: 'origem' };
  }
  if (url) for (const reg of registros) {
    const u = reg.dados?.fonte?.url;
    if (u && normalizarUrl(u) === url) return { registro: reg, motivo: 'link' };
  }
  return null;
}

export const MOTIVO_DUPLICADA = {
  id: 'Esta receita já está no seu caderno.',
  origem: 'Você já recebeu esta receita antes.',
  link: 'Já existe uma receita do mesmo link no seu caderno.',
};
