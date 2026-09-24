// Pratoria — biblioteca fixa de ilustrações a giz (arquivos do site, versionados).
// Cada receita importada ganha ilustrações automaticamente, sem IA: o nome do
// ingrediente/utensílio é comparado com os sinônimos abaixo.
// Arquivos: public/ilustracoes/<chave>.webp (transparentes). Enquanto um arquivo
// não existir, a chave simplesmente não aparece (ver DISPONIVEIS).

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const INGREDIENTES = {
  'grao-de-bico': ['grao-de-bico', 'grao de bico'],
  tomate: ['tomate'], pepino: ['pepino'], cebola: ['cebola roxa', 'cebola'], alho: ['alho'],
  azeitona: ['azeitona', 'kalamata'], alcaparra: ['alcaparra'], sardinha: ['sardinha'],
  limao: ['limao', 'lima'], salsa: ['salsa', 'salsinha', 'cheiro-verde'], coentro: ['coentro'],
  manjericao: ['manjericao'], cebolinha: ['cebolinha'], azeite: ['azeite'],
  pimenta: ['pimenta-do-reino', 'pimenta do reino', 'pimenta'], sal: ['sal'],
  batata: ['batata'], cenoura: ['cenoura'], abobora: ['abobora', 'jerimum'], abobrinha: ['abobrinha'],
  berinjela: ['berinjela'], pimentao: ['pimentao'], brocolis: ['brocolis'], espinafre: ['espinafre'],
  alface: ['alface', 'rucula', 'folhas verdes'], cogumelo: ['cogumelo', 'champignon', 'shiitake'],
  milho: ['milho'], ervilha: ['ervilha'], lentilha: ['lentilha'], feijao: ['feijao'], arroz: ['arroz'],
  macarrao: ['macarrao', 'espaguete', 'penne', 'talharim', 'fusilli', 'massa seca'],
  farinha: ['farinha de trigo', 'farinha'], acucar: ['acucar'], fermento: ['fermento'],
  ovo: ['ovo', 'gema', 'clara'], leite: ['leite'], manteiga: ['manteiga'], queijo: ['queijo', 'parmesao', 'mucarela'],
  iogurte: ['iogurte'], creme: ['creme de leite', 'nata'], mel: ['mel'], chocolate: ['chocolate', 'cacau'],
  frango: ['frango', 'peito de frango', 'coxa'], carne: ['carne', 'patinho', 'alcatra', 'picanha', 'bife', 'carne moida'],
  porco: ['porco', 'lombo', 'bacon', 'linguica'], peixe: ['peixe', 'salmao', 'tilapia', 'bacalhau', 'atum'],
  camarao: ['camarao'], pao: ['pao', 'torrada'], banana: ['banana'], laranja: ['laranja'], morango: ['morango'],
  maca: ['maca'], coco: ['coco'], vinagre: ['vinagre'], gengibre: ['gengibre'],
};

export const UTENSILIOS = {
  tigela: ['tigela', 'bowl', 'recipiente'], escorredor: ['escorra', 'escorredor', 'peneira'],
  'panela-de-pressao': ['panela de pressao', 'pegar pressao'], relogio: ['minutos', 'horas', 'de molho'],
  colher: ['misture', 'mexa', 'colher'], faca: ['pique', 'corte', 'fatie', 'descasque'],
  forno: ['forno', 'asse'], frigideira: ['frigideira', 'refogue', 'doure'], panela: ['panela', 'ferva', 'cozinhe'],
  liquidificador: ['liquidificador', 'bata'], assadeira: ['assadeira', 'forma'],
};

export const ORNAMENTOS = ['graos', 'ramo', 'folha', 'traco-lapis', 'risco'];

/** Chaves que já têm arquivo. Atualizar à medida que os desenhos forem criados. */
export const DISPONIVEIS = new Set([]);

