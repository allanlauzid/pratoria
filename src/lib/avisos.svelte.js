// Mensagens curtas (toast) anunciadas a leitores de tela.
export const avisos = $state({ lista: [] });
let n = 0;
export function avisar(texto, { acao = null, duracao = 2600 } = {}) {
  const id = ++n;
  avisos.lista.push({ id, texto, acao });
  if (duracao) setTimeout(() => fecharAviso(id), duracao);
  return id;
}
export function fecharAviso(id) { avisos.lista = avisos.lista.filter((a) => a.id !== id); }
