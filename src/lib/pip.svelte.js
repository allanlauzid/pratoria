// Janelinha do cronômetro sobre outros apps (Picture-in-Picture).
// PWA não consegue desenhar sobre outros apps; o truque é um <video> alimentado por um <canvas>
// (captureStream) e pôr esse vídeo em PiP. Funciona no Chrome/Android e no desktop; no iPhone,
// depende da versão do iOS. O navegador geralmente exige um toque do usuário: por isso existe
// o botão vermelho. Ao sair do app, tentamos abrir sozinho (quando o navegador deixa).

import { cron, ordenados, restante, relogioTexto, estadoDe, progresso } from './cronometros.svelte.js';
import { nivelDeAlerta } from '../core/alertas.js';
import { rotuloDuracao } from '../core/tempos.js';
import { ritmo } from './ritmo.js';

const COR = {
  papel: '#FAF5EC', tinta: '#2A241E', suave: '#6F604E', trilho: '#E4D7BF',
  rodando: '#D63A2A', pausado: '#E5A515', pronto: '#D63A2A', verde: '#6F9A3B', cinza: '#8A7E70',
  amarelo: '#E5A515', laranja: '#E2701F', vermelho: '#D63A2A',
};
const L = 360, A = 200;

export const pip = $state({ aberto: false });
export const pipSuportado = () => typeof document !== 'undefined' && (
  (document.pictureInPictureEnabled && 'requestPictureInPicture' in HTMLVideoElement.prototype) ||
  'webkitSetPresentationMode' in HTMLVideoElement.prototype);

let video = null, canvas = null, ctx = null, pararDesenho = null, preparado = false;

function preparar() {
  if (video) return;
  canvas = document.createElement('canvas'); canvas.width = L; canvas.height = A;
  ctx = canvas.getContext('2d');
  video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.setAttribute('playsinline', ''); video.setAttribute('aria-hidden', 'true');
  Object.assign(video.style, { position: 'fixed', width: '2px', height: '2px', opacity: '0', pointerEvents: 'none', bottom: '0', right: '0' });
  document.body.append(video);
  video.addEventListener('leavepictureinpicture', aoFechar);
  video.addEventListener('webkitpresentationmodechanged', () => { if (video.webkitPresentationMode !== 'picture-in-picture') aoFechar(); });
  desenhar();
  video.srcObject = canvas.captureStream?.(4) ?? null;
}

function desenhar() {
  if (!ctx) return;
  const lista = ordenados();
  const c = lista[0];
  const agoraSeg = Math.floor(Date.now() / 1000);
  ctx.fillStyle = COR.papel; ctx.fillRect(0, 0, L, A);
  if (!c) {
    ctx.fillStyle = COR.suave; ctx.font = '600 26px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Sem cronômetros', L / 2, A / 2 + 9); return;
  }
  const est = estadoDe(c), seg = restante(c);
  // fundo translúcido (verde contando, cinza pausado, vermelho acabou) + piscar de aviso
  const alerta = est === 'rodando' ? nivelDeAlerta(seg) : null;
  const tinta = est === 'rodando' ? COR.verde : est === 'pausado' ? COR.cinza : COR.vermelho;
  ctx.globalAlpha = est === 'pausado' ? 0.18 : est === 'pronto' ? (agoraSeg % 2 ? 0.3 : 0.12) : 0.12;
  ctx.fillStyle = tinta; ctx.fillRect(0, 0, L, A);
  if (alerta && agoraSeg % 2) { ctx.globalAlpha = 0.22; ctx.fillStyle = COR[alerta]; ctx.fillRect(0, 0, L, A); }
  ctx.globalAlpha = 1;
  // anel
  const cx = 92, cy = A / 2, r = 62;
  ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.strokeStyle = COR.trilho; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  const resta = c.tocando ? 1 : 1 - progresso(c);
  ctx.strokeStyle = COR[est]; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, resta)); ctx.stroke();
  if (est === 'pausado') { ctx.fillStyle = COR.verde; ctx.beginPath(); ctx.moveTo(cx - 14, cy - 20); ctx.lineTo(cx + 20, cy); ctx.lineTo(cx - 14, cy + 20); ctx.closePath(); ctx.fill(); }
  // tempo e nome
  ctx.textAlign = 'left'; ctx.fillStyle = COR.tinta;
  const texto = c.tocando ? 'Pronto!' : relogioTexto(seg);
  ctx.font = `700 ${texto.length > 5 ? 46 : 58}px Georgia, serif`;
  ctx.fillText(texto, 172, cy + 8);
  ctx.font = '600 22px system-ui, sans-serif'; ctx.fillStyle = COR.suave;
  let nome = c.semNome ? rotuloDuracao(c.duracao) : c.rotulo;
  while (nome.length > 3 && ctx.measureText(nome).width > L - 186) nome = nome.slice(0, -2);
  if (nome !== (c.semNome ? rotuloDuracao(c.duracao) : c.rotulo)) nome += '…';
  ctx.fillText(nome, 174, cy + 44);
  if (lista.length > 1) { ctx.font = '700 20px system-ui, sans-serif'; ctx.fillStyle = COR.tinta; ctx.fillText(`+${lista.length - 1}`, 174, cy - 42); }
}

function aoFechar() { pip.aberto = false; }
// Desenha enquanto houver cronômetro (o vídeo fica "tocando" mudo, pronto para virar janelinha).
function garantirDesenho() {
  pararDesenho ??= ritmo(500, () => {
    desenhar();
    if (!cron.lista.length) { fecharPip(); pararDesenho?.(); pararDesenho = null; video?.pause(); }
  });
}
/** Deixa o vídeo pronto assim que um cronômetro começa (para o PiP automático ao sair do app). */
export function aquecerPip() {
  if (!pipSuportado() || !cron.lista.length) return;
  preparar(); garantirDesenho(); video.play().catch(() => {});
}

/** Abre a janelinha (precisa vir de um toque, na maioria dos navegadores). */
export async function abrirPip() {
  if (!pipSuportado() || !cron.lista.length) return false;
  preparar();
  try {
    await video.play();
    if ('requestPictureInPicture' in video && document.pictureInPictureEnabled) {
      if (document.pictureInPictureElement !== video) await video.requestPictureInPicture();
    } else if (video.webkitSetPresentationMode) video.webkitSetPresentationMode('picture-in-picture');
    pip.aberto = true;
    garantirDesenho();
    return true;
  } catch { return false; }
}

export async function fecharPip() {
  try {
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else if (video?.webkitPresentationMode === 'picture-in-picture') video.webkitSetPresentationMode('inline');
  } catch { /* já fechado */ }
  aoFechar();
}

/** Ao sair do app com cronômetro contando, tenta abrir sozinho (Chrome permite em alguns casos). */
export function iniciarPipAutomatico() {
  if (preparado || !pipSuportado()) return;
  preparado = true;
  try { navigator.mediaSession?.setActionHandler?.('enterpictureinpicture', () => abrirPip()); } catch { /* ação não suportada */ }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && !pip.aberto && cron.lista.some((c) => estadoDe(c) !== 'pronto')) abrirPip();
  });
}
