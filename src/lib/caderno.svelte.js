// Estado do app sobre o caderno local (IndexedDB). Tudo funciona sem login.

import { Caderno, pedirArmazenamentoPersistente } from '../core/dados/local.js';
import { interpretarReceita } from '../core/formato/parser.js';
import { prepararParaCaderno } from '../core/import/importar.js';
import { gerarId } from '../core/id.js';
import { AJUSTES_PADRAO, EXIBICAO_PADRAO } from '../core/import/ajustes.js';
import { criarBackupCaderno, lerBackupCaderno, ehBackupCaderno } from '../core/pacote/caderno.js';
import { normalizarCardapio, cardapioVazio } from '../core/cardapio.js';
import textoPiloto from '../data/receitas/salada-mediterranea-sardinha-grao-de-bico.pratoria.txt?raw';

const IMAGEM_PILOTO = `${import.meta.env.BASE_URL}receitas/salada-mediterranea-sardinha-grao-de-bico.webp`;

export const app = $state({
  pronto: false,
  erro: '',
  receitas: [],          // registros {id, dados, pessoal, ...}
  perfil: { nome: '' },
  imagens: {},           // id → object URL
  persistente: null,
  // preferências GERAIS (valem para qualquer receita): sempre no aparelho; nuvem quando houver conta
  prefs: { ajustes: { ...AJUSTES_PADRAO }, exibicao: { ...EXIBICAO_PADRAO } },
  nuvem: { estado: 'local' },  // local | sincronizando | sincronizado | pendente
  ilustracoes: {},             // receitaId → { recortes: [{ingrediente, url}], grade } | null
  colecoes: [],                // nomes, na ordem do usuário (aparelho + nuvem)
  cardapio: cardapioVazio(),   // semana-modelo (aparelho + nuvem)
  backup: { ultimo: null, adiadoAte: null, primeiraEm: null },  // só no aparelho
  boasVindas: false,           // 1ª abertura (visto: só no aparelho)
});

let db = null;
export const banco = () => db;

export async function iniciarCaderno() {
  try {
    db = await Caderno.abrir();
    app.perfil = await db.perfilLocal();
    const semeado = await db.obterConfig('semeado');
    if (!semeado) await semear();
    else if (semeado !== PILOTO_VERSAO) await atualizarPiloto();
    app.prefs = {
      ajustes: { ...AJUSTES_PADRAO, ...(await db.obterConfig('pref:ajustes', {})) },
      exibicao: { ...EXIBICAO_PADRAO, ...(await db.obterConfig('pref:exibicao', {})) },
    };
    app.colecoes = (await db.obterConfig('colecoes')) ?? [];
    app.cardapio = normalizarCardapio(await db.obterConfig('cardapio'));
    app.backup = {
      ultimo: await db.obterConfig('backup:ultimo'),
      adiadoAte: await db.obterConfig('backup:adiadoAte'),
      primeiraEm: await db.obterConfig('backup:primeiraEm'),
    };
    app.boasVindas = !(await db.obterConfig('boasVindasVista'));
    if (!app.backup.primeiraEm) { app.backup.primeiraEm = new Date().toISOString(); await db.salvarConfig('backup:primeiraEm', app.backup.primeiraEm); }
    await recarregar();
    app.persistente = (await navigator.storage?.persisted?.()) ?? null;
    app.pronto = true;
  } catch (e) {
    console.error(e);
    app.erro = 'Não foi possível abrir o armazenamento do aparelho. Verifique se o navegador não está em modo privado.';
  }
}

