// Ajustes de EXIBIÇÃO sem IA: escalar porções e converter medidas de volume.
// Nunca altera a receita salva nem o .md — só o que aparece na tela.

import { textoIngrediente } from './parser.js';

const FRACOES = [[0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, '']];

/** 1.5 → "1½", 0.333 → "⅓", 2.9 → "3", 12.4 → "12" */
export function numeroDeCozinha(n) {
  if (n == null || Number.isNaN(n)) return '';
  if (n >= 10) return String(Math.round(n));
  let inteiro = Math.floor(n), resto = n - inteiro;
  let melhor = FRACOES[0];
  for (const f of FRACOES) if (Math.abs(f[0] - resto) < Math.abs(melhor[0] - resto)) melhor = f;
  if (melhor[0] === 1) { inteiro += 1; melhor = FRACOES[0]; }
  if (!inteiro && !melhor[1]) return n > 0 ? '⅛' : '0';
  return `${inteiro || ''}${melhor[1]}`;
}

// volume em ml
const VOLUME = [
  { re: /^x[íi]caras?( \(ch[áa]\))?$/i, ml: 240 },
  { re: /^colher(es)? de sopa$/i, ml: 15 },
  { re: /^colher(es)? de ch[áa]$/i, ml: 5 },
  { re: /^colher(es)? de caf[ée]$/i, ml: 2.5 },
  { re: /^copos?( americanos?)?$/i, ml: 190 },
  { re: /^l(itros?)?$/i, ml: 1000 },
  { re: /^ml$/i, ml: 1 },
];
const plural = (unidade, n) => {
  if (n <= 1) return unidade.replace(/^x[íi]caras$/i, 'xícara').replace(/^colheres/i, 'colher');
  return unidade.replace(/^x[íi]cara$/i, 'xícaras').replace(/^colher /i, 'colheres ');
};

/**
 * @param {object} ing ingrediente do parser
 * @param {{fator?: number, unidades?: 'original'|'metrico'}} op
 * @returns {string} texto para exibir
 */
export function ingredienteExibido(ing, { fator = 1, unidades = 'original' } = {}) {
  const q = ing.quantidade;
  if (!q || q.min == null || (fator === 1 && unidades === 'original')) return ing.texto ?? textoIngrediente(ing);
  let min = q.min * fator, max = (q.max ?? q.min) * fator, unidade = ing.unidade ?? '';
  if (unidades === 'metrico') {
    const v = VOLUME.find((x) => x.re.test(unidade.trim()));
    if (v && v.ml !== 1) {
      min *= v.ml; max *= v.ml;
      if (min >= 1000) { min /= 1000; max /= 1000; unidade = 'l'; } else unidade = 'ml';
    }
  }
  const redondo = (n) => (unidade === 'ml' ? String(n < 50 ? Math.round(n) : Math.round(n / 5) * 5) : numeroDeCozinha(n));
  const texto = min === max ? redondo(min) : `${redondo(min)} a ${redondo(max)}`;
  return textoIngrediente({ ...ing, unidade: plural(unidade, max), quantidade: { texto, min, max } }).replace(/^(\S+)/, (m) => m);
}

export const fatorPorcoes = (receita, porcoes) => {
  const base = receita?.rendimento?.porcoes;
  return base && porcoes ? porcoes / base : 1;
};
