// Pratoria — interpretador do formato PRATORIA v1 (sem IA).
// Recebe o texto colado (vindo do ChatGPT, do WhatsApp ou de um backup) e devolve
// { receita, erros, avisos, valido }. Erros impedem salvar; avisos só informam.
//
// Tolerâncias: bloco de código (```), texto antes do marcador, cópia de markdown já
// renderizado (títulos sem "#"), **negrito**, acentos opcionais nos nomes de seção e
// campos, marcadores - * • –, listas "1." e "1)".

import { lerQuantidade, exibirQuantidade } from './quantidade.js';
import { slugify } from './slug.js';
import { CATEGORIAS, REFEICOES, DIFICULDADES, CUSTOS, DIETAS, ALERGENOS, SECOES_MERCADO, NUTRIENTES } from '../import/listas.js';

export const FORMATO_VERSAO = 1;
/** Valor explícito quando a receita não tem link original. */
export const SEM_LINK = '[sem link original]';
const ehSemLink = (v) => /^\[?\s*sem link/i.test(String(v ?? '').trim());

// Campos do cabeçalho: chave no texto → tipo.
const CAMPOS = {
  id: 'texto', usuario: 'texto', ajustes: 'lista', gerado_em: 'texto', gerado_por: 'texto', prompt_versao: 'texto',
  titulo: 'texto', titulo_original: 'texto', descricao: 'longo', categoria: 'texto', cozinha: 'texto',
  refeicao: 'lista', tags: 'lista', rendimento: 'texto', porcoes: 'numero',
  tempo_preparo_min: 'numero', tempo_cozimento_min: 'numero', tempo_espera_min: 'numero', tempo_total_min: 'numero',
  dificuldade: 'texto', custo: 'texto', equipamentos: 'lista', temperatura_forno: 'texto',
  dieta: 'lista', alergenos: 'lista',
  fonte_site: 'texto', fonte_autor: 'texto', fonte_url: 'texto', fonte_publicado_em: 'texto', fonte_video: 'texto',
  idioma_original: 'texto', visual: 'longo', foto_original: 'texto',
};

// Seções gerais (fecham a preparação aberta).
const SECOES_GERAIS = {
  COMPRAS: 'compras', NUTRICAO: 'nutricao', SUBSTITUICOES: 'substituicoes', VARIACOES: 'variacoes',
  SERVIR: 'servir', CONSERVACAO: 'conservacao', ANOTACOES: 'anotacoes', ILUSTRACOES: 'ilustracoes',
};
// Subseções de preparação.
const SUBSECOES = { INGREDIENTES: 'ingredientes', PASSOS: 'passos', 'MODO DE PREPARO': 'passos', PREPARO: 'passos', DICAS: 'dicas', DICA: 'dicas', NOTA: 'nota', NOTAS: 'nota' };

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const limparTitulo = (l) => l.replace(/^[\s#*_>]+/, '').replace(/[\s*_:]+$/, '').trim();

function reconhecerSecao(linha) {
  const bruto = limparTitulo(linha);
  const norm = semAcento(bruto).toUpperCase();
  let m;
  if ((m = norm.match(/^PRATORIA\s+V(\d+)\b/))) return { tipo: 'inicio', versao: +m[1] };
  if (norm === 'FIM') return { tipo: 'fim' };
  if ((m = bruto.match(/^prepara[çc][ãa]o\s*[:\-–]\s*(.+)$/i))) return { tipo: 'preparacao', nome: m[1].trim() };
  if (SECOES_GERAIS[norm]) return { tipo: 'geral', secao: SECOES_GERAIS[norm] };
  if (SUBSECOES[norm]) return { tipo: 'sub', secao: SUBSECOES[norm] };
  return null;
}

const RE_MARCADOR = /^\s*[-*•–·]\s+(.*)$/;
const RE_NUMERADO = /^\s*(\d{1,2})[.)]\s+(.*)$/;
const RE_CAMPO = /^\s*\**([A-Za-zÀ-ÿ_ ]{2,24})\**\s*:\s*\**\s*(.*)$/;

const limparItem = (t) => t.replace(/\*\*/g, '').trim();
const partir = (t) => t.split('|').map((p) => p.trim());
const listaDe = (t) => String(t ?? '').split(/[,;]/).map((x) => x.trim()).filter(Boolean);

/** "quantidade | unidade | ingrediente | observação" */
export function lerIngrediente(texto, avisos, contexto) {
  const partes = partir(texto);
  let quantidade = null, unidade = '', item = '', obs = '';
  if (partes.length >= 3) {
    quantidade = partes[0] ? lerQuantidade(partes[0]) : null;
    unidade = partes[1];
    item = partes[2];
    obs = partes.slice(3).filter(Boolean).join(', ');
  } else if (partes.length === 2) {
    const q = lerQuantidade(partes[0]);
    if (q && q.min !== null) { quantidade = q; item = partes[1]; } else { item = partes[0]; obs = partes[1]; }
    avisos.push(`${contexto}: ingrediente com campos incompletos — "${texto}".`);
  } else {
    item = texto.trim();
    avisos.push(`${contexto}: ingrediente sem separadores "|" — "${texto}". Mantido como texto.`);
  }
  const ing = { quantidade, unidade, item, obs };
  ing.texto = textoIngrediente(ing);
  return ing;
}

/** Frase de exibição: "¼ xícara de grão-de-bico seco, lavado". */
export function textoIngrediente({ quantidade, unidade, item, obs }) {
  const q = quantidade ? exibirQuantidade(quantidade.texto) : '';
  const frase = unidade
    ? [q, unidade, /^d[eao]s?\s/i.test(item) ? item : `de ${item}`].filter(Boolean).join(' ')
    : [q, item].filter(Boolean).join(' ');
  return obs ? `${frase}, ${obs}` : frase;
}

function lerCompra(texto) {
  const [item = '', quantidade = '', secao = ''] = partir(texto);
  return { item, quantidade, secao: secao.toLowerCase() };
}

/** "ordem | ingrediente | como desenhar | Preparação:passo" */
function lerIlustracao(texto, ordemPadrao) {
  const [o = '', ingrediente = '', desenho = '', onde = ''] = partir(texto);
  const m = onde.match(/^(.*?)[\s:]+(?:passo\s*)?(\d+)\s*$/i);
  return {
    ordem: /^\d+$/.test(o) ? +o : ordemPadrao,
    ingrediente: /^\d+$/.test(o) ? ingrediente : o || ingrediente,
    desenho: /^\d+$/.test(o) ? desenho : ingrediente ? desenho : '',
    onde: m ? { preparacao: m[1].trim(), passo: +m[2] } : null,
  };
}

const novaPreparacao = (nome) => ({ nome, nota: '', ingredientes: [], passos: [], dicas: [] });

function foraDaLista(valor, lista) {
  const n = semAcento(valor).toLowerCase();
  return !lista.some((x) => semAcento(x).toLowerCase() === n);
}

/**
 * @param {string} texto
 * @param {{origem?: 'importacao'|'manual'|'backup'}} [opcoes]
 */
export function interpretarReceita(texto, opcoes = {}) {
  const origem = opcoes.origem ?? 'importacao';
  const erros = [];
  const avisos = [];
  const campos = {};
  const geral = { compras: [], nutricao: [], substituicoes: [], variacoes: [], servir: [], conservacao: [], anotacoes: [], nota: [], ilustracoes: [] };
  const preparacoes = [];
  let versao = null;
  let achouFim = false;

  let linhas = String(texto ?? '').replace(/\r\n?/g, '\n').split('\n');
  const idxInicio = linhas.findIndex((l) => reconhecerSecao(l)?.tipo === 'inicio');
  if (idxInicio >= 0) { versao = reconhecerSecao(linhas[idxInicio]).versao; linhas = linhas.slice(idxInicio + 1); }
  else avisos.push('Marcador "#PRATORIA v1" não encontrado. Tentando ler mesmo assim.');
  if (versao !== null && versao > FORMATO_VERSAO) avisos.push(`Formato v${versao} é mais novo que o suportado (v${FORMATO_VERSAO}).`);

  let secao = 'cabecalho';
  let prep = null;
  let ultimoCampo = null;
  const ignoradas = [];

  for (const bruta of linhas) {
    const linha = bruta.trimEnd();
    if (!linha.trim() || /^\s*(```|~~~)/.test(linha)) { ultimoCampo = null; continue; }

    const sec = reconhecerSecao(linha);
    if (sec) {
      ultimoCampo = null;
      if (sec.tipo === 'inicio') continue;
      if (sec.tipo === 'fim') { achouFim = true; break; }
      if (sec.tipo === 'preparacao') { prep = novaPreparacao(sec.nome); preparacoes.push(prep); secao = 'prep:ingredientes'; continue; }
      if (sec.tipo === 'geral') { prep = null; secao = 'geral:' + sec.secao; continue; }
      // subseção
      if (sec.secao === 'nota' && !prep) { secao = 'geral:nota'; continue; }
      if (sec.secao === 'dicas' && !prep) { secao = 'geral:variacoes'; avisos.push('"DICAS" fora de preparação foi lida como variações.'); continue; }
      if (!prep) {
        prep = novaPreparacao(campos.titulo || 'Preparo');
        preparacoes.push(prep);
        avisos.push(`Seção "${limparTitulo(linha)}" apareceu sem "## PREPARACAO: …"; criada uma preparação padrão.`);
      }
      secao = 'prep:' + sec.secao;
      continue;
    }

    const marc = linha.match(RE_MARCADOR);
    const num = linha.match(RE_NUMERADO);
    const conteudo = limparItem(marc ? marc[1] : num ? num[2] : linha);

    if (secao === 'cabecalho') {
      const c = linha.match(RE_CAMPO);
      if (c) {
        const chave = semAcento(c[1].trim().toLowerCase()).replace(/\s+/g, '_');
        if (chave in CAMPOS) { campos[chave] = c[2].trim(); ultimoCampo = chave; }
        else avisos.push(`Campo desconhecido ignorado: "${c[1].trim()}".`);
      } else if (ultimoCampo && CAMPOS[ultimoCampo] === 'longo') campos[ultimoCampo] += ' ' + linha.trim();
      else ignoradas.push(linha.trim());
      continue;
    }
    if (secao.startsWith('geral:')) {
      const nome = secao.slice(6);
      if (!conteudo) continue;
      if (nome === 'compras') geral.compras.push(lerCompra(conteudo));
      else if (nome === 'nutricao') { const [n = '', v = ''] = partir(conteudo); geral.nutricao.push({ nome: n.toLowerCase(), valor: v }); }
      else if (nome === 'ilustracoes') geral.ilustracoes.push(lerIlustracao(conteudo, geral.ilustracoes.length + 1));
      else if (nome === 'substituicoes') { const [o = '', s = '', ob = ''] = partir(conteudo); geral.substituicoes.push({ original: o, substituto: s, obs: ob }); }
      else geral[nome].push(conteudo);
      continue;
    }
    if (secao === 'prep:nota') { prep.nota = [prep.nota, conteudo].filter(Boolean).join(' '); continue; }
    if (secao === 'prep:ingredientes') {
      if (marc || num || linha.includes('|')) prep.ingredientes.push(lerIngrediente(conteudo, avisos, prep.nome));
      else ignoradas.push(linha.trim());
      continue;
    }
    if (secao === 'prep:passos') {
      if (marc || num || !prep.passos.length) prep.passos.push(conteudo);
      else prep.passos[prep.passos.length - 1] += ' ' + conteudo; // continuação do passo anterior
      continue;
    }
    if (secao === 'prep:dicas') { prep.dicas.push(conteudo); continue; }
  }

  if (ignoradas.length) avisos.push(`${ignoradas.length} linha(s) fora do formato foram ignoradas: ${ignoradas.slice(0, 3).map((l) => `"${l}"`).join(', ')}${ignoradas.length > 3 ? '…' : ''}`);
  if (!achouFim) avisos.push('Marcador "#FIM" não encontrado: a resposta pode ter sido cortada. Confira se a receita está completa.');

  // ---- validação ----
  if (!campos.titulo) erros.push('Falta o título (linha "titulo: …").');
  if (!preparacoes.length) erros.push('Nenhuma preparação encontrada (seção "## PREPARACAO: …").');
  for (const p of preparacoes) {
    if (!p.passos.length) erros.push(`A preparação "${p.nome}" não tem passos.`);
    if (!p.ingredientes.length) avisos.push(`A preparação "${p.nome}" não tem ingredientes.`);
  }
  const semLink = ehSemLink(campos.fonte_url);
  if (semLink) campos.fonte_url = '';
  if (origem === 'importacao' && !campos.fonte_url && !semLink) avisos.push('Sem "fonte_url": a receita ficará sem link para o original.');

  const conferir = (rotulo, valores, lista) => {
    const fora = valores.filter((v) => foraDaLista(v, lista));
    if (fora.length) avisos.push(`${rotulo} fora da lista padrão: ${fora.join(', ')}.`);
  };
  if (campos.categoria) conferir('Categoria', [campos.categoria], CATEGORIAS);
  conferir('Refeição', listaDe(campos.refeicao), REFEICOES);
  if (campos.dificuldade) conferir('Dificuldade', [campos.dificuldade], DIFICULDADES);
  if (campos.custo) conferir('Custo', [campos.custo], CUSTOS);
  conferir('Dieta', listaDe(campos.dieta), DIETAS);
  conferir('Alérgeno', listaDe(campos.alergenos), ALERGENOS);
  conferir('Seção de mercado', geral.compras.map((c) => c.secao).filter(Boolean), SECOES_MERCADO);
  conferir('Nutriente', geral.nutricao.map((n) => n.nome), NUTRIENTES);

  let compras = geral.compras;
  if (!compras.length && preparacoes.length) {
    const vistos = new Set();
    compras = preparacoes.flatMap((p) => p.ingredientes.map((i) => i.item))
      .filter((i) => i && !/^[áa]gua\b/i.test(i) && !vistos.has(i.toLowerCase()) && vistos.add(i.toLowerCase()))
      .map((item) => ({ item, quantidade: '', secao: '' }));
    avisos.push('Lista de compras ausente; gerada a partir dos ingredientes. Revise.');
  }

  const num = (k) => (campos[k] ? lerQuantidade(campos[k]) : null);
  const porcoesTxt = campos.porcoes || (campos.rendimento ?? '').match(/\d+/)?.[0] || '';

  const receita = {
    formato: versao ?? FORMATO_VERSAO,
    // identidade e rastreio
    id: campos.id ?? '',
    ajustes: listaDe(campos.ajustes),
    usuario: campos.usuario ?? '',
    geradoEm: campos.gerado_em ?? '',
    geradoPor: campos.gerado_por ?? '',
    promptVersao: campos.prompt_versao ?? '',
    // essencial
    slug: slugify(campos.titulo ?? ''),
    titulo: campos.titulo ?? '',
    tituloOriginal: campos.titulo_original ?? '',
    descricao: campos.descricao ?? '',
    // classificação
    categoria: campos.categoria ?? '',
    cozinha: campos.cozinha ?? '',
    refeicao: listaDe(campos.refeicao),
    tags: listaDe(campos.tags),
    // quantidades e tempo
    rendimento: { texto: campos.rendimento ?? '', porcoes: porcoesTxt ? lerQuantidade(porcoesTxt).min : null },
    tempos: { preparo: num('tempo_preparo_min'), cozimento: num('tempo_cozimento_min'), espera: num('tempo_espera_min'), total: num('tempo_total_min') },
    dificuldade: campos.dificuldade ?? '',
    custo: campos.custo ?? '',
    equipamentos: listaDe(campos.equipamentos),
    temperaturaForno: campos.temperatura_forno ?? '',
    // saúde (estimado pelo LLM — exibir com aviso)
    dieta: listaDe(campos.dieta),
    alergenos: listaDe(campos.alergenos),
    nutricao: geral.nutricao,
    // crédito
    fonte: {
      site: campos.fonte_site ?? '', autor: campos.fonte_autor ?? '', url: campos.fonte_url ?? '',
      publicadoEm: campos.fonte_publicado_em ?? '', video: campos.fonte_video ?? '',
    },
    idiomaOriginal: campos.idioma_original ?? '',
    visual: campos.visual ?? '',
    fotoOriginal: /^https?:\/\//i.test(campos.foto_original ?? '') ? campos.foto_original.trim() : '',
    // conteúdo
    nota: geral.nota.join(' '),
    compras,
    preparacoes,
    substituicoes: geral.substituicoes,
    variacoes: geral.variacoes,
    servir: geral.servir,
    conservacao: geral.conservacao,
    anotacoes: geral.anotacoes,
    ilustracoes: geral.ilustracoes,
  };

  return { receita, erros, avisos, valido: erros.length === 0 };
}
