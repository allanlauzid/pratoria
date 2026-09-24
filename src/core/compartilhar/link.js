// Opção 1 — link com a receita dentro.
// https://site/#r1.<carga>   (o trecho após # nunca chega ao servidor; o app detecta ao abrir)
// Sem anotações pessoais e sem imagem (a imagem não cabe num link).

import { serializarReceita } from '../formato/serializar.js';
import { compactar, descompactar } from './compactar.js';

const PREFIXO = 'r1.';
export const LIMITE_AVISO_LINK = 8000; // acima disso alguns apps podem cortar

export async function linkDaReceita(receita, { siteUrl }) {
  return linkDoTexto(serializarReceita(receita, { incluirAnotacoes: false }), { siteUrl });
}

/** Link com qualquer texto do Pratoria dentro (ex.: o receita.md sem anexos). */
export async function linkDoTexto(texto, { siteUrl }) {
  if (!siteUrl) throw new Error('Informe o endereço do site (siteUrl).');
  const carga = await compactar(texto);
  const url = `${siteUrl.replace(/\/+$/, '')}/#${PREFIXO}${carga}`;
  return { url, tamanho: url.length, longo: url.length > LIMITE_AVISO_LINK };
}

/** Aceita a URL inteira, só o hash ou só a carga. Devolve o texto PRATORIA. */
export async function textoDoLink(entrada) {
  let s = String(entrada ?? '').trim();
  const i = s.indexOf('#'); if (i >= 0) s = s.slice(i + 1);
  try { s = decodeURIComponent(s); } catch { /* já decodificado */ }
  if (!s.startsWith(PREFIXO)) throw new Error('Este link não contém uma receita do Pratoria.');
  return descompactar(s.slice(PREFIXO.length));
}

export const ehLinkDeReceita = (s) => /#r1\.[zt][A-Za-z0-9_-]+/.test(String(s ?? ''));