// Mude quando a receita-piloto for revisada: quem já tem o app recebe a versão nova
// (só se a pessoa não editou a piloto; favorita, notas e fotos continuam).
const PILOTO_VERSAO = '2026-09-24.subs';
async function atualizarPiloto() {
  const r = interpretarReceita(textoPiloto, { origem: 'manual' }).receita;
  const pronta = await prepararParaCaderno(r, { usuario: 'Pratoria', agora: new Date(r.geradoEm) });
  const atual = await db.obterReceita(pronta.id);
  if (atual && !atual.original && !atual.excluidoEm) await db.salvarReceita({ ...pronta, anotacoes: atual.dados.anotacoes ?? [] }, { texto: textoPiloto });
  await db.salvarConfig('semeado', PILOTO_VERSAO);
}

async function semear() {
  const r = interpretarReceita(textoPiloto, { origem: 'manual' }).receita;
  const pronta = await prepararParaCaderno(r, { usuario: 'Pratoria', agora: new Date(r.geradoEm) });
  await db.salvarReceita(pronta, { texto: textoPiloto });
  try {
    const blob = await (await fetch(IMAGEM_PILOTO)).blob();
    await db.salvarImagem(pronta.id, blob);
  } catch { /* sem rede na 1ª abertura: a imagem entra depois */ }
  await db.salvarConfig('semeado', PILOTO_VERSAO);
}

export async function recarregar() {
  app.receitas = await db.listarReceitas();
}

export const receitaPorId = (id) => app.receitas.find((r) => r.id === id) ?? null;

/** Object URL da imagem (carregada uma vez e reaproveitada). */
export async function urlDaImagem(id) {
  if (app.imagens[id] !== undefined) return app.imagens[id];
  const img = await db.obterImagem(id);
  app.imagens[id] = img ? URL.createObjectURL(img.blob) : null;
  return app.imagens[id];
}

export async function trocarImagem(id, blob) {
  await db.salvarImagem(id, blob);
  if (app.imagens[id]) URL.revokeObjectURL(app.imagens[id]);
  app.imagens[id] = URL.createObjectURL(blob);
}

export async function imagemBlob(id) {
  return (await db.obterImagem(id))?.blob ?? null;
}

/** Salva receita interpretada (vinda de importação, link, arquivo, QR…). */
export async function salvarNoCaderno(receita, { texto = null, imagem = null, historico = null, novaCopia = false } = {}) {
  const pronta = await prepararParaCaderno(receita, { usuario: app.perfil.nome });
  // "Manter as duas" com o mesmo texto: o id seria igual e a nova sobrescreveria a antiga
  if (novaCopia && app.receitas.some((x) => x.id === pronta.id)) {
    pronta.id = await gerarId({ usuario: pronta.usuario, titulo: pronta.titulo, momento: new Date(), url: pronta.fonte?.url });
  }
  if (historico) pronta.historicoCompartilhamento = historico; // quem já passou a receita adiante
  await db.salvarReceita(pronta, { texto });
  if (imagem) await trocarImagem(pronta.id, imagem);
  await recarregar();
  pedirPersistencia();
  return pronta;
}

export async function atualizarPessoal(id, mudancas) {
  await db.atualizarPessoal(id, JSON.parse(JSON.stringify(mudancas)));
  await recarregar();
}

export async function excluir(id) {
  await db.excluirReceita(id);
  await recarregar();
}

export async function salvarNome(nome) {
  app.perfil = { ...app.perfil, nome: nome.trim() };
  await db.salvarConfigSincronizada('perfil', $state.snapshot(app.perfil));
}

export async function pedirPersistencia() {
  if (app.persistente) return true;
  app.persistente = await pedirArmazenamentoPersistente();
  return app.persistente;
}

export const preferencia = (chave, padrao) => db.obterConfig(`pref:${chave}`, padrao);
export const salvarPreferencia = (chave, valor) => db.salvarConfig(`pref:${chave}`, valor);

// ---------- preferências gerais ----------
export async function salvarPrefs(tipo, valor) {
  app.prefs = { ...app.prefs, [tipo]: valor };
  await db.salvarConfigSincronizada(`pref:${tipo}`, $state.snapshot(valor));
}