function indexar(dic) {
  return Object.entries(dic)
    .flatMap(([chave, sin]) => sin.map((s) => ({ chave, re: new RegExp(`(^|[^a-z])${semAcento(s).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`) })))
    .sort((a, b) => b.re.source.length - a.re.source.length); // o mais específico primeiro
}
const IDX_ING = indexar(INGREDIENTES);
const IDX_UT = indexar(UTENSILIOS);

export function ilustracaoDoIngrediente(nome) {
  const n = semAcento(nome);
  return IDX_ING.find((x) => x.re.test(n))?.chave ?? null;
}

export function utensiliosDoPasso(texto) {
  const n = semAcento(texto);
  return [...new Set(IDX_UT.filter((x) => x.re.test(n)).map((x) => x.chave))];
}

/**
 * Sequência de ilustrações da receita, na ordem em que os ingredientes aparecem
 * (base da "progressão" que se acumula até a página final).
 */
export function ilustracoesDaReceita(receita, { somenteDisponiveis = false } = {}) {
  const vistas = new Set();
  const porPreparacao = (receita.preparacoes ?? []).map((p) => {
    const ingredientes = p.ingredientes.map((i) => ilustracaoDoIngrediente(i.item)).filter((k) => k && !vistas.has(k) && vistas.add(k));
    const utensilios = [...new Set(p.passos.flatMap(utensiliosDoPasso))];
    const filtro = (k) => !somenteDisponiveis || DISPONIVEIS.has(k);
    return { nome: p.nome, ingredientes: ingredientes.filter(filtro), utensilios: utensilios.filter(filtro) };
  });
  return { porPreparacao, progressao: porPreparacao.flatMap((p) => p.ingredientes) };
}

// ---------------------------------------------------------------------------
// Cartela por receita (seção ILUSTRACOES): em que ponto do preparo cada desenho entra.
// ---------------------------------------------------------------------------
const norm = (s) => semAcento(s).replace(/[^a-z0-9]+/g, ' ').trim();

/** Índice da preparação citada em "onde" (tolerante a acentos e nomes parciais). */
export function indicePreparacao(receita, nome) {
  const alvo = norm(nome);
  const preps = receita.preparacoes ?? [];
  let i = preps.findIndex((p) => norm(p.nome) === alvo);
  if (i < 0) i = preps.findIndex((p) => norm(p.nome).includes(alvo) || alvo.includes(norm(p.nome)));
  return i;
}

/**
 * Desenhos já "em cena" até (prep, passo), e os que entram exatamente ali.
 * @param {Array<{ingrediente, url}>} recortes
 * @returns {{itens: Array, novas: string[]}}  (novas: use ilustracoesNovas)
 */
export function ilustracoesAte(receita, recortes, prep, passoMax) {
  const porNome = new Map(recortes.map((r) => [norm(r.ingrediente), r]));
  const itens = [], novas = [];
  for (const il of (receita.ilustracoes ?? []).slice().sort((a, b) => a.ordem - b.ordem)) {
    const rc = porNome.get(norm(il.ingrediente)); if (!rc) continue;
    const p = il.onde ? indicePreparacao(receita, il.onde.preparacao) : 0;
    const n = il.onde?.passo ?? 1;
    const pp = p < 0 ? 0 : p;
    if (pp < prep || (pp === prep && n <= passoMax)) itens.push(rc);
  }
  return { itens, novas };
}

/** Novas numa faixa de passos [de, ate] da preparação `prep`. */
export function ilustracoesNovas(receita, recortes, prep, de, ate) {
  const nomes = new Set(recortes.map((r) => norm(r.ingrediente)));
  return (receita.ilustracoes ?? []).filter((il) => {
    if (!nomes.has(norm(il.ingrediente))) return false;
    const p = il.onde ? indicePreparacao(receita, il.onde.preparacao) : 0;
    const n = il.onde?.passo ?? 1;
    return (p < 0 ? 0 : p) === prep && n >= de && n <= ate;
  }).map((il) => recortes.find((r) => norm(r.ingrediente) === norm(il.ingrediente)).ingrediente);
}
