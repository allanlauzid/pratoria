// Pratoria — formulário guiado (sem IA e sem mexer no .md à mão).
// Estrutura igual à do Pratoria: lista de compras → etapas de preparo (cada uma com
// ingredientes e passos) → extras. Linhas vazias são ignoradas. Ao salvar vira PRATORIA v1
// e passa pelo mesmo parser das importações (mesma validação).

import { interpretarReceita, SEM_LINK, textoIngrediente } from './formato/parser.js';
import { serializarReceita } from './formato/serializar.js';
import { lerQuantidade, exibirQuantidade } from './formato/quantidade.js';
import { linhas } from './formato/texto-livre.js';

/** Tamanho de um passo, calibrado pela receita-piloto (média 51, maior 84 caracteres). */
export const LIMITE_PASSO = { verde: 90, amarelo: 150 };
export const corDoPasso = (t) => { const n = String(t ?? '').trim().length; return n <= LIMITE_PASSO.verde ? 'verde' : n <= LIMITE_PASSO.amarelo ? 'amarelo' : 'vermelho'; };

/** Divide um passo longo no fim de frase mais próximo do limite verde (ou numa vírgula). */
export function dividirPasso(t) {
  const s = String(t ?? '').trim();
  const ok = (i) => i > 20 && i < s.length - 10;
  const frases = [...s.matchAll(/[.;!?]\s+/g)].map((m) => m.index + 1).filter(ok);
  const cortes = frases.length ? frases : [...s.matchAll(/,\s+/g)].map((m) => m.index + 1).filter(ok);
  if (!cortes.length) return [s];
  const alvo = s.length / 2;
  const i = cortes.reduce((a, b) => (Math.abs(b - alvo) < Math.abs(a - alvo) ? b : a));
  const a = s.slice(0, i).trim().replace(/,$/, '.'), b = s.slice(i).trim();
  return [a, b.charAt(0).toUpperCase() + b.slice(1)];
}

export const linhaCompra = () => ({ item: '', quantidade: '', secao: '' });
export const linhaIngrediente = () => ({ quantidade: '', unidade: '', item: '', obs: '' });
export const novaEtapa = (nome = '') => ({ nome, nota: '', ingredientes: [linhaIngrediente()], passos: [''], dicas: [''], perguntouIgual: false });
const vazia = (o) => Object.values(o).every((v) => !String(v ?? '').trim());
/** Sempre mantém UMA linha vazia no fim (é ela que "aparece" quando você começa a digitar). */
export function comLinhaExtra(lista, fabrica) {
  const cheias = lista.filter((x) => (typeof x === 'string' ? x.trim() : !vazia(x)));
  return [...cheias, typeof fabrica === 'function' ? fabrica() : fabrica];
}

/** Receita (objeto do parser) → formulário. Sem receita = formulário em branco. */
export function formularioDaReceita(r = null) {
  const q = (t) => (t?.texto ? String(t.texto) : '');
  return {
    titulo: r?.titulo ?? '', descricao: r?.descricao ?? '', categoria: r?.categoria ?? '', cozinha: r?.cozinha ?? '',
    porcoes: r?.rendimento?.porcoes ? String(r.rendimento.porcoes) : '', rendimento: r?.rendimento?.texto ?? '',
    tempoPreparo: q(r?.tempos?.preparo), tempoCozimento: q(r?.tempos?.cozimento), tempoEspera: q(r?.tempos?.espera),
    dificuldade: r?.dificuldade ?? '', temperaturaForno: r?.temperaturaForno ?? '',
    equipamentos: (r?.equipamentos ?? []).join(', '), dieta: (r?.dieta ?? []).join(', '), tags: (r?.tags ?? []).join(', '),
    fonteSite: r?.fonte?.site ?? '', fonteAutor: r?.fonte?.autor ?? '', fonteUrl: r?.fonte?.url ?? '',
    compras: comLinhaExtra((r?.compras ?? []).map((c) => ({ item: c.item ?? '', quantidade: c.quantidade ?? '', secao: c.secao ?? '' })), linhaCompra),
    etapas: (r?.preparacoes?.length ? r.preparacoes : [null]).map((p) => (p ? {
      nome: p.nome ?? '', nota: p.nota ?? '', perguntouIgual: true,
      ingredientes: comLinhaExtra((p.ingredientes ?? []).map((i) => ({ quantidade: exibirQuantidade(q(i.quantidade)), unidade: i.unidade ?? '', item: i.item ?? '', obs: i.obs ?? '' })), linhaIngrediente),
      passos: comLinhaExtra([...(p.passos ?? [])], ''), dicas: comLinhaExtra([...(p.dicas ?? [])], ''),
    } : novaEtapa())),
    servir: (r?.servir ?? []).join('\n'), conservacao: (r?.conservacao ?? []).join('\n'), variacoes: (r?.variacoes ?? []).join('\n'),
  };
}

/** "Os ingredientes são os mesmos da lista de compras": copia os itens (quantidades ficam para ajustar). */
export function ingredientesDasCompras(compras) {
  return comLinhaExtra(compras.filter((c) => c.item.trim()).map((c) => ({ quantidade: '', unidade: '', item: c.item.trim(), obs: '' })), linhaIngrediente);
}

const lista = (t) => String(t ?? '').split(/[,;]/).map((x) => x.trim()).filter(Boolean);
const tempo = (t) => { const s = String(t ?? '').replace(/\s*min(utos)?\.?$/i, '').trim(); return s ? lerQuantidade(s) : null; };
const somar = (...ts) => {
  const v = ts.filter((t) => t?.min != null);
  if (!v.length) return null;
  const min = v.reduce((s, t) => s + t.min, 0), max = v.reduce((s, t) => s + (t.max ?? t.min), 0);
  return { texto: min === max ? String(min) : `${min} a ${max}`, min, max };
};

