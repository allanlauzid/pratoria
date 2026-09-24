// Pratoria — encontra tempos dentro do texto de um passo, sem IA.
// "cozinhe por 12 a 15 minutos" → um trecho clicável que abre um cronômetro de 12 min
// (com aviso de que pode ir até 15). Usado na receita e no Modo Cozinhar.

import { lerNumero } from './formato/quantidade.js';

const PALAVRAS = { um: 1, uma: 1, dois: 2, duas: 2, 'três': 3, tres: 3, quatro: 4, cinco: 5, seis: 6, dez: 10, quinze: 15, vinte: 20, trinta: 30, meia: 0.5 };
const NUM = String.raw`\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+|[½¼¾]|${Object.keys(PALAVRAS).join('|')}`;
const UNID = String.raw`segundos?|seg\b|minutos?|min\b|horas?|hrs?\b|h\b`;
const RE = new RegExp(String.raw`(?<![\wÀ-ÿ])(${NUM})(?:\s*(?:a|até|ou|-|–)\s*(${NUM}))?\s*(${UNID})(\s+e\s+meia)?`, 'giu');

const numero = (s) => {
  const t = String(s).toLowerCase().replace(/\s+/g, '');
  return PALAVRAS[t] ?? lerNumero(t);
};
const fatorUnidade = (u) => (/^s/i.test(u) ? 1 : /^m/i.test(u) ? 60 : 3600);

/** 750 → "12 min 30 s"; 5400 → "1 h 30 min" */
export function rotuloDuracao(seg) {
  seg = Math.round(seg);
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60;
  if (h) return m ? `${h} h ${m} min` : `${h} h`;
  if (m) return s ? `${m} min ${s} s` : `${m} min`;
  return `${s} s`;
}

/**
 * @param {string} texto
 * @returns {Array<{texto: string, tempo?: {min: number, max: number, rotulo: string}}>}
 *   trechos na ordem; os que têm `tempo` são os clicáveis. min/max em segundos.
 */
export function trechosComTempo(texto) {
  const s = String(texto ?? '');
  const out = [];
  let ultimo = 0;
  for (const m of s.matchAll(RE)) {
    const f = fatorUnidade(m[3]);
    const extra = m[4] ? 0.5 * f : 0;
    const a = numero(m[1]), b = m[2] != null ? numero(m[2]) : a;
    if (a == null || b == null || a <= 0) continue;
    const min = a * f + extra, max = Math.max(b * f + extra, min);
    if (min < 5 || min > 72 * 3600) continue;
    if (m.index > ultimo) out.push({ texto: s.slice(ultimo, m.index) });
    const rotulo = min === max ? rotuloDuracao(min) : `${rotuloDuracao(min)}–${rotuloDuracao(max)}`;
    out.push({ texto: m[0], tempo: { min, max, rotulo } });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < s.length) out.push({ texto: s.slice(ultimo) });
  return out;
}

export const temTempo = (texto) => trechosComTempo(texto).some((t) => t.tempo);

/**
 * Cronômetros pré-configurados de uma página do livro: o 1º tempo de cada passo (no máx. `max`).
 * @param {Array<{tipo:string, n?:number, texto:string}>} itens
 * @returns {Array<{n:number, trecho:string, tempo:{min,max,rotulo}}>}
 */
export function cronometrosDosItens(itens, max = 2) {
  const out = [];
  for (const it of itens) {
    if (it.tipo !== 'passo') continue;
    const t = trechosComTempo(it.texto).find((x) => x.tempo);
    if (t) out.push({ n: it.n, trecho: t.texto, tempo: t.tempo });
    if (out.length >= max) break;
  }
  return out;
}
