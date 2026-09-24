// Pratoria — vocabulários fixos (arquivo do site, versionado).
// O prompt pede ao LLM que use estes valores; o parser avisa quando vier algo fora da lista.

export const CATEGORIAS = [
  'Café da manhã', 'Entradas e petiscos', 'Saladas', 'Sopas e caldos', 'Massas', 'Arroz e grãos',
  'Carnes', 'Aves', 'Peixes e frutos do mar', 'Vegetarianos', 'Acompanhamentos', 'Molhos e temperos',
  'Pães e massas de forno', 'Bolos e tortas', 'Sobremesas', 'Bebidas', 'Lanches',
];

export const REFEICOES = ['café da manhã', 'almoço', 'jantar', 'lanche', 'sobremesa', 'petisco', 'bebida'];

export const DIFICULDADES = ['fácil', 'média', 'difícil'];
export const CUSTOS = ['baixo', 'médio', 'alto'];

export const DIETAS = ['vegetariana', 'vegana', 'sem glúten', 'sem lactose', 'sem ovo', 'sem açúcar', 'low carb'];

export const ALERGENOS = [
  'glúten', 'leite', 'ovo', 'peixe', 'crustáceos', 'moluscos', 'amendoim', 'castanhas',
  'soja', 'gergelim', 'mostarda', 'aipo', 'sulfitos', 'tremoço',
];

// Seções de mercado: agrupam a lista de compras.
export const SECOES_MERCADO = [
  'hortifruti', 'açougue', 'peixaria', 'frios e laticínios', 'padaria', 'mercearia',
  'enlatados e conservas', 'temperos', 'congelados', 'bebidas', 'outros',
];

// Nutrientes aceitos (por porção). Só preenchidos quando a fonte informa.
export const NUTRIENTES = ['calorias', 'carboidratos', 'proteínas', 'gorduras', 'gorduras saturadas', 'fibras', 'açúcares', 'sódio'];
