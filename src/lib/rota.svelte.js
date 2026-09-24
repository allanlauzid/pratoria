// Roteador por hash (funciona no GitHub Pages sem configurar servidor).
//   #/                       caderno
//   #/receita/<id>           receita
//   #/receita/<id>/cozinhar  Modo Mão na Massa
//   #/importar               importar de um link
//   #/receber                receber (colar, arquivo, QR)
//   #/ajustes                ajustes ("Mais")
//   #/compras                lista de compras geral (?aba=cardapio → cardápio da semana)
//   #/editar/<id>            editar receita (original fica guardado)
//   #/escrever               escrever receita nova à mão
//   #r1.<carga>              link com receita dentro → abre "receber"

export const rota = $state({ nome: 'caderno', params: {}, query: {}, cargaRecebida: '' });

function ler() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith('r1.')) {
    rota.cargaRecebida = location.href;
    history.replaceState(null, '', '#/receber');
    Object.assign(rota, { nome: 'receber', params: {}, query: { origem: 'link' } });
    return;
  }
  const [caminho, qs = ''] = h.split('?');
  const p = caminho.replace(/^\/+/, '').split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(qs));
  let nome = 'caderno', params = {};
  if (p[0] === 'receita' && p[1]) { nome = p[2] === 'cozinhar' ? 'cozinhar' : 'receita'; params = { id: p[1] }; }
  else if (p[0] === 'editar' && p[1]) { nome = 'editar'; params = { id: p[1] }; }
  else if (['importar', 'receber', 'ajustes', 'compras', 'escrever'].includes(p[0])) nome = p[0];
  Object.assign(rota, { nome, params, query });
}

export function iniciarRota() {
  ler();
  addEventListener('hashchange', ler);
}

export function ir(caminho, { substituir = false } = {}) {
  const alvo = '#' + caminho;
  if (substituir) { history.replaceState(null, '', alvo); ler(); }
  else location.hash = caminho;
}

export function voltar(padrao = '/') {
  let navegou = false; try { navegou = !!sessionStorage.getItem('pratoria:navegou'); } catch {}
  if (navegou && history.length > 1) history.back();
  else ir(padrao, { substituir: true });
}
addEventListener('hashchange', () => { try { sessionStorage.setItem('pratoria:navegou', '1'); } catch {} });