// ---------- ilustrações a giz ----------
const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const chaveIngrediente = (nome) => semAcento(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function carregarIlustracoes(id) {
  if (app.ilustracoes[id] !== undefined) return app.ilustracoes[id];
  const reg = await db.obterIlustracoes(id);
  app.ilustracoes[id] = reg ? {
    grade: reg.grade,
    recortes: reg.recortes.filter((r) => r.blob).map((r) => ({ ingrediente: r.ingrediente, chave: r.chave, url: URL.createObjectURL(r.blob) })),
  } : null;
  return app.ilustracoes[id];
}

/** @param {{cartela: Blob, grade, recortes: Array<{ingrediente, blob}>}} dados */
export async function salvarIlustracoesDaReceita(id, dados) {
  const recortes = dados.recortes.map((r) => ({ ...r, chave: chaveIngrediente(r.ingrediente) }));
  await db.salvarIlustracoes(id, { cartela: dados.cartela, grade: dados.grade, recortes });
  for (const r of recortes) if (r.blob) await db.salvarNaBiblioteca(r.chave, r.ingrediente, r.blob, id);
  for (const r of app.ilustracoes[id]?.recortes ?? []) URL.revokeObjectURL(r.url);
  delete app.ilustracoes[id];
  return carregarIlustracoes(id);
}

/** Recortes já existentes na biblioteca pessoal, por chave de ingrediente. */
export async function biblioteca() {
  const lista = await db.listarBiblioteca();
  return new Map(lista.map((b) => [b.chave, b]));
}

export async function cartelaBlob(id) { return (await db.obterIlustracoes(id))?.cartela ?? null; }

// ---------- lista de compras geral (marcados: só no aparelho) ----------
export const obterMarcadosCompras = () => db.obterConfig('compras:marcados', {});
export const salvarMarcadosCompras = (m) => db.salvarConfig('compras:marcados', m);

// ---------- receitas repetidas ----------
/**
 * "Atualizar": salva a versão nova e leva para ela o que é do usuário na antiga
 * (favorita, notas, coleções, lista, porções, foto e giz se a nova não tiver). A antiga vai para a lixeira lógica.
 */
export async function substituirReceita(idAntigo, receita, { texto = null, imagem = null, historico = null } = {}) {
  const antigo = await db.obterReceita(idAntigo);
  const pronta = await salvarNoCaderno(receita, { texto, imagem, historico });
  if (antigo && pronta.id !== idAntigo) {
    await db.atualizarPessoal(pronta.id, antigo.pessoal ?? {});
    if (!imagem) { const img = await db.obterImagem(idAntigo); if (img && !(await db.obterImagem(pronta.id))) await trocarImagem(pronta.id, img.blob); }
    const il = await db.obterIlustracoes(idAntigo);
    if (il && !(await db.obterIlustracoes(pronta.id))) await db.salvarIlustracoes(pronta.id, { cartela: il.cartela, grade: il.grade, recortes: il.recortes });
    trocarNoCardapio(idAntigo, pronta.id);
    await db.excluirReceita(idAntigo);
    await recarregar();
  }
  return pronta;
}

// ---------- edição (aparelho + nuvem) ----------
export async function salvarEdicao(id, dados, texto) {
  await db.salvarEdicao(id, JSON.parse(JSON.stringify(dados)), texto);
  await recarregar();
}
export async function restaurarOriginal(id) {
  await db.restaurarOriginal(id);
  await recarregar();
}

// ---------- coleções (aparelho + nuvem) ----------
export async function salvarColecoes(lista) {
  app.colecoes = [...new Set(lista.map((x) => x.trim()).filter(Boolean))];
  await db.salvarConfigSincronizada('colecoes', $state.snapshot(app.colecoes));
}
export async function colecoesDaReceita(id, lista) {
  const novas = lista.filter((c) => !app.colecoes.includes(c));
  if (novas.length) await salvarColecoes([...app.colecoes, ...novas]);
  await atualizarPessoal(id, { colecoes: lista });
}
export async function renomearColecao(de, para) {
  para = para.trim(); if (!para || de === para) return;
  await salvarColecoes(app.colecoes.map((c) => (c === de ? para : c)));
  for (const r of app.receitas.filter((x) => x.pessoal?.colecoes?.includes(de)))
    await db.atualizarPessoal(r.id, { colecoes: [...new Set(r.pessoal.colecoes.map((c) => (c === de ? para : c)))] });
  await recarregar();
}
export async function apagarColecao(nome) {
  await salvarColecoes(app.colecoes.filter((c) => c !== nome));
  for (const r of app.receitas.filter((x) => x.pessoal?.colecoes?.includes(nome)))
    await db.atualizarPessoal(r.id, { colecoes: r.pessoal.colecoes.filter((c) => c !== nome) });
  await recarregar();
}

// ---------- cardápio da semana (aparelho + nuvem) ----------
export async function salvarCardapio(c) {
  app.cardapio = normalizarCardapio(c);
  await db.salvarConfigSincronizada('cardapio', $state.snapshot(app.cardapio));
}
function trocarNoCardapio(de, para) {
  const c = JSON.parse(JSON.stringify(app.cardapio));
  let mudou = false;
  for (const k of Object.keys(c.dias)) c.dias[k] = c.dias[k].map((x) => (x === de ? ((mudou = true), para) : x));
  if (mudou) salvarCardapio(c);
}

// ---------- backup do caderno (lembrete: só no aparelho) ----------
export async function exportarCaderno() {
  const dados = await db.exportarBackup();
  const zip = await criarBackupCaderno(dados);
  const nome = `caderno-${new Date().toISOString().slice(0, 10)}.pratoria`;
  const ultimo = { em: new Date().toISOString(), receitas: dados.receitas.length };
  await db.salvarConfig('backup:ultimo', ultimo);
  app.backup = { ...app.backup, ultimo, adiadoAte: null };
  await db.salvarConfig('backup:adiadoAte', null);
  return { arquivo: new File([zip], nome, { type: 'application/octet-stream' }), receitas: dados.receitas.length };
}
export async function adiarLembreteBackup(dias = 7) {
  const ate = new Date(Date.now() + dias * 86400000).toISOString();
  app.backup = { ...app.backup, adiadoAte: ate };
  await db.salvarConfig('backup:adiadoAte', ate);
}
/** Aceita o backup novo (.pratoria com caderno.json) e o antigo (.json). */
export async function restaurarCaderno(arquivo) {
  const u8 = new Uint8Array(await arquivo.arrayBuffer());
  const backup = ehBackupCaderno(u8) ? { app: 'pratoria', ...lerBackupCaderno(u8) } : JSON.parse(new TextDecoder().decode(u8));
  const r = await db.importarBackup(backup);
  app.colecoes = (await db.obterConfig('colecoes')) ?? [];
  app.cardapio = normalizarCardapio(await db.obterConfig('cardapio'));
  app.prefs = {
    ajustes: { ...AJUSTES_PADRAO, ...(await db.obterConfig('pref:ajustes', {})) },
    exibicao: { ...EXIBICAO_PADRAO, ...(await db.obterConfig('pref:exibicao', {})) },
  };
  for (const k of Object.keys(app.ilustracoes)) delete app.ilustracoes[k];
  await recarregar();
  return r;
}
export { ehBackupCaderno };

/** Quanto o Pratoria ocupa neste aparelho (estimativa do navegador). */
export async function usoDoArmazenamento() {
  try { const e = await navigator.storage?.estimate?.(); return e ? { usado: e.usage, cota: e.quota } : null; } catch { return null; }
}

export async function fecharBoasVindas() {
  app.boasVindas = false;
  await db.salvarConfig('boasVindasVista', true);
}
