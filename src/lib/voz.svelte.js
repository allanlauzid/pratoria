// Leitura em voz alta com a voz do próprio aparelho (Web Speech API).
// Funciona sem internet quando o sistema tem a voz em português instalada
// (iPhone: Luciana/Felipe; Android: voz do Google baixada; Windows: Maria/Daniel).
// Preferência de velocidade: SÓ no aparelho (config 'voz'), porque as vozes variam de aparelho para aparelho.

import { banco } from './caderno.svelte.js';

export const voz = $state({
  suportado: typeof window !== 'undefined' && 'speechSynthesis' in window,
  falando: false, pausado: false,
  titulo: '',            // o que está sendo lido (para o controle flutuante)
  origem: '',            // 'livro' | 'receita'
  taxa: 1,
  nomeVoz: '',
});
let fila = [], aoFim = null, sessao = 0;

function escolherVoz() {
  const vozes = speechSynthesis.getVoices().filter((v) => /^pt(-|_)?BR/i.test(v.lang) || /^pt$/i.test(v.lang));
  const todas = vozes.length ? vozes : speechSynthesis.getVoices().filter((v) => /^pt/i.test(v.lang));
  const nota = (v) => (/natural|neural|premium|enhanced|aprimorad/i.test(v.name) ? 4 : 0) + (/luciana|francisca|google/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
  return todas.sort((a, b) => nota(b) - nota(a))[0] ?? null;
}

export async function iniciarVoz() {
  if (!voz.suportado) return;
  const cfg = (await banco().obterConfig('voz')) ?? {};
  voz.taxa = cfg.taxa ?? 1;
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener?.('voiceschanged', () => { voz.nomeVoz = escolherVoz()?.name ?? ''; });
  voz.nomeVoz = escolherVoz()?.name ?? '';
}

export async function mudarTaxa(t) {
  voz.taxa = t;
  await banco().salvarConfig('voz', { taxa: t });
}

/**
 * Lê uma lista de frases. `aoTerminar` só é chamado se a leitura chegar ao fim (não se for parada).
 * @param {string[]} frases
 */
export function falar(frases, { titulo = '', origem = '', aoTerminar = null } = {}) {
  if (!voz.suportado) return false;
  parar(false);
  const minha = ++sessao;
  fila = frases.filter(Boolean);
  aoFim = aoTerminar;
  Object.assign(voz, { falando: true, pausado: false, titulo, origem });
  const v = escolherVoz();
  const proxima = () => {
    if (minha !== sessao) return;
    const t = fila.shift();
    if (!t) { voz.falando = false; const f = aoFim; aoFim = null; f?.(); return; }
    const u = new SpeechSynthesisUtterance(t);
    u.lang = v?.lang ?? 'pt-BR'; if (v) u.voice = v;
    u.rate = voz.taxa;
    u.onend = proxima;
    u.onerror = (e) => { if (e.error !== 'interrupted' && e.error !== 'canceled') proxima(); };
    speechSynthesis.speak(u);
  };
  proxima();
  return true;
}

export function pausar() { if (voz.falando && !voz.pausado) { speechSynthesis.pause(); voz.pausado = true; } }
export function retomar() { if (voz.pausado) { speechSynthesis.resume(); voz.pausado = false; } }
export function parar(limpar = true) {
  sessao++; fila = []; aoFim = null;
  if (voz.suportado) speechSynthesis.cancel();
  voz.falando = false; voz.pausado = false;
  if (limpar) { voz.titulo = ''; voz.origem = ''; }
}
