// Cronômetros (Modo Cozinhar, página da receita e cronômetro livre).
// Estado SÓ no aparelho (config 'cronometros'): sobrevive a recarregar a página,
// porque guarda o horário de término, não a contagem.
//
// Avisos antes de acabar: ver core/alertas.js. No zero: alarme (som + vibração + tela pulsando)
// até dois toques em qualquer lugar da tela, ou "Parar".
// Fora do app: notificação com o horário de término e janelinha sobre outros apps (lib/pip.js).
// Limite do navegador: com o app "adormecido", o aviso final pode atrasar.

import { banco } from './caderno.svelte.js';
import { avisar } from './avisos.svelte.js';
import { rotuloDuracao } from '../core/tempos.js';
import { avisosDoCronometro, ordenarPorRestante } from '../core/alertas.js';
import { ritmo } from './ritmo.js';

export const cron = $state({ lista: [], agora: Date.now(), folhaAberta: false, novos: 0 });
export const abrirCronometro = () => { cron.folhaAberta = true; };
let relogio = null, audio = null, bipe = null;

const salvar = () => banco()?.salvarConfig('cronometros', $state.snapshot(cron.lista));

export async function iniciarCronometros() {
  const salvos = (await banco().obterConfig('cronometros')) ?? [];
  cron.lista = salvos.filter((c) => c.pausadoCom != null || c.fimEm > Date.now() - 6 * 3600e3);
  if (cron.lista.length) ligar();
  document.addEventListener('visibilitychange', aoMudarVisibilidade);
}

function ligar() {
  if (relogio) return;
  relogio = ritmo(250, tique);
}
function desligar() { relogio?.(); relogio = null; }

/** Segundos restantes (negativo = passou do tempo). */
export const restante = (c) => Math.round(((c.pausadoCom != null ? c.pausadoCom : c.fimEm - cron.agora)) / 1000);
/** Lista na ordem de exibição: o que acaba primeiro vem primeiro. */
export const ordenados = () => ordenarPorRestante(cron.lista, restante);
export const alarmeAtivo = () => cron.lista.some((c) => c.tocando && !c.silenciado);

function tique() {
  cron.agora = Date.now();
  let mudou = false;
  for (const c of cron.lista) {
    if (c.pausadoCom != null || c.tocando) continue;
    const r = (c.fimEm - cron.agora) / 1000;
    // avisos antes de acabar (cada um uma vez; se o tempo "voltar", pode avisar de novo)
    c.avisados ??= [];
    for (const a of avisosDoCronometro(c.duracao)) {
      if (r > a.seg + 1 && c.avisados.includes(a.seg)) { c.avisados = c.avisados.filter((x) => x !== a.seg); mudou = true; }
      else if (r <= a.seg && r > 0 && !c.avisados.includes(a.seg)) { c.avisados = [...c.avisados, a.seg]; mudou = true; aviso(a.toques); }
    }
    if (r <= 0) {
      c.tocando = true; c.silenciado = false; mudou = true;
      avisar(`⏱ ${c.rotulo}: tempo esgotado`, { duracao: 8000 });
      if (document.visibilityState === 'hidden') notificarFim(c);
    }
  }
  if (mudou) salvar();
  if (alarmeAtivo()) alarme(); else pararAlarme();
  if (!cron.lista.length) desligar();
}

// ---- som e vibração (o 1º toque do usuário "destrava" o áudio) ----
function destravarAudio() {
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch { audio = null; }
}
function tom(inicio, freq, dur = 0.2, volume = 0.35) {
  if (!audio) return;
  const t = audio.currentTime + inicio;
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = 'triangle'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(volume, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.02);
}
/** Aviso curto: 1 ou 2 toques + 1 ou 2 vibrações. */
function aviso(toques) {
  navigator.vibrate?.(toques === 1 ? [180] : [180, 140, 180]);
  tom(0, 988, 0.16, 0.28);
  if (toques > 1) tom(0.32, 988, 0.16, 0.28);
}
function alarme() {
  if (bipe) return;
  const tocarBipe = () => {
    navigator.vibrate?.([400, 150, 400, 150, 400]);
    [[0, 880], [0.25, 880], [0.5, 1175]].forEach(([k, f]) => tom(k, f));
  };
  tocarBipe();
  bipe = setInterval(tocarBipe, 2000);
}
function pararAlarme() { if (bipe) { clearInterval(bipe); bipe = null; navigator.vibrate?.(0); } }

/** Dois toques na tela durante o alarme: para o pulsar, o som e a vibração (o cronômetro fica "Pronto"). */
export function silenciarAlarme() {
  for (const c of cron.lista) if (c.tocando) c.silenciado = true;
  pararAlarme(); salvar(); fecharNotificacoes('cron-fim');
}

