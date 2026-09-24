// Pratoria — texto da receita formatado para o WhatsApp (botão "copiar" ao lado da marca).
//
// Não é o formato PRATORIA v1: é uma mensagem para PESSOAS lerem no WhatsApp,
// com negrito (*), itálico (_), citação (>), listas e emojis moderados.
// Regras:
//  • nunca inclui o link original da receita (só o nome do site/autor, como crédito discreto);
//  • termina com um convite (CTA) para conhecer o Pratoria + o link do site do Pratoria;
//  • anotações pessoais não entram.

import { ingredienteExibido, fatorPorcoes } from '../formato/escala.js';
import { formatarMinutos, tempoAtivo } from '../../lib/formatar.js';

const SEP = '┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈';

/** Remove marcadores que quebrariam a formatação do WhatsApp dentro do conteúdo. */
export function limparParaWhatsApp(s) {
  return String(s ?? '')
    .replace(/[*~`]/g, '')
    .replace(/_/g, ' ')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

const negrito = (s) => (s ? `*${s}*` : '');
const italico = (s) => (s ? `_${s}_` : '');

/**
 * @param {object} receita objeto do parser PRATORIA v1
 * @param {{porcoes?: number, unidades?: 'original'|'metrico', siteUrl?: string}} op
 * @returns {string}
 */
export function textoWhatsApp(receita, { porcoes, unidades = 'original', siteUrl = '' } = {}) {
  const r = receita;
  const base = r?.rendimento?.porcoes || null;
  const qtd = porcoes || base;
  const fator = fatorPorcoes(r, qtd);
  const L = [];

  // Cabeçalho
  L.push(`🍽️ ${negrito(limparParaWhatsApp(r.titulo).toUpperCase())}`);
  if (r.descricao) L.push(italico(limparParaWhatsApp(r.descricao)));
  L.push('');

  // Ficha rápida
  if (qtd) L.push(`👥 ${negrito('Serve:')} ${qtd} ${qtd === 1 ? 'porção' : 'porções'}`);
  else if (r.rendimento?.texto) L.push(`👥 ${negrito('Rende:')} ${limparParaWhatsApp(r.rendimento.texto)}`);
  const ativo = formatarMinutos(tempoAtivo(r));
  if (ativo) L.push(`⏱️ ${negrito('Tempo:')} ${ativo}`);
  if (r.tempos?.espera?.min >= 30) L.push(`⏳ ${negrito('Espera:')} ${formatarMinutos(r.tempos.espera)} ${italico('(comece com antecedência)')}`);
  if (r.dificuldade) L.push(`📊 ${negrito('Dificuldade:')} ${limparParaWhatsApp(r.dificuldade)}`);
  if (r.temperaturaForno) L.push(`🔥 ${negrito('Forno:')} ${limparParaWhatsApp(r.temperaturaForno)}`);
  if (r.dieta?.length) L.push(`🌿 ${r.dieta.map(limparParaWhatsApp).join(' · ')}`);
  if (r.alergenos?.length) L.push(`⚠️ ${negrito('Contém:')} ${r.alergenos.map(limparParaWhatsApp).join(', ')}`);

  const preps = (r.preparacoes ?? []).filter((p) => p.ingredientes?.length || p.passos?.length);
  const variasPreps = preps.length > 1;

  // Ingredientes
  L.push('', SEP, '', `🧺 ${negrito('INGREDIENTES')}`);
  if (fator !== 1) L.push(italico(`Quantidades ajustadas para ${qtd} ${qtd === 1 ? 'porção' : 'porções'}`));
  for (const p of preps) {
    if (!p.ingredientes?.length) continue;
    L.push('');
    if (variasPreps && p.nome) L.push(negrito(limparParaWhatsApp(p.nome)));
    for (const i of p.ingredientes) L.push(`• ${limparParaWhatsApp(ingredienteExibido(i, { fator, unidades }))}`);
  }

  // Preparo
  L.push('', SEP, '', `👩‍🍳 ${negrito('MODO DE PREPARO')}`);
  if (fator !== 1 && base) L.push(italico(`Quantidades citadas nos passos são da receita original (${base} ${base === 1 ? 'porção' : 'porções'})`));
  for (const p of preps) {
    if (!p.passos?.length) continue;
    L.push('');
    if (variasPreps && p.nome) L.push(negrito(limparParaWhatsApp(p.nome)));
    p.passos.forEach((s, n) => L.push(`${negrito(`${n + 1}.`)} ${limparParaWhatsApp(s)}`));
    for (const d of p.dicas ?? []) L.push('', `> 💡 ${italico(limparParaWhatsApp(d))}`);
  }

  // Servir (curto)
  if (r.servir?.length) {
    L.push('', `🥄 ${negrito('Para servir')}`);
    for (const s of r.servir.slice(0, 3)) L.push(`• ${italico(limparParaWhatsApp(s))}`);
  }

  // Crédito discreto, sem link
  const f = r.fonte ?? {};
  const partes = [f.site, f.autor].map(limparParaWhatsApp).filter(Boolean);
  if (partes.length) L.push('', italico(`Receita adaptada de ${partes.join(' · ')}`));

  // Convite para o Pratoria
  L.push(
    '', SEP, '',
    `📖 ${negrito('Gostou? Guarde esta e todas as suas receitas no Pratoria!')}`,
    '',
    `O Pratoria é um ${italico('caderno de receitas')} no seu celular: cole o link de qualquer receita e ela vira uma página organizada, bonita e fácil de seguir.`,
    '',
    '✅ Todas as suas receitas num só lugar',
    '✅ Funciona sem internet, direto na cozinha',
    '✅ Modo passo a passo com a tela sempre acesa',
    '✅ Ajusta porções e monta a lista de compras',
    '✅ Grátis e sem cadastro',
  );
  if (siteUrl) L.push('', `👉 ${negrito('Baixe grátis:')} ${siteUrl}`);

  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
