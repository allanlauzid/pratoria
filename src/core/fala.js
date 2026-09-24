// Pratoria — texto para ser LIDO EM VOZ ALTA, sem IA.
// A voz do sistema (Web Speech) lê melhor "meia xícara" do que "½ xíc.", "180 graus" do que "180 °C".
// Também monta o roteiro de cada página do Modo Mão na Massa e da receita inteira.

const FRACOES = { '¼': 'um quarto', '¾': 'três quartos', '⅓': 'um terço', '⅔': 'dois terços', '⅛': 'um oitavo' };
const FEM = /^(x[íi]caras?|colher(es)?|latas?|cebolas?|pitadas?|fatias?|folhas?|gotas?|unidades?|caixas?|garrafas?|postas?|rodelas?|bandejas?|cenouras?|batatas?|abobrinhas?|berinjelas?|laranjas?|ma[çc][ãa]s?|x[íi]c)\b/i;
const UNIDADES = [
  [/(\d)\s*°\s*C\b/g, '$1 graus'], [/(\d)\s*°/g, '$1 graus'],
  [/(\d)\s*kg\b/gi, '$1 quilos'], [/(\d)\s*g\b/g, '$1 gramas'], [/(\d)\s*mg\b/g, '$1 miligramas'],
  [/(\d)\s*ml\b/gi, '$1 mililitros'], [/(\d)\s*l\b/g, '$1 litros'],
  [/(\d)\s*min\b/g, '$1 minutos'], [/(\d)\s*h\b/g, '$1 horas'], [/(\d)\s*s\b/g, '$1 segundos'],
  [/\bxíc\.?(?=\s|$)/gi, 'xícara'], [/\bc\.\s*\(?sopa\)?/gi, 'colher de sopa'], [/\bc\.\s*\(?chá\)?/gi, 'colher de chá'],
  [/\bcm\b/g, 'centímetros'], [/\bun\.?(?=\s|$)/g, 'unidade'],
];

/** "1½ xícara de farinha" → "1 e meia xícara de farinha"; "1/4 colher de chá" → "um quarto de colher de chá". */
export function textoParaFala(texto) {
  let s = String(texto ?? '').replace(/⏱/g, '').replace(/\*\*/g, '');
  s = s.replace(/(\d+)\s+(\d)\/(\d)\b/g, (_, i, a, b) => `${i}${({ '1/2': '½', '1/4': '¼', '3/4': '¾', '1/3': '⅓', '2/3': '⅔' })[`${a}/${b}`] ?? ` ${a}/${b}`}`)
    .replace(/(^|[^\d])(\d)\/(\d)\b/g, (m, pre, a, b) => pre + (({ '1/2': '½', '1/4': '¼', '3/4': '¾', '1/3': '⅓', '2/3': '⅔' })[`${a}/${b}`] ?? `${a} de ${b}`));
  // ½: "meia xícara", "meio limão", "1 e meia xícara"
  s = s.replace(/(\d+)?½\s*(\S+)?/g, (_, int, prox = '') => {
    const genero = FEM.test(prox) || /a$/i.test(prox) ? 'meia' : 'meio';
    return `${int ? `${int} e ` : ''}${genero}${prox ? ` ${prox}` : ''}`;
  });
  s = s.replace(/(\d+)?([¼¾⅓⅔⅛])(\s*)/g, (_, int, f, esp) => `${int ? `${int} e ` : ''}${FRACOES[f]}${int ? '' : ' de'}${esp || ' '}`)
    .replace(/ de de /g, ' de ');
  for (const [re, por] of UNIDADES) s = s.replace(re, por);
  return s.replace(/\s*\|\s*/g, ', ').replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
}

const frase = (t) => { const s = textoParaFala(t); return s && !/[.!?…]$/.test(s) ? `${s}.` : s; };

/** Frases a ler numa página do livro (mesmos tipos de src/livro/paginas.js). */
export function roteiroDaPagina(pg, r) {
  if (!pg || !r) return [];
  switch (pg.tipo) {
    case 'capa': return [frase(r.titulo), r.rendimento?.texto ? frase(`Rende ${r.rendimento.texto}`) : ''].filter(Boolean);
    case 'guia': return [];
    case 'compras': return ['Lista de compras.', ...r.compras.map((c) => frase([c.item, c.quantidade].filter(Boolean).join(', ')))];
    case 'rendimento': return [
      pg.porcoes ? frase(`Esta receita faz ${pg.porcoes} ${pg.porcoes === 1 ? 'porção' : 'porções'}`) : pg.texto ? frase(`Rende ${pg.texto}`) : '',
      pg.ativo ? frase(`Mão na massa: ${pg.ativo}`) : '', pg.espera ? frase(`Tem ${pg.espera} de espera; comece com antecedência`) : '',
      pg.equipamentos?.length ? frase(`Separe: ${pg.equipamentos.join(', ')}`) : '',
    ].filter(Boolean);
    case 'ingredientes': {
      const p = r.preparacoes[pg.prep];
      return [frase(`Ingredientes${r.preparacoes.length > 1 ? ` para ${p.nome}` : ''}`), p.nota ? frase(p.nota) : '', ...p.ingredientes.map((i) => frase(i.texto))].filter(Boolean);
    }
    case 'preparo': {
      const p = r.preparacoes[pg.prep];
      const cab = pg.parte > 1 ? [] : [frase(r.preparacoes.length > 1 ? `Preparo: ${p.nome}` : 'Modo de preparo')];
      return [...cab, ...pg.itens.map((it) => (it.tipo === 'passo' ? frase(`Passo ${it.n}. ${it.texto}`) : frase(`Dica: ${it.texto}`)))];
    }
    case 'extras': return [
      ...(r.servir?.length ? ['Como servir.', ...r.servir.map(frase)] : []),
      ...(r.conservacao?.length ? ['Conservação.', ...r.conservacao.map(frase)] : []),
    ];
    case 'final': return [frase(`${r.titulo}: receita concluída. Bom apetite!`)];
    default: return [];
  }
}

/** A receita inteira, em ordem (para a página da receita). */
export function roteiroCompleto(r, { comCompras = false } = {}) {
  const out = [frase(r.titulo)];
  if (r.descricao) out.push(frase(r.descricao));
  if (r.rendimento?.texto) out.push(frase(`Rende ${r.rendimento.texto}`));
  if (comCompras && r.compras?.length) out.push('Lista de compras.', ...r.compras.map((c) => frase([c.item, c.quantidade].filter(Boolean).join(', '))));
  r.preparacoes.forEach((p) => {
    if (p.ingredientes.length) out.push(frase(`Ingredientes${r.preparacoes.length > 1 ? ` para ${p.nome}` : ''}`), ...p.ingredientes.map((i) => frase(i.texto)));
  });
  r.preparacoes.forEach((p) => {
    out.push(frase(r.preparacoes.length > 1 ? `Preparo: ${p.nome}` : 'Modo de preparo'));
    p.passos.forEach((t, n) => out.push(frase(`Passo ${n + 1}. ${t}`)));
    p.dicas.forEach((d) => out.push(frase(`Dica: ${d}`)));
  });
  if (r.servir?.length) out.push('Como servir.', ...r.servir.map(frase));
  return out.filter(Boolean);
}
