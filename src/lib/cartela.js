// Recorte da cartela a giz no navegador (sem IA): remove fundo liso se preciso,
// acha cada desenho (core/cartela.js) e gera um WebP transparente por casa da grade.
import { carregarCanvas, analisarBorda, removerFundo } from './imagem.js';
import { encontrarIlhas, atribuirGrade } from '../core/cartela.js';

const paraBlob = (canvas) => new Promise((ok) => canvas.toBlob((b) => (b && b.type === 'image/webp' ? ok(b) : canvas.toBlob(ok, 'image/png')), 'image/webp', 0.86));

/**
 * @param {Blob} arquivo cartela enviada pelo usuário
 * @param {{colunas:number, linhas:number}} grade
 * @returns {Promise<{cartela: Blob, recortes: Array<Blob|null>, fundoRemovido: boolean}>}
 */
export async function recortarCartela(arquivo, { colunas, linhas }) {
  const bmp = await createImageBitmap(arquivo);
  const { c, ctx } = carregarCanvas(bmp);
  const w = c.width, h = c.height;
  const analise = analisarBorda(ctx.getImageData(0, 0, w, h).data, w, h);
  let fundoRemovido = false;
  if (!analise.temTransparencia) { removerFundo(ctx, w, h, analise.cores.length ? analise.cores : [[255, 255, 255]], 46); fundoRemovido = true; }
  const dados = ctx.getImageData(0, 0, w, h).data;
  const alfa = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) alfa[i] = dados[i * 4 + 3];
  const casas = atribuirGrade(encontrarIlhas(alfa, w, h), w, h, colunas, linhas);
  const recortes = [];
  for (const cx of casas) {
    if (!cx) { recortes.push(null); continue; }
    const m = Math.round(Math.max(cx.w, cx.h) * 0.06), lado = Math.min(512, Math.max(cx.w, cx.h) + 2 * m);
    const esc = lado / (Math.max(cx.w, cx.h) + 2 * m);
    const o = document.createElement('canvas'); o.width = o.height = Math.round(lado);
    const octx = o.getContext('2d');
    const dw = cx.w * esc, dh = cx.h * esc;
    octx.drawImage(c, cx.x, cx.y, cx.w, cx.h, (o.width - dw) / 2, (o.height - dh) / 2, dw, dh);
    recortes.push(await paraBlob(o));
  }
  return { cartela: await paraBlob(c), recortes, fundoRemovido };
}
