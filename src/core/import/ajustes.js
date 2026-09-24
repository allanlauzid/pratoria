// Pratoria — ajustes PRÉ-PRONTOS (preferências gerais, valem para qualquer receita).
//
// A) PROMPT: entram no prompt de extração; a IA aplica ao gerar o texto.
//    Cada opção vira uma frase fixa (sem IA no site) e um rótulo curto que vai
//    para o campo `ajustes:` do .md (assim quem recebe sabe que é uma adaptação).
// B) EXIBIÇÃO: a plataforma aplica sozinha ao mostrar; o .md nunca é alterado.

export const AJUSTES_PROMPT = {
  detalhe: {
    rotulo: 'Detalhe dos passos',
    opcoes: {
      padrao: { rotulo: 'Padrão' },
      curto: { rotulo: 'Curto e direto', frase: 'Escreva passos bem curtos e diretos, sem explicações extras.', tag: 'passos curtos' },
      iniciante: { rotulo: 'Detalhado para iniciante', frase: 'Explique cada passo para um iniciante: como saber o ponto, o que observar e erros comuns.', tag: 'passos para iniciante' },
    },
  },
  linguagem: {
    rotulo: 'Linguagem',
    opcoes: {
      simples: { rotulo: 'Simples' },
      tecnica: { rotulo: 'Técnica de cozinha', frase: 'Use termos técnicos de cozinha quando forem mais precisos (ex.: brunoise, selar, emulsionar).', tag: 'linguagem técnica' },
    },
  },
  medidas: {
    rotulo: 'Medidas',
    opcoes: {
      caseiras: { rotulo: 'Xícaras e colheres' },
      metricas: { rotulo: 'Gramas e ml', frase: 'Sempre que possível, use gramas e mililitros em vez de xícaras e colheres.', tag: 'gramas e ml' },
      ambas: { rotulo: 'As duas', frase: 'Na observação de cada ingrediente, informe também o equivalente em gramas ou ml.', tag: 'medidas duplas' },
    },
  },
  porcoes: {
    rotulo: 'Porções',
    numero: true, // 0 = manter o original
    frase: (n) => `Converta a receita para ${n} porções, recalculando todas as quantidades.`,
    tag: (n) => `${n} porções`,
  },
  dieta: {
    rotulo: 'Adaptar para dieta',
    multipla: true,
    opcoes: {
      vegetariana: { rotulo: 'Vegetariana' }, vegana: { rotulo: 'Vegana' }, 'sem glúten': { rotulo: 'Sem glúten' },
      'sem lactose': { rotulo: 'Sem lactose' }, 'sem açúcar': { rotulo: 'Sem açúcar' },
    },
    frase: (lista) => `Adapte a receita para: ${lista.join(', ')}. Registre cada troca em SUBSTITUICOES (original | substituto | observação) e ajuste o campo dieta.`,
    tag: (lista) => `adaptada: ${lista.join(', ')}`,
  },
  semEquipamento: {
    rotulo: 'Equipamentos que eu não tenho',
    multipla: true,
    opcoes: {
      forno: { rotulo: 'Forno' }, 'panela de pressão': { rotulo: 'Panela de pressão' }, airfryer: { rotulo: 'Airfryer' },
      liquidificador: { rotulo: 'Liquidificador/processador' }, batedeira: { rotulo: 'Batedeira' },
    },
    frase: (lista) => `Não tenho: ${lista.join(', ')}. Se a receita usar algum deles, dê uma alternativa no passo e registre em DICAS.`,
    tag: (lista) => `sem ${lista.join('/')}`,
  },
  tempero: {
    rotulo: 'Sal, açúcar e picância',
    opcoes: {
      original: { rotulo: 'Como no original' },
      reduzido: { rotulo: 'Reduzidos', frase: 'Reduza sal e açúcar pela metade quando não afetar a estrutura da receita (explique em DICAS).', tag: 'menos sal e açúcar' },
      suave: { rotulo: 'Picância suave', frase: 'Deixe a picância suave; ofereça a versão picante em VARIACOES.', tag: 'picância suave' },
    },
  },
  extras: {
    rotulo: 'Incluir',
    multipla: true,
    opcoes: {
      antecipado: { rotulo: 'Preparo antecipado', frase: 'Em DICAS, diga o que pode ser feito com antecedência.' },
      servir: { rotulo: 'Como servir', frase: 'Preencha SERVIR com acompanhamentos.' },
      conservacao: { rotulo: 'Conservação', frase: 'Preencha CONSERVACAO (geladeira, congelador, validade).' },
      nutricao: { rotulo: 'Nutrição estimada', frase: 'Se a página não informar nutrição, estime por porção e escreva "(estimado)" em cada valor.' },
    },
  },
  ilustracoes: {
    rotulo: 'Ilustrações a giz',
    opcoes: { 6: { rotulo: '6' }, 9: { rotulo: '9' }, 12: { rotulo: '12' } },
  },
};

export const AJUSTES_PADRAO = {
  detalhe: 'padrao', linguagem: 'simples', medidas: 'caseiras', porcoes: 0,
  dieta: [], semEquipamento: [], tempero: 'original', extras: [], ilustracoes: 9,
};

/** Frases a acrescentar ao prompt + rótulos para o campo `ajustes:`. */
export function aplicarAjustesPrompt(ajustes = {}) {
  const a = { ...AJUSTES_PADRAO, ...ajustes };
  const frases = [], tags = [];
  for (const chave of ['detalhe', 'linguagem', 'medidas', 'tempero']) {
    const op = AJUSTES_PROMPT[chave].opcoes[a[chave]];
    if (op?.frase) { frases.push(op.frase); if (op.tag) tags.push(op.tag); }
  }
  if (a.porcoes > 0) { frases.push(AJUSTES_PROMPT.porcoes.frase(a.porcoes)); tags.push(AJUSTES_PROMPT.porcoes.tag(a.porcoes)); }
  for (const chave of ['dieta', 'semEquipamento']) {
    const lista = (a[chave] ?? []).filter((x) => AJUSTES_PROMPT[chave].opcoes[x]);
    if (lista.length) { frases.push(AJUSTES_PROMPT[chave].frase(lista)); tags.push(AJUSTES_PROMPT[chave].tag(lista)); }
  }
  for (const x of a.extras ?? []) { const op = AJUSTES_PROMPT.extras.opcoes[x]; if (op) frases.push(op.frase); }
  const n = [6, 9, 12].includes(+a.ilustracoes) ? +a.ilustracoes : 9;
  return { frases, tags, ilustracoes: n };
}

// ---------------------------------------------------------------------------
// B) Ajustes de EXIBIÇÃO (sem IA; o .md não muda)
// ---------------------------------------------------------------------------
export const EXIBICAO_PADRAO = {
  unidades: 'original',          // original | metrico (volume → ml)
  tamanhoTexto: 'normal',        // normal | grande | muito-grande (vale para o app inteiro)
  contraste: false,              // contraste alto (vale para o app inteiro)
  secoes: { nutricao: true, substituicoes: true, variacoes: true, dicas: true },
  despensa: ['sal', 'água', 'azeite', 'óleo', 'açúcar', 'pimenta-do-reino'],
};
