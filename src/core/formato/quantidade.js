// Pratoria — leitura e exibição de quantidades ("1/4", "1 1/2", "1½", "1 a 2", "0,5").
// Sem dependências; funciona no navegador e no Node.

const FRACOES_UNICODE = { '½': 1 / 2, '¼': 1 / 4, '¾': 3 / 4, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 1 / 8 };
const FRACOES_EXIBICAO = { '1/2': '½', '1/4': '¼', '3/4': '¾', '1/3': '⅓', '2/3': '⅔', '1/8': '⅛' };

/** Converte um número isolado ("1/4", "1 1/2", "1½", "0,5", "100") em Number, ou null. */
export function lerNumero(texto) {
  const s = String(texto ?? '').trim().replace(',', '.');
  if (!s) return null;
  let m;
  if ((m = s.match(/^(\d+)?\s*([½¼¾⅓⅔⅛])$/))) return (m[1] ? +m[1] : 0) + FRACOES_UNICODE[m[2]];
  if ((m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/))) return +m[1] + +m[2] / +m[3];
  if ((m = s.match(/^(\d+)\/(\d+)$/))) return +m[1] / +m[2];
  if (/^\d+(\.\d+)?$/.test(s)) return +s;
  return null;
}

/**
 * Lê uma quantidade que pode ser faixa ("1 a 2", "1-2", "1 até 2").
 * @returns {{texto:string, min:number|null, max:number|null} | null}
 */
export function lerQuantidade(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return null;
  const partes = t.split(/\s+(?:a|até|ou)\s+|\s*[-–]\s*/i);
  if (partes.length === 2) {
    const min = lerNumero(partes[0]);
    const max = lerNumero(partes[1]);
    if (min !== null && max !== null) return { texto: t, min, max };
  }
  const n = lerNumero(t);
  return { texto: t, min: n, max: n };
}

/** "1/4" → "¼", "1 1/2" → "1½". Mantém o resto do texto como veio. */
export function exibirQuantidade(texto) {
  return String(texto ?? '')
    .replace(/(\d+)\s+(\d\/\d)\b/g, (_, int, fr) => (FRACOES_EXIBICAO[fr] ? int + FRACOES_EXIBICAO[fr] : `${int} ${fr}`))
    .replace(/(^|[^\d])(\d\/\d)\b/g, (_, pre, fr) => pre + (FRACOES_EXIBICAO[fr] ?? fr))
    .trim();
}
