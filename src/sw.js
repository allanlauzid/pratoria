// Service worker do Pratoria.
// • Pré-cache de todo o app (HTML, JS, CSS, fontes, ícones, receita-piloto) → funciona offline.
// • Navegação cai sempre no index.html (app de página única).
// • Recebe o que o Android compartilha para o Pratoria (share_target, POST).
// • Tocar na notificação do cronômetro abre o app.
// • Nova versão só assume quando o usuário tocar em "Atualizar".

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';

const CACHE_RECEBIDO = 'pratoria-recebido';

// Precisa vir antes do roteamento do Workbox: trata o POST do menu Compartilhar.
self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);
  if (evento.request.method !== 'POST' || !url.pathname.endsWith('/receber-compartilhado')) return;
  evento.respondWith((async () => {
    const dados = await evento.request.formData();
    const cache = await caches.open(CACHE_RECEBIDO);
    const texto = [dados.get('titulo'), dados.get('texto'), dados.get('url')].filter(Boolean).join('\n');
    await cache.put('texto', new Response(texto));
    const arquivo = dados.get('arquivo');
    if (arquivo && typeof arquivo !== 'string') await cache.put('arquivo', new Response(arquivo, { headers: { 'content-type': arquivo.type || 'text/plain', 'x-nome': encodeURIComponent(arquivo.name || '') } }));
    else await cache.delete('arquivo');
    return Response.redirect(`${self.registration.scope}#/receber?origem=compartilhado`, 303);
  })());
});

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

self.addEventListener('message', (e) => { if (e.data?.type === 'SKIP_WAITING') self.skipWaiting(); });

// Tocar numa notificação de cronômetro: volta para o app (ou abre, se estiver fechado).
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const alvo = evento.notification.data?.url || self.registration.scope;
  evento.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const aberta = janelas.find((j) => j.url.startsWith(self.registration.scope));
    if (aberta) { await aberta.focus(); return; }
    await self.clients.openWindow(alvo);
  })());
});
