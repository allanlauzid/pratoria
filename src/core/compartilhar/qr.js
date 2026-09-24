// Opção 4 — QR code na tela (cara a cara, 100% offline).
//
// • Receita curta: 1 QR com o próprio link da opção 1 → abre até pela câmera comum.
// • Receita longa: vários QRs que se alternam na tela (a cada ~0,7 s, em loop).
//   Cada um: "PRT1/<parte>/<total>/<grupo>/<pedaço>". Quem lê pode captar em
//   qualquer ordem; o Pratoria junta as partes e confere o checksum do deflate.
// Sem imagem (não cabe em QR).

import { encode, renderSVG } from 'uqr';
import { linkDaReceita, linkDoTexto, textoDoLink } from './link.js';
import { descompactar } from './compactar.js';

export const LIMITE_QR_UNICO = 900;  // caracteres: acima disso o QR fica denso demais para ler da tela
export const TAMANHO_PEDACO = 600;   // caracteres por QR (versão ~20, correção L)
export const INTERVALO_MS = 700;

function fnv1a(txt) {
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** @returns {Promise<{tipo:'link'|'partes', conteudos:string[]}>} textos a transformar em QR */
export async function qrsDaReceita(receita, { siteUrl, texto = null }) {
  const { url } = texto ? await linkDoTexto(texto, { siteUrl }) : await linkDaReceita(receita, { siteUrl });
  if (url.length <= LIMITE_QR_UNICO) return { tipo: 'link', conteudos: [url] };
  const carga = url.slice(url.indexOf('#r1.') + 4);
  const grupo = fnv1a(carga);
  const pedacos = carga.match(new RegExp(`.{1,${TAMANHO_PEDACO}}`, 'g'));
  return { tipo: 'partes', conteudos: pedacos.map((p, i) => `PRT1/${i + 1}/${pedacos.length}/${grupo}/${p}`) };
}

/** SVG do QR (escala livre; usar em <img> ou inline). Borda de 4 módulos é o padrão para leitura. */
export function svgDoQR(conteudo, { cor = '#2A241E', fundo = '#FFFFFF' } = {}) {
  return renderSVG(conteudo, { ecc: 'L', border: 4, blackColor: cor, whiteColor: fundo });
}

/** Matriz do QR (para testes ou canvas). */
export const matrizDoQR = (conteudo) => encode(conteudo, { ecc: 'L', border: 4 });

/** Junta as leituras da câmera até ter a receita completa. */
export class ColetorQR {
  constructor() { this.limpar(); }
  limpar() { this.grupo = null; this.total = 0; this.partes = new Map(); }

  /**
   * @param {string} lido texto de um QR
   * @returns {Promise<{estado:'ignorado'} | {estado:'parcial', recebidos:number, total:number, faltam:number[]} | {estado:'completo', texto:string}>}
   */
  async adicionar(lido) {
    const s = String(lido ?? '').trim();
    if (/#r1\./.test(s)) return { estado: 'completo', texto: await textoDoLink(s) };
    const m = s.match(/^PRT1\/(\d+)\/(\d+)\/([0-9a-f]{8})\/([A-Za-z0-9_-]+)$/);
    if (!m) return { estado: 'ignorado' };
    const [, i, n, grupo, pedaco] = m;
    if (grupo !== this.grupo) { this.limpar(); this.grupo = grupo; this.total = +n; }
    this.partes.set(+i, pedaco);
    if (this.partes.size < this.total) {
      const faltam = []; for (let k = 1; k <= this.total; k++) if (!this.partes.has(k)) faltam.push(k);
      return { estado: 'parcial', recebidos: this.partes.size, total: this.total, faltam };
    }
    const carga = [...this.partes.entries()].sort((a, b) => a[0] - b[0]).map(([, p]) => p).join('');
    if (fnv1a(carga) !== this.grupo) { this.limpar(); throw new Error('As partes lidas não conferem. Tente de novo.'); }
    const texto = await descompactar(carga);
    this.limpar();
    return { estado: 'completo', texto };
  }
}

/**
 * Lê QRs da câmera continuamente (só navegador).
 * Usa o BarcodeDetector nativo (Chrome Android) e, se não houver, jsQR (iPhone),
 * carregado só nesta tela e guardado no cache offline.
 * @returns {Promise<() => void>} função para parar
 */
export async function lerQRsDaCamera(video, aoLer) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  video.srcObject = stream; video.setAttribute('playsinline', ''); await video.play();

  let detectar;
  if ('BarcodeDetector' in globalThis && (await BarcodeDetector.getSupportedFormats()).includes('qr_code')) {
    const det = new BarcodeDetector({ formats: ['qr_code'] });
    detectar = async () => (await det.detect(video)).map((c) => c.rawValue);
  } else {
    const { default: jsQR } = await import('jsqr');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    detectar = async () => {
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      if (!canvas.width) return [];
      ctx.drawImage(video, 0, 0);
      const r = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });
      return r ? [r.data] : [];
    };
  }

  let ativo = true, ultimo = '';
  (async function ciclo() {
    while (ativo) {
      try { for (const t of await detectar()) if (t !== ultimo) { ultimo = t; aoLer(t); } } catch { /* quadro ruim: segue */ }
      await new Promise((ok) => setTimeout(ok, 120));
    }
  })();
  return () => { ativo = false; stream.getTracks().forEach((t) => t.stop()); video.srcObject = null; };
}
