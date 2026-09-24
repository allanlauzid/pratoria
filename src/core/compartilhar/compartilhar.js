// Pratoria — compartilhar e copiar receitas SEM depender de servidor.
//
// • Compartilhar (WhatsApp e outros): Web Share API com a imagem + o texto no formato
//   PRATORIA v1. Quem recebe cola o texto no Pratoria ("Colar receita") ou, no Android
//   com o app instalado, compartilha direto do WhatsApp para o Pratoria.
// • Copiar: botão ao lado da marca; copia a mensagem formatada para WhatsApp (ver whatsapp.js).
// Anotações pessoais NÃO vão no texto compartilhado.

import { serializarReceita } from '../formato/serializar.js';

/** Texto enviado: 2 linhas legíveis para humanos + bloco que o Pratoria interpreta. */
export function textoParaCompartilhar(receita, { siteUrl = '' } = {}) {
  const convite = `Para ver organizada, abra o Pratoria e toque em "Colar receita"${siteUrl ? ` (${siteUrl})` : ''}.`;
  return `Receita: ${receita.titulo}\n${convite}\n\n${serializarReceita(receita, { incluirAnotacoes: false })}`;
}

export function textoParaCopiar(receita) {
  return serializarReceita(receita, { incluirAnotacoes: false });
}

/**
 * WhatsApp mostra PNG transparente com fundo preto. Antes de compartilhar,
 * aplica o fundo de papel do Pratoria e gera JPEG. (Só navegador.)
 */
export async function imagemParaCompartilhar(blob, { fundo = '#F3EBDD', larguraMax = 1280 } = {}) {
  const bmp = await createImageBitmap(blob);
  const escala = Math.min(1, larguraMax / bmp.width);
  const w = Math.round(bmp.width * escala), h = Math.round(bmp.height * escala);
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = fundo; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  return canvas.convertToBlob ? canvas.convertToBlob({ type: 'image/jpeg', quality: 0.86 })
    : new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.86));
}

/**
 * @returns {Promise<'nativo-com-imagem'|'nativo-texto'|'whatsapp-web'|'cancelado'>}
 * Obs.: iOS pode entregar só a imagem para alguns apps; testar em aparelho real.
 */
export async function compartilharReceita(receita, { imagem = null, siteUrl = '' } = {}) {
  const texto = textoParaCompartilhar(receita, { siteUrl });
  const titulo = `${receita.titulo} — Pratoria`;
  try {
    if (imagem && navigator.canShare) {
      const jpg = await imagemParaCompartilhar(imagem);
      const files = [new File([jpg], `${receita.slug || 'receita'}.jpg`, { type: 'image/jpeg' })];
      if (navigator.canShare({ files, text: texto })) { await navigator.share({ files, text: texto, title: titulo }); return 'nativo-com-imagem'; }
    }
    if (navigator.share) { await navigator.share({ text: texto, title: titulo }); return 'nativo-texto'; }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelado';
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  return 'whatsapp-web';
}

export async function copiarTexto(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch { /* segue para o plano B */ }
  const ta = Object.assign(document.createElement('textarea'), { value: texto });
  ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
  document.body.append(ta); ta.select();
  const ok = document.execCommand('copy'); ta.remove();
  return ok;
}

export const copiarReceita = (receita) => copiarTexto(textoParaCopiar(receita));
