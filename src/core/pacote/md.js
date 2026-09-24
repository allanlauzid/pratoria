// Pratoria — o arquivo receita.md (layout seguro, ver docs/proposta-arquivo-ux-design.md §2).
//
// ENVELOPE (quem compartilhou, quando o arquivo foi gerado, o que vai dentro) →
// RECEITA (formato PRATORIA v1, com impressão digital própria) → IMAGENS (índice) →
// PROMPTS → ANEXOS (base64, opcionais) → FIM-DO-ARQUIVO.
// Marcadores de máquina em comentários HTML (invisíveis ao renderizar), cercas de
// 4 crases (os prompts contêm cercas de 3), linhas de base64 com 76 caracteres.

import { serializarReceita } from '../formato/serializar.js';

export const ARQUIVO_VERSAO = 1;
const C4 = '````';

// ---------- utilidades ----------
export function normalizarTexto(t) {
  return String(t ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/^﻿/, '');
}
export async function sha256Hex(dados) {
  const bytes = typeof dados === 'string' ? new TextEncoder().encode(dados) : dados;
  const h = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function bytesParaBase64(bytes) {
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function base64ParaBytes(b64) {
  const bin = atob(String(b64).replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const dataHora = (iso) => {
  const d = new Date(iso); const p = (n) => String(n).padStart(2, '0');
  return Number.isNaN(d.getTime()) ? iso : `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const ARTE = [
  '       ,-.      .-~-.      .---.',
  '      ( @ )    ( o o )    (_____)',
  "  .---'-'------'---'------'-----'---.",
  '  \\                                 /',
  '   \\     P  R  A  T  O  R  I  A    /',
  "    '.___________________________.'",
  '          caderno de receitas',
].join('\n');

const faixa = (titulo) => '```text\n+--[ ' + titulo + ' ]' + '-'.repeat(Math.max(4, 46 - titulo.length)) + '+\n```';

// ---------- gerar ----------
/**
 * @param {object} p
 * @param {object} p.receita objeto do parser
 * @param {string} p.compartilhadoPor
 * @param {string} p.exportadoEm ISO com fuso
 * @param {string[]} [p.historico] "Nome ISO" de quem já passou a receita adiante
 * @param {'texto'|'imagens'} p.pacote
 * @param {boolean} p.base64 imagens dentro do .md
 * @param {Array<{nome,caminho,tipo,largura,altura,sha256,bytes}>} [p.imagens]
 * @param {{texto?:string, imagem?:string, ilustracoes?:string}} [p.prompts]
 * @param {string} [p.pacoteCompleto] endereço do .pratoria online
 * @param {string} [p.app]
 */
export async function gerarMd(p) {
  const receitaTexto = normalizarTexto(serializarReceita(p.receita, { incluirAnotacoes: false }));
  const receitaSha = await sha256Hex(receitaTexto);
  const imagens = (p.imagens ?? []).map((im) => ({
    ...im,
    estado: im.bytes && p.base64 ? 'anexo' : im.bytes && p.pacote === 'imagens' ? 'arquivo' : p.pacoteCompleto ? 'link' : 'ausente',
  }));
  const historico = [...(p.historico ?? []), `${p.compartilhadoPor || 'sem nome'} ${p.exportadoEm}`];
  const L = [];
  L.push(`<!-- PRATORIA:ARQUIVO v${ARQUIVO_VERSAO} -->`, '```text', ARTE, '```', '',
    '> Receita compartilhada pelo Pratoria. Para vê-la organizada, abra no',
    '> Pratoria: Receber → Abrir arquivo. Não edite as linhas <!-- … -->.', '');
  L.push('<!-- PRATORIA:ENVELOPE:INICIO -->', `${C4}pratoria-envelope`, '# +--[ ENVELOPE ]------------------------------------+',
    `compartilhado_por: ${p.compartilhadoPor || 'sem nome'}`,
    `exportado_em: ${p.exportadoEm}`,
    `historico: ${historico.join(' > ')}`,
    `app: ${p.app ?? 'Pratoria'}`,
    `arquivo_versao: ${ARQUIVO_VERSAO}`,
    `pacote: ${p.pacote === 'imagens' ? 'texto+imagens' : 'texto'}`,
    `imagens_no_md: ${p.base64 && imagens.some((i) => i.estado === 'anexo') ? 'sim' : 'nao'}`,
    `receita_id: ${p.receita.id || ''}`,
    `receita_sha256: ${receitaSha}`,
    `pacote_completo: ${p.pacoteCompleto || '[pacote completo não disponível online]'}`,
    '# +--------------------------------------------------+', C4, '<!-- PRATORIA:ENVELOPE:FIM -->', '');
  L.push('<!-- PRATORIA:RECEITA:INICIO -->', receitaTexto, '<!-- PRATORIA:RECEITA:FIM -->', '');
  L.push('<!-- PRATORIA:IMAGENS:INICIO -->', faixa('IMAGENS'));
  if (!imagens.length) L.push('- [imagens não incluídas]');
  for (const im of imagens) L.push(`- ${im.nome} | ${im.caminho} | ${im.largura ?? '?'}x${im.altura ?? '?'} | sha256:${im.sha256} | ${im.estado}`);
  const ilus = (p.receita.ilustracoes ?? []).slice().sort((a, b) => a.ordem - b.ordem);
  if (ilus.length && imagens.some((i) => i.nome === 'ilustracoes')) {
    L.push(`- ilustracoes-mapa | ${p.mapaGrade ?? ''} | ${ilus.map((i) => i.ingrediente.replace(/[,|]/g, ' ')).join(',')}`);
  }
  L.push('<!-- PRATORIA:IMAGENS:FIM -->', '');
  L.push('<!-- PRATORIA:PROMPTS:INICIO -->', faixa('PROMPTS'));
  let algumPrompt = false;
  for (const tipo of ['texto', 'imagem', 'ilustracoes']) {
    const t = p.prompts?.[tipo];
    if (t) { algumPrompt = true; L.push(`${C4}pratoria-prompt tipo=${tipo}`, normalizarTexto(t), C4); }
  }
  if (!algumPrompt) L.push('- [prompts não incluídos: o Pratoria de quem recebe monta de novo]');
  L.push('<!-- PRATORIA:PROMPTS:FIM -->', '');
  const anexos = imagens.filter((i) => i.estado === 'anexo');
  if (anexos.length) {
    L.push('<!-- PRATORIA:ANEXOS:INICIO -->');
    for (const im of anexos) {
      L.push(`${C4}pratoria-imagem nome=${im.nome} tipo=${im.tipo} sha256=${im.sha256}`,
        bytesParaBase64(im.bytes).match(/.{1,76}/g).join('\n'), C4);
    }
    L.push('<!-- PRATORIA:ANEXOS:FIM -->', '');
  }
  const col = `feito no Pratoria · gerado em ${dataHora(p.exportadoEm)} · por ${p.compartilhadoPor || 'sem nome'}`;
  L.push('```text', '  +' + '-'.repeat(col.length + 4) + '+', `  |  ${col}  |`, '  +' + '-'.repeat(col.length + 4) + '+', '```',
    '<!-- PRATORIA:FIM-DO-ARQUIVO -->', '');
  return { md: L.join('\n'), receitaSha, imagens };
}

// ---------- ler ----------
function bloco(texto, nome) {
  const ini = `<!-- PRATORIA:${nome}:INICIO -->`, fim = `<!-- PRATORIA:${nome}:FIM -->`;
  const a = texto.indexOf(ini);
  if (a < 0) return null;
  const b = texto.indexOf(fim, a);
  return { conteudo: texto.slice(a + ini.length, b < 0 ? undefined : b).replace(/^\n/, '').replace(/\n$/, ''), fechado: b >= 0 };
}
const RE_CERCA = /````pratoria-(\w+)([^\n]*)\n([\s\S]*?)\n````/g;
const atributos = (s) => Object.fromEntries([...s.matchAll(/(\w+)=(\S+)/g)].map((m) => [m[1], m[2]]));

/**
 * Lê um receita.md (ou texto PRATORIA puro, ou arquivo antigo).
 * @returns {Promise<{textoReceita, envelope, indice, mapa, prompts, anexos, avisos, completo, receitaIntegra}>}
 */
export async function lerMd(entrada) {
  const texto = normalizarTexto(entrada);
  const avisos = [];
  if (!texto.includes('<!-- PRATORIA:ARQUIVO')) {
    return { textoReceita: texto, envelope: {}, indice: [], mapa: null, prompts: {}, anexos: new Map(), avisos, completo: true, receitaIntegra: null, formatoArquivo: false };
  }
  const completo = texto.includes('<!-- PRATORIA:FIM-DO-ARQUIVO -->');
  if (!completo) avisos.push('O arquivo chegou incompleto (faltou o fim). A receita foi lida; imagens ou prompts podem ter se perdido.');

  const envelope = {};
  const env = bloco(texto, 'ENVELOPE');
  if (env) for (const [, , , corpo] of env.conteudo.matchAll(RE_CERCA)) {
    for (const linha of corpo.split('\n')) {
      const m = linha.match(/^([a-z_0-9]+):\s*(.*)$/); if (m) envelope[m[1]] = m[2].trim();
    }
  }

  const rec = bloco(texto, 'RECEITA');
  if (!rec) avisos.push('Não encontrei o bloco da receita.');
  else if (!rec.fechado) avisos.push('O bloco da receita chegou cortado.');
  const textoReceita = rec?.conteudo ?? '';
  let receitaIntegra = null;
  if (rec && envelope.receita_sha256) {
    receitaIntegra = (await sha256Hex(normalizarTexto(textoReceita))) === envelope.receita_sha256;
    if (!receitaIntegra) avisos.push('O texto da receita foi alterado depois de gerado (a impressão digital não confere). Revise antes de salvar.');
  }

  const indice = []; let mapa = null;
  const img = bloco(texto, 'IMAGENS');
  if (img) for (const linha of img.conteudo.split('\n')) {
    const m = linha.match(/^- (.+)$/); if (!m) continue;
    const c = m[1].split('|').map((x) => x.trim());
    if (c[0] === 'ilustracoes-mapa') { mapa = { grade: c[1] || '', ingredientes: (c[2] || '').split(',').map((x) => x.trim()).filter(Boolean) }; continue; }
    if (c.length < 5) continue;
    const [w, h] = c[2].split('x');
    indice.push({ nome: c[0], caminho: c[1], largura: +w || null, altura: +h || null, sha256: c[3].replace(/^sha256:/, ''), estado: c[4] });
  }

  const prompts = {};
  const pr = bloco(texto, 'PROMPTS');
  if (pr) for (const [, tipo, attrs, corpo] of pr.conteudo.matchAll(RE_CERCA)) if (tipo === 'prompt') prompts[atributos(attrs).tipo] = corpo;

  const anexos = new Map();
  const ax = bloco(texto, 'ANEXOS');
  if (ax) for (const [, tipo, attrs, corpo] of ax.conteudo.matchAll(RE_CERCA)) {
    if (tipo !== 'imagem') continue;
    const a = atributos(attrs);
    try { anexos.set(a.nome, { tipo: a.tipo, sha256: a.sha256, bytes: base64ParaBytes(corpo) }); }
    catch { avisos.push(`A imagem "${a.nome}" dentro do arquivo está danificada.`); }
  }
  return { textoReceita, envelope, indice, mapa, prompts, anexos, avisos, completo, receitaIntegra, formatoArquivo: true };
}
