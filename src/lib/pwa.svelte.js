// Service worker: offline, aviso de nova versão e instalação.
import { Workbox } from 'workbox-window';

export const pwa = $state({ novaVersao: false, podeInstalar: false, instalado: false, ios: false });
let wb = null;
let eventoInstalar = null;
/** Quando true (ex.: Modo Cozinhar aberto), a atualização espera. */
export const trava = { cozinhando: false };

export function iniciarPwa() {
  pwa.instalado = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  pwa.ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !('onbeforeinstallprompt' in window);
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); eventoInstalar = e; pwa.podeInstalar = true; });
  addEventListener('appinstalled', () => { pwa.instalado = true; pwa.podeInstalar = false; });

  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  wb = new Workbox(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
  wb.addEventListener('waiting', () => { pwa.novaVersao = true; });
  wb.addEventListener('controlling', () => location.reload());
  wb.register();
  // procura atualização ao voltar para o app
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wb.update(); });
}

export function atualizarAgora() { wb?.messageSkipWaiting(); }

export async function instalar() {
  if (!eventoInstalar) return false;
  eventoInstalar.prompt();
  const { outcome } = await eventoInstalar.userChoice;
  eventoInstalar = null; pwa.podeInstalar = false;
  return outcome === 'accepted';
}
