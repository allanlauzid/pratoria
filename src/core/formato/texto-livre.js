// Pratoria — do texto "como a gente escreve" para os campos do formato, sem IA.
// Usado pelo editor de receitas: "1 1/2 xícara de farinha de trigo, peneirada"
//   → { quantidade: {texto:'1 1/2', min:1.5, max:1.5}, unidade:'xícara', item:'farinha de trigo', obs:'peneirada' }

import { lerQuantidade } from './quantidade.js';
import { textoIngrediente } from './parser.js';

export const UNIDADES = [
  'colheres de sopa', 'colher de sopa', 'colheres de chá', 'colher de chá', 'colheres de café', 'colher de café',
  'colheres de sobremesa', 'colher de sobremesa', 'xícaras', 'xícara', 'copos americanos', 'copo americano', 'copos', 'copo',
  'kg', 'g', 'mg', 'ml', 'l', 'litros', 'litro', 'gramas', 'grama', 'quilos', 'quilo',
  'pitadas', 'pitada', 'dentes', 'dente', 'latas', 'lata', 'pacotes', 'pacote', 'maços', 'maço', 'fatias', 'fatia',
  'unidades', 'unidade', 'ramos', 'ramo', 'folhas', 'folha', 'punhados', 'punhado', 'caixas', 'caixa', 'vidros', 'vidro',
  'talos', 'talo', 'cubos', 'cubo', 'sachês', 'sachê', 'envelopes', 'envelope', 'tabletes', 'tablete', 'gotas', 'gota',
  'filés', 'filé', 'postas', 'posta', 'rodelas', 'rodela', 'potes', 'pote', 'garrafas', 'garrafa', 'bandejas', 'bandeja',
];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE_UNIDADE = new RegExp(`^(${UNIDADES.map(esc).join('|')})(?=\\s|$)\\.?\\s*`, 'i');
const Q = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?\s*[½¼¾⅓⅔⅛]?|[½¼¾⅓⅔⅛])`;
const RE_QTD = new RegExp(String.raw`^(${Q}(?:\s*(?:a|até|ou|-|–)\s*${Q})?)\s*`, 'i');

/** Uma linha livre → ingrediente estruturado (o mesmo objeto que o parser produz). */
export function ingredienteDeTexto(linha) {
  let s = String(linha ?? '').replace(/^\s*[-*•·]\s*/, '').trim();
  if (!s) return null;
  if (s.includes('|')) {                                   // já veio no formato do Pratoria
    const [q = '', u = '', item = '', ...obs] = s.split('|').map((x) => x.trim());
    const ing = { quantidade: q ? lerQuantidade(q) : null, unidade: u, item, obs: obs.filter(Boolean).join(', ') };
    return { ...ing, texto: textoIngrediente(ing) };
  }
  let quantidade = null, unidade = '';
  const mq = s.match(RE_QTD);
  if (mq) { quantidade = lerQuantidade(mq[1].replace(/(\d)([½¼¾⅓⅔⅛])/, '$1$2')); s = s.slice(mq[0].length); }
  const mu = s.match(RE_UNIDADE);
  if (mu && quantidade) { unidade = mu[1]; s = s.slice(mu[0].length).replace(/^d[eao]s?\s+/i, (m) => (/^de\s/i.test(m) ? '' : m)); }
  let item = s, obs = '';
  const v = s.indexOf(',');
  if (v > 0) { item = s.slice(0, v).trim(); obs = s.slice(v + 1).trim(); }
  const ing = { quantidade, unidade, item: item.trim(), obs };
  return { ...ing, texto: textoIngrediente(ing) };
}

/** Texto de várias linhas → lista sem linhas vazias (tira marcadores e numeração). */
export function linhas(texto) {
  return String(texto ?? '').split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•·]|\d{1,2}[.)])\s+/, '').trim()).filter(Boolean);
}
