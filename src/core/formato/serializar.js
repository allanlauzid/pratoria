// Pratoria — objeto receita → texto PRATORIA v1.
// Usado para copiar, compartilhar (WhatsApp), exportar e editar.

import { SEM_LINK } from './parser.js';

const q = (x) => x?.texto ?? '';

/**
 * @param {object} r receita
 * @param {{incluirAnotacoes?: boolean, incluirRastreio?: boolean}} [op]
 *   incluirAnotacoes: notas pessoais do usuário (padrão: não, ao compartilhar)
 *   incluirRastreio: id/usuario/gerado_em/gerado_por/prompt_versao (padrão: sim)
 *   compacto: omite campos vazios do cabeçalho (link, QR, arquivo)
 */
export function serializarReceita(r, op = {}) {
  const { incluirAnotacoes = true, incluirRastreio = true, compacto = false } = op;
  const L = ['#PRATORIA v1'];
  const campo = (k, v) => { if (!compacto || String(v ?? '').trim()) L.push(`${k}: ${v ?? ''}`.trimEnd()); };
  if (incluirRastreio) {
    campo('id', r.id); campo('usuario', r.usuario); campo('gerado_em', r.geradoEm);
    campo('gerado_por', r.geradoPor); campo('prompt_versao', r.promptVersao);
  }
  if (r.ajustes?.length) campo('ajustes', r.ajustes.join(', '));
  campo('titulo', r.titulo); campo('titulo_original', r.tituloOriginal); campo('descricao', r.descricao);
  campo('categoria', r.categoria); campo('cozinha', r.cozinha);
  campo('refeicao', (r.refeicao ?? []).join(', ')); campo('tags', (r.tags ?? []).join(', '));
  campo('rendimento', r.rendimento?.texto); campo('porcoes', r.rendimento?.porcoes ?? '');
  campo('tempo_preparo_min', q(r.tempos?.preparo)); campo('tempo_cozimento_min', q(r.tempos?.cozimento));
  campo('tempo_espera_min', q(r.tempos?.espera)); campo('tempo_total_min', q(r.tempos?.total));
  campo('dificuldade', r.dificuldade); campo('custo', r.custo);
  campo('equipamentos', (r.equipamentos ?? []).join(', ')); campo('temperatura_forno', r.temperaturaForno);
  campo('dieta', (r.dieta ?? []).join(', ')); campo('alergenos', (r.alergenos ?? []).join(', '));
  campo('fonte_site', r.fonte?.site); campo('fonte_autor', r.fonte?.autor); campo('fonte_url', r.fonte?.url || SEM_LINK);
  campo('fonte_publicado_em', r.fonte?.publicadoEm); campo('fonte_video', r.fonte?.video);
  campo('idioma_original', r.idiomaOriginal); campo('visual', r.visual); campo('foto_original', r.fotoOriginal); campo('ingrediente_principal', r.ingredientePrincipal);

  const lista = (titulo, itens, fmt = (x) => `- ${x}`) => { if (itens?.length) L.push('', `## ${titulo}`, ...itens.map(fmt)); };

  lista('COMPRAS', r.compras, (c) => `- ${c.item} | ${c.quantidade ?? ''} | ${c.secao ?? ''}`.replace(/[\s|]+$/, ''));
  if (r.nota) L.push('', '## NOTA', r.nota);
  lista('NUTRICAO', r.nutricao, (n) => `- ${n.nome} | ${n.valor}`);
  for (const p of r.preparacoes ?? []) {
    L.push('', `## PREPARACAO: ${p.nome}`);
    if (p.nota) L.push('### NOTA', p.nota);
    L.push('### INGREDIENTES');
    for (const i of p.ingredientes) L.push(`- ${q(i.quantidade)} | ${i.unidade ?? ''} | ${i.item ?? ''} | ${i.obs ?? ''}`.trimEnd());
    L.push('### PASSOS', ...p.passos.map((s, n) => `${n + 1}. ${s}`));
    if (p.dicas?.length) L.push('### DICAS', ...p.dicas.map((d) => `- ${d}`));
  }
  lista('SUBSTITUICOES', r.substituicoes, (s) => `- ${s.original} | ${s.substituto} | ${s.obs ?? ''} | ${s.para ?? ''} | ${s.fonte ?? ''}`.replace(/[\s|]+$/, ''));
  lista('ILUSTRACOES', r.ilustracoes, (i) => `- ${i.ordem} | ${i.ingrediente} | ${i.desenho ?? ''} | ${i.onde ? `${i.onde.preparacao}:${i.onde.passo}` : ''}`.replace(/[\s|]+$/, ''));
  lista('VARIACOES', r.variacoes);
  lista('SERVIR', r.servir);
  lista('CONSERVACAO', r.conservacao);
  if (incluirAnotacoes) lista('ANOTACOES', r.anotacoes);
  L.push('', '#FIM');
  return L.join('\n');
}
