// Monta o .pratoria de uma receita do caderno (fotos, cartela, prompts, envelope).
import { criarPratoria } from '../core/pacote/pratoria.js';
import { montarPromptReceita, montarPromptImagem, montarPromptIlustracoes } from '../core/import/prompts.js';
import { isoLocal } from '../core/id.js';
import { app, imagemBlob, cartelaBlob } from './caderno.svelte.js';

async function dimensoes(blob) {
  try { const b = await createImageBitmap(blob); return { largura: b.width, altura: b.height }; } catch { return {}; }
}

/**
 * @param {object} registro {id, dados}
 * @param {{pacote:'texto'|'imagens', base64?:boolean, prompts?:boolean}} op
 */
export async function pacoteDaReceita(registro, { pacote = 'imagens', base64 = false, prompts = true } = {}) {
  const r = registro.dados;
  const imagens = [];
  const prato = await imagemBlob(registro.id);
  if (prato) imagens.push({ nome: 'prato', blob: prato, ...(await dimensoes(prato)) });
  const cartela = await cartelaBlob(registro.id);
  if (cartela) imagens.push({ nome: 'ilustracoes', blob: cartela, ...(await dimensoes(cartela)) });
  const p = {};
  if (prompts) {
    p.texto = r.fonte?.url
      ? montarPromptReceita(r.fonte.url, { usuario: app.perfil.nome, ajustes: JSON.parse(JSON.stringify(app.prefs.ajustes)) })
      : '[sem link original: não há prompt de extração]';
    p.imagem = montarPromptImagem(r);
    p.ilustracoes = r.ilustracoes?.length ? montarPromptIlustracoes(r) : '[receita sem ilustrações definidas]';
  }
  const historico = (r.historicoCompartilhamento ?? []).slice(-8);
  return criarPratoria({
    receita: JSON.parse(JSON.stringify(r)), compartilhadoPor: app.perfil.nome || 'sem nome', exportadoEm: isoLocal(new Date()),
    historico, pacote, base64, imagens, prompts: p, app: 'Pratoria',
  });
}
