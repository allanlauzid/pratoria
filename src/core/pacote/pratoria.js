// Pratoria — o arquivo .pratoria (por dentro, um zip feito com fflate).
//   receita.md                  sempre
//   imagens/prato.webp          pacote "texto+imagens" sem base64
//   imagens/ilustracoes.webp    idem (cartela a giz)
// O PWA reconhece pelo CONTEÚDO (assinatura PK de zip, ou texto PRATORIA), nunca pela extensão.

import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { gerarMd, lerMd, sha256Hex } from './md.js';
import { ehLinkDeReceita, textoDoLink } from '../compartilhar/link.js';
import { lerArquivoRecebido } from '../compartilhar/arquivo.js';

export const EXTENSAO = '.pratoria';
const LIMITE_TOTAL = 60 * 1024 * 1024;   // proteção contra "zip-bomba"
const LIMITE_ARQUIVO = 25 * 1024 * 1024;
const EXT = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' };

async function paraBytes(x) {
  if (x instanceof Uint8Array) return x;
  if (x instanceof ArrayBuffer) return new Uint8Array(x);
  return new Uint8Array(await x.arrayBuffer());
}
const ehZip = (b) => b.length > 3 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;

/**
 * @param {object} p  mesmos campos de gerarMd, mas `imagens` = [{nome:'prato'|'ilustracoes', blob, largura?, altura?}]
 * @returns {Promise<{arquivo: File, md: string}>}
 */
export async function criarPratoria(p) {
  const imagens = [];
  for (const im of p.imagens ?? []) {
    if (!im?.blob) continue;
    const bytes = await paraBytes(im.blob);
    const tipo = im.blob.type || 'image/webp';
    imagens.push({ nome: im.nome, caminho: `imagens/${im.nome}.${EXT[tipo] ?? 'bin'}`, tipo, largura: im.largura, altura: im.altura, sha256: await sha256Hex(bytes), bytes });
  }
  const { md, imagens: indexadas } = await gerarMd({ ...p, imagens: p.pacote === 'imagens' ? imagens : imagens.map((i) => ({ ...i, bytes: null })) });
  const arquivos = { 'receita.md': strToU8(md) };
  for (const im of indexadas) if (im.estado === 'arquivo') arquivos[im.caminho] = [im.bytes, { level: 0 }];
  const zip = zipSync(arquivos, { level: 6 });
  const nome = `${p.receita.slug || 'receita'}${EXTENSAO}`;
  return { arquivo: new File([zip], nome, { type: 'application/zip' }), md };
}

/**
 * Abre qualquer coisa que chegue: .pratoria/.zip, .md, .txt antigo, texto colado ou link #r1.
 * @returns {Promise<{textoReceita, envelope, imagens: Array<{nome, blob, tipo, integra, estado}>, prompts, mapa, avisos, via}>}
 */
export async function abrirEntrada(entrada) {
  let via = 'texto', texto, zipArquivos = null;
  if (typeof entrada === 'string') {
    if (ehLinkDeReceita(entrada)) { texto = await textoDoLink(entrada.match(/\S*#r1\.\S+/)[0]); via = 'link'; }
    else texto = entrada;
  } else {
    const bytes = await paraBytes(entrada);
    if (ehZip(bytes)) {
      via = 'pacote';
      let total = 0;
      zipArquivos = unzipSync(bytes, {
        filter: (f) => {
          total += f.originalSize;
          if (f.originalSize > LIMITE_ARQUIVO || total > LIMITE_TOTAL) throw new Error('Arquivo grande demais para ser uma receita.');
          return /\.(md|txt|webp|png|jpe?g)$/i.test(f.name) && !f.name.includes('..');
        },
      });
      const nomeMd = Object.keys(zipArquivos).find((n) => /(^|\/)receita\.md$/i.test(n)) ?? Object.keys(zipArquivos).find((n) => /\.(md|txt)$/i.test(n));
      if (!nomeMd) throw new Error('Este arquivo não contém uma receita do Pratoria.');
      texto = strFromU8(zipArquivos[nomeMd]);
    } else {
      texto = new TextDecoder().decode(bytes);
      via = 'arquivo';
    }
  }

  const lido = await lerMd(texto);
  const imagens = [];
  if (!lido.formatoArquivo) {
    // formato antigo (.pratoria.txt com #IMAGEM) ou texto PRATORIA puro
    const antigo = await lerArquivoRecebido(texto);
    if (antigo.imagem) imagens.push({ nome: 'prato', blob: antigo.imagem, tipo: antigo.imagem.type, integra: null, estado: 'anexo' });
    return { textoReceita: antigo.texto, envelope: {}, imagens, prompts: {}, mapa: null, avisos: lido.avisos, via };
  }
  for (const item of lido.indice) {
    let bytes = null, tipo = null;
    if (item.estado === 'anexo' && lido.anexos.has(item.nome)) ({ bytes, tipo } = lido.anexos.get(item.nome));
    else if (item.estado === 'arquivo' && zipArquivos?.[item.caminho]) { bytes = zipArquivos[item.caminho]; tipo = /\.png$/i.test(item.caminho) ? 'image/png' : /\.jpe?g$/i.test(item.caminho) ? 'image/jpeg' : 'image/webp'; }
    let integra = null;
    if (bytes) {
      integra = (await sha256Hex(bytes)) === item.sha256;
      if (!integra) lido.avisos.push(`A imagem "${item.nome}" chegou danificada.`);
    }
    imagens.push({ nome: item.nome, blob: bytes ? new Blob([bytes], { type: tipo }) : null, tipo, integra, estado: bytes ? item.estado : item.estado === 'link' ? 'link' : 'ausente', largura: item.largura, altura: item.altura });
  }
  return { textoReceita: lido.textoReceita, envelope: lido.envelope, imagens, prompts: lido.prompts, mapa: lido.mapa, avisos: lido.avisos, via, receitaIntegra: lido.receitaIntegra };
}