/** Lista de compras simples a partir dos ingredientes (quando o usuário não preencheu a dele). */
export function comprasDosIngredientes(preparacoes) {
  const mapa = new Map();
  for (const p of preparacoes) for (const i of p.ingredientes) {
    if (!i.item || /^[áa]gua\b/i.test(i.item)) continue;
    const k = i.item.toLowerCase();
    const q = [i.quantidade?.texto, i.unidade].filter(Boolean).join(' ');
    const atual = mapa.get(k);
    if (atual) { if (q) atual.quantidade = atual.quantidade ? `${atual.quantidade} + ${q}` : q; }
    else mapa.set(k, { item: i.item, quantidade: q, secao: '' });
  }
  return [...mapa.values()];
}

/** Problemas que impedem salvar, em linguagem simples (além dos erros do parser). */
export function problemasDoFormulario(f) {
  const p = [];
  if (!f.titulo.trim()) p.push('Dê um nome para a receita.');
  const etapas = f.etapas.filter((e) => e.passos.some((x) => x.trim()) || e.ingredientes.some((i) => i.item.trim()));
  if (!etapas.length) p.push('Escreva pelo menos um passo do preparo.');
  f.etapas.forEach((e, k) => {
    const nome = f.etapas.length > 1 ? `Etapa ${k + 1}${e.nome.trim() ? ` (${e.nome.trim()})` : ''}` : 'O preparo';
    if (e.ingredientes.some((i) => i.item.trim()) && !e.passos.some((x) => x.trim())) p.push(`${nome} tem ingredientes, mas nenhum passo.`);
    const longos = e.passos.filter((x) => corDoPasso(x) === 'vermelho').length;
    if (longos) p.push(`${nome} tem ${longos === 1 ? 'um passo longo demais' : `${longos} passos longos demais`} (acima de ${LIMITE_PASSO.amarelo} caracteres). Divida em mais campos.`);
    if (f.etapas.length > 1 && !e.nome.trim() && (e.passos.some((x) => x.trim()))) p.push(`Dê um nome para a etapa ${k + 1} (ex.: Massa, Recheio).`);
  });
  return p;
}

/**
 * Formulário → { texto (PRATORIA v1), resultado (do parser) }.
 * @param {object|null} base receita original (mantém o que o formulário não mostra: nutrição, substituições, ilustrações…)
 */
export function receitaDoFormulario(f, base = null, { usuario = '', agora = '' } = {}) {
  const r = base ? structuredClone(base) : {
    usuario, geradoEm: agora, geradoPor: 'Pratoria (formulário, sem IA)', promptVersao: '',
    refeicao: [], compras: [], nutricao: [], substituicoes: [], ilustracoes: [], anotacoes: [], alergenos: [], fonte: {},
  };
  const porcoes = parseInt(f.porcoes, 10) || null;
  r.titulo = f.titulo.trim();
  r.descricao = f.descricao.trim();
  r.categoria = f.categoria.trim();
  r.cozinha = (f.cozinha ?? '').trim();
  r.rendimento = { texto: (f.rendimento ?? '').trim() || (porcoes ? `${porcoes} ${porcoes === 1 ? 'porção' : 'porções'}` : ''), porcoes };
  const preparo = tempo(f.tempoPreparo), cozimento = tempo(f.tempoCozimento), espera = tempo(f.tempoEspera);
  r.tempos = { preparo, cozimento, espera, total: somar(preparo, cozimento, espera) };
  r.dificuldade = f.dificuldade.trim();
  r.temperaturaForno = f.temperaturaForno.trim();
  r.equipamentos = lista(f.equipamentos);
  r.dieta = lista(f.dieta);
  r.tags = lista(f.tags);
  r.fonte = { ...r.fonte, site: f.fonteSite.trim(), autor: f.fonteAutor.trim(), url: f.fonteUrl.trim() === SEM_LINK ? '' : f.fonteUrl.trim() };
  r.preparacoes = f.etapas.map((e, k) => {
    const ingredientes = e.ingredientes.filter((i) => i.item.trim()).map((i) => {
      const ing = { quantidade: i.quantidade.trim() ? lerQuantidade(i.quantidade.trim()) : null, unidade: i.unidade.trim(), item: i.item.trim(), obs: i.obs.trim() };
      return { ...ing, texto: textoIngrediente(ing) };
    });
    return { nome: e.nome.trim() || (f.etapas.length > 1 ? `Etapa ${k + 1}` : 'Receita'), nota: e.nota.trim(), ingredientes,
      passos: e.passos.map((x) => x.trim()).filter(Boolean), dicas: e.dicas.map((x) => x.trim()).filter(Boolean) };
  }).filter((p) => p.ingredientes.length || p.passos.length);
  const compras = f.compras.filter((c) => c.item.trim()).map((c) => ({ item: c.item.trim(), quantidade: c.quantidade.trim(), secao: c.secao.trim() }));
  r.compras = compras.length ? compras : comprasDosIngredientes(r.preparacoes);
  r.servir = linhas(f.servir);
  r.conservacao = linhas(f.conservacao);
  r.variacoes = linhas(f.variacoes);
  const texto = serializarReceita(r, { incluirAnotacoes: true });
  const resultado = interpretarReceita(texto, { origem: 'manual' });
  for (const p of problemasDoFormulario(f)) if (!resultado.erros.includes(p)) resultado.erros.unshift(p);
  resultado.valido = resultado.erros.length === 0;
  if (resultado.receita) for (const k of ['idOrigem', 'recebidaDe', 'importadoEm', 'historicoCompartilhamento']) if (base?.[k] !== undefined) resultado.receita[k] = base[k];
  return { texto, resultado };
}
