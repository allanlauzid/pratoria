// Cronômetros dos passos (Modo Mão na Massa e página da receita).
// Estado SÓ no aparelho (config 'cronometros'): sobrevive a recarregar a página,
// porque guarda o horário de término, não a contagem.
// Aviso: com a tela bloqueada o navegador pode atrasar o alarme; ele toca ao voltar.

import { banco } from './caderno.svelte.js';
import { avisar } from './avisos.svelte.js';
import { rotuloDuracao } from '../core/tempos.js';

export const cron = $state({ lista: [], agora: Date.now(), folhaAberta: false });
export const abrirCronometro = () => { cron.folhaAberta = true; };
let relogio = null, audio = null, bipe = null;

const salvar = () => banco()?.salvarConfig('cronometros', $state.snapshot(cron.lista));

export async function iniciarCronometros() {
  const salvos = (await banco().obterConfig('cronometros')) ?? [];
  cron.lista = salvos.filter((c) => c.pausadoCom != null || c.fimEm > Date.now() - 6 * 3600e3);
  if (cron.lista.length) ligar();
}

function ligar() {
  if (relogio) return;
  relogio = setInterval(tique, 500);
  document.addEventListener('visibilitychange', tique);
}
function desligar() {
  clearInterval(relogio); relogio = null;
  document.removeEventListener('visibilitychange', tique);
}

function tique() {
  cron.agora = Date.now();
  let tocar = false;
  for (const c of cron.lista) {
    if (c.pausadoCom == null && !c.tocando && c.fimEm <= cron.agora) {
      c.tocando = true; tocar = true;
      avisar(`⏱ ${c.rotulo}: tempo esgotado`, { duracao: 8000 });
    }
  }
  if (tocar) salvar();
  if (cron.lista.some((c) => c.tocando)) alarme(); else pararAlarme();
  if (!cron.lista.length) desligar();
}

// ---- som e vibração (o 1º toque do usuário "destrava" o áudio) ----
function destravarAudio() {
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch { audio = null; }
}
function alarme() {
  if (bipe) return;
  const tocarBipe = () => {
    navigator.vibrate?.([300, 150, 300]);
    if (!audio) return;
    const t = audio.currentTime;
    for (const [k, f] of [[0, 880], [0.25, 880], [0.5, 1175]]) {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + k); g.gain.exponentialRampToValueAtTime(0.35, t + k + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + k + 0.2);
      o.connect(g).connect(audio.destination); o.start(t + k); o.stop(t + k + 0.22);
    }
  };
  tocarBipe();
  bipe = setInterval(tocarBipe, 2000);
}
function pararAlarme() { if (bipe) { clearInterval(bipe); bipe = null; navigator.vibrate?.(0); } }

// ---- ações ----
/**
 * @param {{min:number,max:number,rotulo?:string}} tempo  segundos
 * @param {{rotulo?:string, receitaId?:string, titulo?:string, chave?:string}} op  chave = de qual passo veio (um por chave)
 */
export function iniciarCronometro(tempo, { rotulo = '', receitaId = '', titulo = '', chave = '' } = {}) {
  destravarAudio();
  if (chave) cron.lista = cron.lista.filter((c) => c.chave !== chave);
  const novoId = Math.random().toString(36).slice(2, 9);
  const c = {
    id: novoId, chave: chave || novoId,
    rotulo: rotulo || rotuloDuracao(tempo.min),
    faixa: tempo.max > tempo.min ? `até ${rotuloDuracao(tempo.max)}` : '',
    receitaId, titulo, duracao: tempo.min,
    fimEm: Date.now() + tempo.min * 1000, pausadoCom: null, tocando: false,
  };
  cron.lista = [...cron.lista, c];
  salvar(); ligar(); tique();
  return c.id;
}
const achar = (id) => cron.lista.find((c) => c.id === id);
export function pausar(id) { const c = achar(id); if (!c || c.tocando) return; c.pausadoCom = Math.max(0, c.fimEm - Date.now()); salvar(); }
export function retomar(id) { destravarAudio(); const c = achar(id); if (!c) return; c.fimEm = Date.now() + (c.pausadoCom ?? 0); c.pausadoCom = null; salvar(); tique(); }
export function maisUmMinuto(id) {
  destravarAudio();
  const c = achar(id); if (!c) return;
  if (c.tocando) { c.tocando = false; c.fimEm = Date.now() + 60000; c.duracao = 60; c.extra = 0; }
  else { if (c.pausadoCom != null) c.pausadoCom += 60000; else c.fimEm += 60000; c.extra = (c.extra ?? 0) + 60000; }
  salvar(); tique();
}
export const porChave = (chave) => (chave ? cron.lista.find((c) => c.chave === chave) ?? null : null);
/** Volta ao tempo inicial, parado (pausado com a duração cheia). */
export function reiniciar(id) {
  const c = achar(id); if (!c) return;
  c.tocando = false; c.extra = 0; c.pausadoCom = c.duracao * 1000; salvar(); tique();
}
/** Fração já passada (0 → 1), para o anel. */
export const progresso = (c) => { const tot = c.duracao * 1000 + (c.extra ?? 0); return tot ? Math.min(1, Math.max(0, 1 - restante(c) * 1000 / tot)) : 0; };
export function parar(id) { cron.lista = cron.lista.filter((c) => c.id !== id); salvar(); tique(); }

/** Segundos restantes (negativo = passou do tempo). */
export const restante = (c) => Math.round(((c.pausadoCom != null ? c.pausadoCom : c.fimEm - cron.agora)) / 1000);
export function relogioTexto(seg) {
  const neg = seg < 0; seg = Math.abs(seg);
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60;
  const dois = (n) => String(n).padStart(2, '0');
  return (neg ? '+' : '') + (h ? `${h}:${dois(m)}:${dois(s)}` : `${dois(m)}:${dois(s)}`);
}
