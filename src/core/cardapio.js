// Pratoria — cardápio da semana (aparelho + nuvem quando houver conta).
// Estrutura guardada: { dias: { seg: [receitaId…], … }, atualizadoEm }
// É uma semana "modelo" (não datada): o usuário limpa quando quiser recomeçar.

export const DIAS = [
  ['seg', 'Segunda'], ['ter', 'Terça'], ['qua', 'Quarta'], ['qui', 'Quinta'], ['sex', 'Sexta'], ['sab', 'Sábado'], ['dom', 'Domingo'],
];
const CHAVES = DIAS.map(([k]) => k);

export const cardapioVazio = () => ({ dias: Object.fromEntries(CHAVES.map((k) => [k, []])), atualizadoEm: null });

/** Garante o formato e tira ids de receitas que não existem mais. */
export function normalizarCardapio(c, idsValidos = null) {
  const base = cardapioVazio();
  for (const k of CHAVES) {
    const l = Array.isArray(c?.dias?.[k]) ? c.dias[k] : [];
    base.dias[k] = l.filter((id) => typeof id === 'string' && (!idsValidos || idsValidos.has(id)));
  }
  base.atualizadoEm = c?.atualizadoEm ?? null;
  return base;
}

export function adicionarAoDia(c, dia, id) {
  const n = normalizarCardapio(c);
  if (!n.dias[dia].includes(id)) n.dias[dia].push(id);
  n.atualizadoEm = new Date().toISOString();
  return n;
}
export function tirarDoDia(c, dia, id) {
  const n = normalizarCardapio(c);
  n.dias[dia] = n.dias[dia].filter((x) => x !== id);
  n.atualizadoEm = new Date().toISOString();
  return n;
}
/** Receitas distintas da semana, na ordem em que aparecem. */
export const receitasDoCardapio = (c) => [...new Set(CHAVES.flatMap((k) => c?.dias?.[k] ?? []))];

/** Dia de hoje ("seg"…"dom"). */
export const diaDeHoje = (d = new Date()) => CHAVES[(d.getDay() + 6) % 7];
