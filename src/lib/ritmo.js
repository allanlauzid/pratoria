// Relógio que não "dorme": um Worker dedicado bate o ritmo (o navegador segura bem menos os
// timers de um Worker do que os da página quando o app está em segundo plano).
// Sem Worker (ou bloqueado): setInterval comum.
export function ritmo(ms, fn) {
  try {
    const url = URL.createObjectURL(new Blob([`setInterval(() => postMessage(0), ${ms | 0});`], { type: 'text/javascript' }));
    const w = new Worker(url);
    URL.revokeObjectURL(url);
    let parar = () => w.terminate();
    w.onmessage = () => fn();
    w.onerror = () => { w.terminate(); parar = ritmoSimples(ms, fn); };
    return () => parar();
  } catch {
    return ritmoSimples(ms, fn);
  }
}
function ritmoSimples(ms, fn) { const id = setInterval(fn, ms); return () => clearInterval(id); }