// ---- notificações (fora do app) ----
async function registro() { try { return await navigator.serviceWorker?.ready; } catch { return null; } }
async function pedirNotificacao() {
  try { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); } catch { /* sem suporte */ }
}
const podeNotificar = () => 'Notification' in window && Notification.permission === 'granted';
const hora = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
async function fecharNotificacoes(prefixo) {
  const reg = await registro(); if (!reg?.getNotifications) return;
  for (const n of await reg.getNotifications()) if (n.tag?.startsWith(prefixo)) n.close();
}
async function aoMudarVisibilidade() {
  tique();
  if (!podeNotificar()) return;
  const reg = await registro(); if (!reg) return;
  if (document.visibilityState === 'hidden') {
    for (const c of cron.lista) {
      if (c.tocando) continue;
      const corpo = c.pausadoCom != null ? `Pausado · faltam ${rotuloDuracao(c.pausadoCom / 1000)}` : `Pronto às ${hora(c.fimEm)}`;
      reg.showNotification(`⏱ ${c.rotulo}`, { tag: `cron-${c.id}`, body: corpo, silent: true, icon: 'icones/icone-192.png', badge: 'icones/favicon-32.png', data: { url: location.href } });
    }
  } else fecharNotificacoes('cron-');
}
async function notificarFim(c) {
  if (!podeNotificar()) return;
  const reg = await registro(); if (!reg) return;
  fecharNotificacoes(`cron-${c.id}`);
  reg.showNotification('⏱ Tempo esgotado', {
    tag: 'cron-fim', body: c.rotulo, renotify: true, requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500], icon: 'icones/icone-192.png', data: { url: location.href },
  });
}

// ---- ações ----
/**
 * @param {{min:number,max:number}} tempo  segundos
 * @param {{rotulo?:string, receitaId?:string, titulo?:string, chave?:string}} op  chave = de qual passo veio (um por chave)
 */
export function iniciarCronometro(tempo, { rotulo = '', receitaId = '', titulo = '', chave = '' } = {}) {
  destravarAudio();
  pedirNotificacao();
  if (chave) cron.lista = cron.lista.filter((c) => c.chave !== chave);
  const novoId = Math.random().toString(36).slice(2, 9);
  const c = {
    id: novoId, chave: chave || novoId,
    rotulo: rotulo.trim() || rotuloDuracao(tempo.min), semNome: !rotulo.trim(),
    faixa: tempo.max > tempo.min ? `até ${rotuloDuracao(tempo.max)}` : '',
    receitaId, titulo, duracao: tempo.min,
    fimEm: Date.now() + tempo.min * 1000, pausadoCom: null, tocando: false, silenciado: false, avisados: [],
  };
  cron.lista = [...cron.lista, c];
  cron.novos += 1;              // dispara a animação "chegou um cronômetro" no círculo grande
  salvar(); ligar(); tique();
  return c.id;
}
const achar = (id) => cron.lista.find((c) => c.id === id);
export function pausar(id) { const c = achar(id); if (!c || c.tocando) return; c.pausadoCom = Math.max(0, c.fimEm - Date.now()); salvar(); }
export function retomar(id) { destravarAudio(); const c = achar(id); if (!c) return; c.fimEm = Date.now() + (c.pausadoCom ?? 0); c.pausadoCom = null; salvar(); tique(); }
export function alternar(id) { const c = achar(id); if (!c || c.tocando) return; if (c.pausadoCom != null) retomar(id); else pausar(id); }
export const porChave = (chave) => (chave ? cron.lista.find((c) => c.chave === chave) ?? null : null);
/** Fração já passada (0 → 1), para o anel. */
export const progresso = (c) => { const tot = c.duracao * 1000; return tot ? Math.min(1, Math.max(0, 1 - restante(c) * 1000 / tot)) : 0; };
export function parar(id) { cron.lista = cron.lista.filter((c) => c.id !== id); salvar(); fecharNotificacoes(`cron-${id}`); tique(); }

export function relogioTexto(seg) {
  const neg = seg < 0; seg = Math.abs(seg);
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60;
  const dois = (n) => String(n).padStart(2, '0');
  return (neg ? '+' : '') + (h ? `${h}:${dois(m)}:${dois(s)}` : `${dois(m)}:${dois(s)}`);
}

/** Estado visual de um cronômetro: rodando | pausado | pronto. */
export const estadoDe = (c) => (c.tocando ? 'pronto' : c.pausadoCom != null ? 'pausado' : 'rodando');
