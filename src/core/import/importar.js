// Pratoria — prepara uma receita interpretada para entrar no caderno do usuário.
// Define id, id de origem (quando veio de outra pessoa) e datas locais.

import { gerarId, pareceId, isoLocal } from '../id.js';

/**
 * @param {object} receita  saída de interpretarReceita(...).receita
 * @param {{usuario: string, agora?: Date}} contexto  usuário atual (conta ou perfil local)
 * @returns {Promise<object>} receita com id, idOrigem, usuario, importadoEm
 */
export async function prepararParaCaderno(receita, { usuario, agora = new Date() }) {
  const r = structuredClone(receita);
  const eu = String(usuario ?? '').trim() || 'sem nome';
  const outraPessoa = r.usuario && r.usuario.trim().toLowerCase() !== eu.toLowerCase();
  const veioComId = pareceId(r.id);

  if (veioComId && outraPessoa) {
    // Receita recebida (WhatsApp, cópia, envio): guarda a origem e cria um id meu.
    r.idOrigem = r.id;
    r.recebidaDe = r.usuario;
    r.usuario = eu;
    r.id = await gerarId({ usuario: eu, titulo: r.titulo, momento: agora, url: r.fonte?.url });
  } else if (veioComId) {
    // Minha própria receita (backup ou recolagem): mantém o id.
    r.idOrigem = r.idOrigem ?? '';
  } else {
    // Importação nova vinda do LLM: usa o momento gravado no prompt.
    const momento = r.geradoEm && !Number.isNaN(new Date(r.geradoEm).getTime()) ? r.geradoEm : agora;
    r.usuario = r.usuario && r.usuario !== 'sem nome' ? r.usuario : eu;
    r.geradoEm = r.geradoEm || isoLocal(agora);
    r.id = await gerarId({ usuario: r.usuario, titulo: r.titulo, momento, url: r.fonte?.url });
    r.idOrigem = '';
  }
  r.importadoEm = isoLocal(agora);
  return r;
}
