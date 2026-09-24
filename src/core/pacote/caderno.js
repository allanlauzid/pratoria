// Pratoria — backup do CADERNO INTEIRO num único arquivo .pratoria (zip por dentro).
//   caderno.json                     receitas (com dados pessoais), estado, configurações, perfil
//   imagens/<receitaId>.<ext>        foto de cada prato
//   ilustracoes/<receitaId>/cartela.<ext> e ilustracoes/<receitaId>/<n>.<ext>  (giz)
// Mesmo nome de extensão da receita: o Pratoria reconhece pelo conteúdo (tem caderno.json).

import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';

const EXT = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' };
const TIPO = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
const LIMITE_TOTAL = 800 * 1024 * 1024;
export const VERSAO_CADERNO = 2;

const bytes = async (b) => (b instanceof Uint8Array ? b : new Uint8Array(await b.arrayBuffer()));
const ext = (blob) => EXT[blob?.type] ?? 'bin';
const blobDe = (u8, caminho) => new Blob([u8], { type: TIPO[caminho.split('.').pop()] ?? 'application/octet-stream' });

/**
 * @param {{perfil, receitas, estado, config, imagens: Array<{receitaId, blob}>, ilustracoes: Array<{receitaId, cartela, grade, recortes: Array<{ingrediente, chave, blob}>}>}} c
 * @returns {Promise<Uint8Array>}
 */
export async function criarBackupCaderno(c) {
  const arquivos = {};
  const ilus = [];
  for (const im of c.imagens ?? []) if (im?.blob) arquivos[`imagens/${im.receitaId}.${ext(im.blob)}`] = [await bytes(im.blob), { level: 0 }];
  for (const il of c.ilustracoes ?? []) {
    const pasta = `ilustracoes/${il.receitaId}`;
    const meta = { receitaId: il.receitaId, grade: il.grade ?? null, cartela: null, recortes: [] };
    if (il.cartela) { meta.cartela = `${pasta}/cartela.${ext(il.cartela)}`; arquivos[meta.cartela] = [await bytes(il.cartela), { level: 0 }]; }
    (il.recortes ?? []).forEach((r, n) => { meta.recortes.push({ ingrediente: r.ingrediente, chave: r.chave, arquivo: r.blob ? `${pasta}/${n + 1}.${ext(r.blob)}` : null }); });
    for (const [n, r] of (il.recortes ?? []).entries()) if (r.blob) arquivos[`${pasta}/${n + 1}.${ext(r.blob)}`] = [await bytes(r.blob), { level: 0 }];
    ilus.push(meta);
  }
  const json = {
    app: 'pratoria', tipo: 'caderno', versao: VERSAO_CADERNO, exportadoEm: new Date().toISOString(),
    perfil: c.perfil ?? null, receitas: c.receitas ?? [], estado: c.estado ?? [], config: c.config ?? {}, ilustracoes: ilus,
  };
  arquivos['caderno.json'] = strToU8(JSON.stringify(json));
  return zipSync(arquivos, { level: 6 });
}

/** true se os bytes são um zip com caderno.json (backup do caderno, não uma receita). */
export function ehBackupCaderno(u8) {
  if (!(u8?.length > 3 && u8[0] === 0x50 && u8[1] === 0x4b)) return false;
  try { return Object.keys(unzipSync(u8, { filter: (f) => f.name === 'caderno.json' })).length === 1; } catch { return false; }
}

/** @returns {{perfil, receitas, estado, config, exportadoEm, imagens: Array<{receitaId, blob}>, ilustracoes: Array<{receitaId, grade, cartela, recortes}>}} */
export function lerBackupCaderno(u8) {
  let total = 0;
  const z = unzipSync(u8, { filter: (f) => { total += f.originalSize; if (total > LIMITE_TOTAL) throw new Error('Backup grande demais.'); return true; } });
  if (!z['caderno.json']) throw new Error('Este arquivo não é um backup do caderno.');
  const j = JSON.parse(strFromU8(z['caderno.json']));
  if (j.app !== 'pratoria' || j.tipo !== 'caderno') throw new Error('Este arquivo não é um backup do Pratoria.');
  const imagens = Object.keys(z).filter((k) => k.startsWith('imagens/'))
    .map((k) => ({ receitaId: k.slice(8).replace(/\.[^.]+$/, ''), blob: blobDe(z[k], k) }));
  const ilustracoes = (j.ilustracoes ?? []).map((m) => ({
    receitaId: m.receitaId, grade: m.grade,
    cartela: m.cartela && z[m.cartela] ? blobDe(z[m.cartela], m.cartela) : null,
    recortes: m.recortes.map((r) => ({ ingrediente: r.ingrediente, chave: r.chave, blob: r.arquivo && z[r.arquivo] ? blobDe(z[r.arquivo], r.arquivo) : null })),
  }));
  return { perfil: j.perfil, receitas: j.receitas ?? [], estado: j.estado ?? [], config: j.config ?? {}, exportadoEm: j.exportadoEm, imagens, ilustracoes };
}
