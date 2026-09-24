// Tratamento da imagem do prato NO APARELHO, sem IA:
//  • detecta se já tem transparência real;
//  • se não tiver, remove o fundo liso que toca as bordas (branco puro ou o
//    "xadrez" falso que algumas IAs desenham) por preenchimento a partir das bordas;
//  • recorta o excesso, deixa 6% de margem, limita a 1200 px e salva em WebP (ou PNG).

const LARGURA_MAX = 1200;

export function carregarCanvas(bmp) {
  const c = document.createElement('canvas');
  c.width = bmp.width; c.height = bmp.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  return { c, ctx };
}

/** Analisa a borda: transparência real? fundo claro liso? xadrez? */
export function analisarBorda(dados, w, h) {
  let transp = 0, total = 0; const cores = new Map();
  const ver = (x, y) => {
    const o = (y * w + x) * 4; total++;
    if (dados[o + 3] < 200) { transp++; return; }
    const chave = `${dados[o] >> 3},${dados[o + 1] >> 3},${dados[o + 2] >> 3}`;
    cores.set(chave, (cores.get(chave) ?? 0) + 1);
  };
  const passo = Math.max(1, Math.floor(Math.min(w, h) / 200));
  for (let x = 0; x < w; x += passo) { ver(x, 0); ver(x, h - 1); }
  for (let y = 0; y < h; y += passo) { ver(0, y); ver(w - 1, y); }
  const dominantes = [...cores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
    .map(([k, n]) => ({ rgb: k.split(',').map((v) => (+v << 3) + 4), fracao: n / total }));
  const opacas = total - transp;
  const lisa = dominantes.length && dominantes.slice(0, 2).reduce((s, d) => s + d.fracao, 0) > 0.8 * (opacas / total);
  const clara = dominantes[0] && dominantes[0].rgb.every((v) => v > 200);
  return { temTransparencia: transp / total > 0.6, fundoLiso: !!(lisa && clara), cores: dominantes.map((d) => d.rgb) };
}

/** Remove, a partir das bordas, os pixels parecidos com as cores de fundo. */
export function removerFundo(ctx, w, h, cores, tolerancia = 38) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const parecido = (o) => cores.some(([r, g, b]) => Math.abs(d[o] - r) + Math.abs(d[o + 1] - g) + Math.abs(d[o + 2] - b) <= tolerancia);
  const visto = new Uint8Array(w * h), fila = new Int32Array(w * h); let ini = 0, fim = 0;
  const marcar = (x, y) => { const i = y * w + x; if (!visto[i] && parecido(i * 4)) { visto[i] = 1; fila[fim++] = i; } };
  for (let x = 0; x < w; x++) { marcar(x, 0); marcar(x, h - 1); }
  for (let y = 0; y < h; y++) { marcar(0, y); marcar(w - 1, y); }
  while (ini < fim) {
    const i = fila[ini++], x = i % w, y = (i / w) | 0;
    d[i * 4 + 3] = 0;
    if (x > 0) marcar(x - 1, y); if (x < w - 1) marcar(x + 1, y); if (y > 0) marcar(x, y - 1); if (y < h - 1) marcar(x, y + 1);
  }
  // suaviza a borda do recorte (1 px): pixels opacos vizinhos de transparentes ficam semi
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; if (visto[i]) continue;
    if (visto[i - 1] || visto[i + 1] || visto[i - w] || visto[i + w]) d[i * 4 + 3] = Math.min(d[i * 4 + 3], 150);
  }
  ctx.putImageData(img, 0, 0);
}

function caixaOpaca(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 16) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * @param {Blob} arquivo imagem enviada pelo usuário
 * @param {{removerFundo?: boolean|'auto'}} op
 * @returns {Promise<{blob: Blob, info: {temTransparencia:boolean, fundoRemovido:boolean, fundoLiso:boolean, largura:number, altura:number}}>}
 */
export async function prepararImagem(arquivo, { removerFundo: remover = 'auto' } = {}) {
  const bmp = await createImageBitmap(arquivo);
  const { c, ctx } = carregarCanvas(bmp);
  const { width: w, height: h } = c;
  const analise = analisarBorda(ctx.getImageData(0, 0, w, h).data, w, h);
  let fundoRemovido = false;
  if (!analise.temTransparencia && (remover === true || (remover === 'auto' && analise.fundoLiso))) {
    removerFundo(ctx, w, h, analise.cores);
    fundoRemovido = true;
  }
  const cx = caixaOpaca(ctx, w, h) ?? { x: 0, y: 0, w, h };
  const margem = Math.round(Math.max(cx.w, cx.h) * 0.06);
  const escala = Math.min(1, LARGURA_MAX / (cx.w + 2 * margem));
  const out = document.createElement('canvas');
  out.width = Math.round((cx.w + 2 * margem) * escala); out.height = Math.round((cx.h + 2 * margem) * escala);
  const octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(c, cx.x, cx.y, cx.w, cx.h, margem * escala, margem * escala, cx.w * escala, cx.h * escala);
  const transparente = analise.temTransparencia || fundoRemovido;
  const blob = await comprimir(out, transparente);
  return { blob, info: { ...analise, fundoRemovido, largura: out.width, altura: out.height, bytesOriginal: arquivo.size, bytes: blob.size } };
}

/**
 * O menor arquivo que ainda fica bonito: WebP 0,8. Onde o navegador não gera WebP (Safari/iPhone):
 * JPEG 0,82 para foto sem transparência, PNG quando há transparência.
 */
async function comprimir(canvas, transparente) {
  const em = (tipo, q) => new Promise((ok) => canvas.toBlob(ok, tipo, q));
  const webp = await em('image/webp', 0.8);
  if (webp && webp.type === 'image/webp') return webp;
  return transparente ? em('image/png') : em('image/jpeg', 0.82);
}

/** Extensão de arquivo para baixar a imagem. */
export const extensaoDe = (blob) => ({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' })[blob?.type] ?? 'img';
