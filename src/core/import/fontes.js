// Pratoria — FONTES CONFIÁVEIS de substituições (arquivo do site, versionado).
// Regra (decisão do Allan, 24/09): só aparece substituição que venha de uma destas
// fontes ou que a própria receita original sugira (RECEITA). Sem fonte → não mostra.
// O prompt manda o ChatGPT consultar estes links e citar o código na coluna "fonte".

export const FONTES_SUBSTITUICAO = {
  NDSU: {
    nome: 'NDSU Extension — Ingredient Substitutions (FN198)',
    curto: 'NDSU Extension',
    url: 'https://www.ndsu.edu/agriculture/extension/publications/ingredient-substitutions',
    uso: 'trocas do dia a dia: fermento, laticínios, ovos, farinhas para engrossar, ervas, açúcar, temperos',
  },
  MYPLATE: {
    nome: 'USDA MyPlate — Protein Foods (equivalências)',
    curto: 'USDA MyPlate',
    url: 'https://www.myplate.gov/eat-healthy/protein-foods',
    uso: 'trocar carne, frango ou peixe por feijões, lentilha, grão-de-bico, tofu, ovo, pela mesma quantidade de proteína (30 g de carne = ¼ xícara de feijão cozido = ¼ xícara de tofu = 1 ovo)',
  },
  MSC1: {
    nome: 'Marine Stewardship Council — Smart fish swaps (parte 1)',
    curto: 'MSC',
    url: 'https://www.msc.org/what-you-can-do/eat-sustainable-seafood/smart-fish-swaps-alternatives-substitute-species-pt-1',
    uso: 'peixes e camarão por espécies parecidas',
  },
  MSC2: {
    nome: 'Marine Stewardship Council — Smart fish swaps (parte 2)',
    curto: 'MSC',
    url: 'https://www.msc.org/what-you-can-do/eat-sustainable-seafood/smart-fish-swaps-alternatives-substitute-species-pt-2',
    uso: 'peixes por espécies parecidas (merluza, sardinha, cavalinha, chicharro)',
  },
  VIRGINIA: {
    nome: 'Virginia Seafood — Substitution Guide',
    curto: 'Virginia Seafood',
    url: 'https://www.virginiaseafood.org/buying-preparing-seafood/how-to-prepare-perfect-seafood/substitution-chart/',
    uso: 'peixes agrupados por sabor e textura (troca dentro do mesmo grupo)',
  },
  FENACELBRA: {
    nome: 'FENACELBRA — Dieta sem glúten',
    curto: 'FENACELBRA',
    url: 'https://www.fenacelbra.com.br/dieta-sem-gluten',
    uso: 'o que tem glúten (trigo, cevada, centeio, malte, aveia comum) e farinhas seguras',
  },
  BEYONDCELIAC: {
    nome: 'Beyond Celiac — Intro to gluten-free flours',
    curto: 'Beyond Celiac',
    url: 'https://www.beyondceliac.org/gluten-free-diet/baking/intro-to-flour/',
    uso: 'qual farinha sem glúten usar em cada preparo',
  },
  VEGANUARY: {
    nome: 'Veganuary — Vegan egg substitutes / Vegan baking guide',
    curto: 'Veganuary',
    url: 'https://veganuary.com/en-us/vegan-egg-substitutes-us/',
    uso: 'ovo, leite, leitelho e manteiga em versão vegana (1 ovo = 1 col. sopa de linhaça moída + 3 col. sopa de água)',
  },
  VEGANSOCIETY: {
    nome: 'The Vegan Society',
    curto: 'The Vegan Society',
    url: 'https://www.vegansociety.com/go-vegan/why-go-vegan/honey-industry',
    uso: 'mel e laticínios em versão vegana',
  },
};

/** "RECEITA" = sugerida pela própria receita original (o autor). */
export const FONTE_RECEITA = { nome: 'Sugerida pela receita original', curto: 'Receita original', url: '' };

export const PARA_SUBSTITUICAO = ['principal', 'geral', 'vegetariano', 'vegano', 'sem glúten'];

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Aceita o código, o nome ou a URL de uma fonte. Devolve {codigo, ...fonte} ou null. */
export function fonteDaSubstituicao(valor) {
  const v = String(valor ?? '').trim();
  if (!v) return null;
  if (/^(receita|receita original|original)$/i.test(v)) return { codigo: 'RECEITA', ...FONTE_RECEITA };
  const cod = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (FONTES_SUBSTITUICAO[cod]) return { codigo: cod, ...FONTES_SUBSTITUICAO[cod] };
  for (const [codigo, f] of Object.entries(FONTES_SUBSTITUICAO)) {
    if (v.includes(new URL(f.url).hostname) || semAcento(v) === semAcento(f.nome) || semAcento(v) === semAcento(f.curto)) return { codigo, ...f };
  }
  return null;
}

export function normalizarPara(valor) {
  const v = semAcento(valor).replace(/-/g, ' ');
  if (!v) return 'geral';
  if (/principal/.test(v)) return 'principal';
  if (/vegan/.test(v)) return 'vegano';
  if (/vegetarian/.test(v)) return 'vegetariano';
  if (/gluten|celiac/.test(v)) return 'sem glúten';
  return 'geral';
}

/** Bloco para os prompts: códigos + links + para que serve cada grupo (curto: o prompt vai no link). */
export function blocoDeFontes() {
  return `${Object.entries(FONTES_SUBSTITUICAO).map(([c, f]) => `${c}: ${f.url}`).join('\n')}
Uso: dia a dia NDSU; carne ou peixe por leguminosa, tofu ou ovo (mesma proteína) MYPLATE; peixe por peixe MSC1, MSC2, VIRGINIA; sem glúten FENACELBRA, BEYONDCELIAC; vegano VEGANUARY, VEGANSOCIETY`;
}
