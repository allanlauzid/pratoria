// Porta de entrada única: tudo o que chega (link, arquivo, QR, texto colado,
// compartilhamento do Android) passa por aqui e vira { texto, imagem, via }.
// Depois: interpretarReceita(texto) → prévia → prepararParaCaderno → salvar.

import { ehLinkDeReceita, textoDoLink } from './link.js';
import { lerArquivoRecebido } from './arquivo.js';

/** @param {string|File|Blob} entrada */
export async function receber(entrada) {
  if (typeof entrada !== 'string') {
    const { texto, imagem } = await lerArquivoRecebido(entrada);
    if (ehLinkDeReceita(texto)) return { texto: await textoDoLink(texto.match(/\S*#r1\.\S+/)[0]), imagem, via: 'arquivo-link' };
    return { texto, imagem, via: 'arquivo' };
  }
  const s = entrada.trim();
  if (ehLinkDeReceita(s)) return { texto: await textoDoLink(s.match(/\S*#r1\.\S+/)[0]), imagem: null, via: 'link' };
  const { texto, imagem } = await lerArquivoRecebido(s);
  return { texto, imagem, via: 'texto' };
}
