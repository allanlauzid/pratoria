// Pratoria — armazenamento local (IndexedDB). É a base de tudo:
// o app funciona 100% sem login; a nuvem (Supabase) é uma cópia extra quando há conta.
//
// Stores:
//   receitas   {id, dados, texto, pessoal, criadoEm, atualizadoEm, excluidoEm, sincronizadoEm}
//   imagens    {receitaId, blob, tipo, atualizadoEm, sincronizadoEm}
//   estado     {receitaId, pagina, compras:{[item]:true}, atualizadoEm}   (só no aparelho)
//   rascunhos  {chave, ...}                                               (só no aparelho)
//   config     {chave, valor}  perfil local, preferências, coleções, cardápio (vão à nuvem: CONFIG_NA_NUVEM);
//              tutorial visto, último backup, cronômetros, marcados da lista (só no aparelho)
//   fila       {n (auto), tipo, receitaId, em}  mudanças a enviar para a nuvem
//   ilustracoes {receitaId, cartela, grade, recortes:[{ingrediente, chave, blob}], atualizadoEm}  (v2)
//   biblioteca  {chave, ingrediente, blob, origem, atualizadoEm}  recortes reaproveitáveis (v2)

const NOME_BANCO = 'pratoria';
const VERSAO_BANCO = 2;

const req = (r) => new Promise((ok, erro) => { r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });
const fim = (tx) => new Promise((ok, erro) => { tx.oncomplete = () => ok(); tx.onerror = tx.onabort = () => erro(tx.error); });

export function abrirBanco(idb = globalThis.indexedDB) {
  const r = idb.open(NOME_BANCO, VERSAO_BANCO);
  r.onupgradeneeded = (e) => {
    const db = r.result;
    if (e.oldVersion < 1) criarV1(db);
    if (e.oldVersion < 2) {
      db.createObjectStore('ilustracoes', { keyPath: 'receitaId' });
      db.createObjectStore('biblioteca', { keyPath: 'chave' });
    }
  };
  return req(r);
}

function criarV1(db) {
  {
    const receitas = db.createObjectStore('receitas', { keyPath: 'id' });
    receitas.createIndex('atualizadoEm', 'atualizadoEm');
    db.createObjectStore('imagens', { keyPath: 'receitaId' });
    db.createObjectStore('estado', { keyPath: 'receitaId' });
    db.createObjectStore('rascunhos', { keyPath: 'chave' });
    db.createObjectStore('config', { keyPath: 'chave' });
    db.createObjectStore('fila', { keyPath: 'n', autoIncrement: true });
  }
}

const agoraIso = () => new Date().toISOString();

/** Configurações que, com conta, também vão para a nuvem. As demais ficam só no aparelho. */
export const CONFIG_NA_NUVEM = ['perfil', 'pref:ajustes', 'pref:exibicao', 'colecoes', 'cardapio'];

const PESSOAL_PADRAO = () => ({
  favorita: false, avaliacao: null, status: 'quero fazer', // 'quero fazer' | 'já fiz'
  vezesPreparada: 0, ultimaVez: null, colecoes: [], porcoesPreferidas: null,
});

export class Caderno {
  constructor(db) { this.db = db; }
  static async abrir(idb) { return new Caderno(await abrirBanco(idb)); }

  async #tx(stores, modo, fn) {
    const tx = this.db.transaction(stores, modo);
    const resultado = await fn(...[].concat(stores).map((s) => tx.objectStore(s)));
    await fim(tx);
    return resultado;
  }

  // ---------- receitas ----------
  /** Salva (cria ou atualiza). `texto` = texto PRATORIA original colado, guardado para reprocessar no futuro. */
  async salvarReceita(dados, { texto = null, pessoal = null } = {}) {
    if (!dados?.id) throw new Error('Receita sem id.');
    return this.#tx(['receitas', 'fila'], 'readwrite', async (rs, fila) => {
      const atual = await req(rs.get(dados.id));
      const reg = {
        id: dados.id,
        dados,
        texto: texto ?? atual?.texto ?? null,
        pessoal: { ...PESSOAL_PADRAO(), ...atual?.pessoal, ...pessoal },
        criadoEm: atual?.criadoEm ?? agoraIso(),
        atualizadoEm: agoraIso(),
        excluidoEm: null,
        sincronizadoEm: atual?.sincronizadoEm ?? null,
      };
      if (atual?.original) { reg.original = atual.original; reg.editadaEm = atual.editadaEm; }
      await req(rs.put(reg));
      await req(fila.add({ tipo: 'receita', receitaId: dados.id, em: reg.atualizadoEm }));
      return reg;
    });
  }

  async atualizarPessoal(id, mudancas) {
    return this.#tx(['receitas', 'fila'], 'readwrite', async (rs, fila) => {
      const reg = await req(rs.get(id));
      if (!reg) throw new Error('Receita não encontrada.');
      reg.pessoal = { ...reg.pessoal, ...mudancas };
      reg.atualizadoEm = agoraIso();
      await req(rs.put(reg));
      await req(fila.add({ tipo: 'receita', receitaId: id, em: reg.atualizadoEm }));
      return reg;
    });
  }

  /**
   * Edição feita pelo usuário: a 1ª edição guarda o original (dados + texto) em `original`,
   * para poder restaurar ou reprocessar. O id não muda.
   */
  async salvarEdicao(id, dados, texto) {
    return this.#tx(['receitas', 'fila'], 'readwrite', async (rs, fila) => {
      const reg = await req(rs.get(id));
      if (!reg) throw new Error('Receita não encontrada.');
      if (!reg.original) reg.original = { dados: reg.dados, texto: reg.texto ?? null, guardadoEm: agoraIso() };
      reg.dados = { ...dados, id };
      reg.texto = texto;
      reg.editadaEm = reg.atualizadoEm = agoraIso();
      await req(rs.put(reg));
      await req(fila.add({ tipo: 'receita', receitaId: id, em: reg.atualizadoEm }));
      return reg;
    });
  }

  async restaurarOriginal(id) {
    return this.#tx(['receitas', 'fila'], 'readwrite', async (rs, fila) => {
      const reg = await req(rs.get(id));
      if (!reg?.original) return reg;
      reg.dados = reg.original.dados; reg.texto = reg.original.texto;
      delete reg.original; delete reg.editadaEm;
      reg.atualizadoEm = agoraIso();
      await req(rs.put(reg));
      await req(fila.add({ tipo: 'receita', receitaId: id, em: reg.atualizadoEm }));
      return reg;
    });
  }

  obterReceita(id) { return this.#tx('receitas', 'readonly', (rs) => req(rs.get(id))); }

  async listarReceitas({ incluirExcluidas = false } = {}) {
    const todas = await this.#tx('receitas', 'readonly', (rs) => req(rs.getAll()));
    return todas.filter((r) => incluirExcluidas || !r.excluidoEm)
      .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
  }

  /** Exclusão lógica (para a exclusão chegar à nuvem e aos outros aparelhos). */
  async excluirReceita(id) {
    return this.#tx(['receitas', 'fila'], 'readwrite', async (rs, fila) => {
      const reg = await req(rs.get(id));
      if (!reg) return;
      reg.excluidoEm = reg.atualizadoEm = agoraIso();
      await req(rs.put(reg));
      await req(fila.add({ tipo: 'exclusao', receitaId: id, em: reg.excluidoEm }));
    });
  }

  // ---------- imagens ----------
  salvarImagem(receitaId, blob) {
    return this.#tx(['imagens', 'fila'], 'readwrite', async (is, fila) => {
      const em = agoraIso();
      await req(is.put({ receitaId, blob, tipo: blob.type, atualizadoEm: em, sincronizadoEm: null }));
      await req(fila.add({ tipo: 'imagem', receitaId, em }));
    });
  }
  obterImagem(receitaId) { return this.#tx('imagens', 'readonly', (is) => req(is.get(receitaId))); }

  // ---------- ilustrações a giz (aparelho + nuvem) ----------
  salvarIlustracoes(receitaId, { cartela, grade, recortes }) {
    return this.#tx(['ilustracoes', 'fila'], 'readwrite', async (is, fila) => {
      const em = agoraIso();
      await req(is.put({ receitaId, cartela, grade, recortes, atualizadoEm: em, sincronizadoEm: null }));
      await req(fila.add({ tipo: 'ilustracoes', receitaId, em }));
    });
  }
  obterIlustracoes(receitaId) { return this.#tx('ilustracoes', 'readonly', (is) => req(is.get(receitaId))); }
  listarIlustracoes() { return this.#tx('ilustracoes', 'readonly', (is) => req(is.getAll())); }
  listarImagens() { return this.#tx('imagens', 'readonly', (is) => req(is.getAll())); }

  /** Biblioteca pessoal: um recorte por ingrediente, reaproveitado entre receitas. */
  salvarNaBiblioteca(chave, ingrediente, blob, origem) {
    return this.#tx(['biblioteca', 'fila'], 'readwrite', async (b, fila) => {
      const em = agoraIso();
      await req(b.put({ chave, ingrediente, blob, origem, atualizadoEm: em, sincronizadoEm: null }));
      await req(fila.add({ tipo: 'biblioteca', receitaId: origem, em }));
    });
  }
  listarBiblioteca() { return this.#tx('biblioteca', 'readonly', (b) => req(b.getAll())); }

  // ---------- estado de uso (só no aparelho) ----------
  obterEstado(receitaId) { return this.#tx('estado', 'readonly', (s) => req(s.get(receitaId))); }
  listarEstados() { return this.#tx('estado', 'readonly', (s) => req(s.getAll())); }
  async salvarEstado(receitaId, mudancas) {
    return this.#tx('estado', 'readwrite', async (s) => {
      const atual = (await req(s.get(receitaId))) ?? { receitaId, pagina: 0, compras: {} };
      const novo = { ...atual, ...mudancas, receitaId, atualizadoEm: agoraIso() };
      await req(s.put(novo));
      return novo;
    });
  }

  // ---------- rascunhos (só no aparelho) ----------
  obterRascunho(chave) { return this.#tx('rascunhos', 'readonly', (s) => req(s.get(chave))); }
  salvarRascunho(chave, dados) { return this.#tx('rascunhos', 'readwrite', (s) => req(s.put({ ...dados, chave, atualizadoEm: agoraIso() }))); }
  apagarRascunho(chave) { return this.#tx('rascunhos', 'readwrite', (s) => req(s.delete(chave))); }

  // ---------- configurações ----------
  async obterConfig(chave, padrao = null) { return (await this.#tx('config', 'readonly', (s) => req(s.get(chave))))?.valor ?? padrao; }
  salvarConfig(chave, valor) { return this.#tx('config', 'readwrite', (s) => req(s.put({ chave, valor }))); }
  /** Configuração que vai para a nuvem quando houver conta (entra na fila). */
  salvarConfigSincronizada(chave, valor) {
    return this.#tx(['config', 'fila'], 'readwrite', async (s, fila) => {
      await req(s.put({ chave, valor }));
      await req(fila.add({ tipo: 'config', chave, receitaId: null, em: agoraIso() }));
    });
  }

  /** Perfil local: usado no modo sem login e como nome no prompt. */
  async perfilLocal() {
    let p = await this.obterConfig('perfil');
    if (!p) { p = { nome: '', criadoEm: agoraIso(), aparelho: crypto.randomUUID() }; await this.salvarConfig('perfil', p); }
    return p;
  }

  // ---------- fila para a nuvem ----------
  listarFila() { return this.#tx('fila', 'readonly', (s) => req(s.getAll())); }
  limparFila(ate) { return this.#tx('fila', 'readwrite', (s) => req(s.delete(IDBKeyRange.upperBound(ate)))); }

  // ---------- backup (modo sem login: única proteção contra perda) ----------
  /** Tudo o que o caderno precisa para ser refeito em outro aparelho (blobs; o zip é montado em core/pacote/caderno.js). */
  async exportarBackup() {
    const receitas = await this.listarReceitas({ incluirExcluidas: false });
    const ids = new Set(receitas.map((r) => r.id));
    const imagens = (await this.listarImagens()).filter((i) => ids.has(i.receitaId)).map((i) => ({ receitaId: i.receitaId, blob: i.blob }));
    const ilustracoes = (await this.listarIlustracoes()).filter((i) => ids.has(i.receitaId));
    const estado = await this.listarEstados();
    const config = {};
    for (const k of CONFIG_NA_NUVEM) { const v = await this.obterConfig(k); if (v != null) config[k] = v; }
    return { app: 'pratoria', perfil: await this.perfilLocal(), receitas, imagens, ilustracoes, estado, config };
  }

  /**
   * Mescla um backup: mantém a versão mais recente de cada receita; foto e giz só entram se faltarem;
   * coleções somam; cardápio e preferências só entram se ainda não existirem aqui.
   * Aceita o backup novo (blobs) e o antigo (.json com imagens em base64).
   */
  async importarBackup(backup) {
    if (backup?.app !== 'pratoria') throw new Error('Arquivo não é um backup do Pratoria.');
    let novas = 0, atualizadas = 0;
    for (const r of backup.receitas ?? []) {
      const atual = await this.obterReceita(r.id);
      if (!atual) novas++; else if (r.atualizadoEm > atual.atualizadoEm) atualizadas++; else continue;
      await this.#tx('receitas', 'readwrite', (rs) => req(rs.put(r)));
    }
    for (const i of backup.imagens ?? []) {
      if (await this.obterImagem(i.receitaId)) continue;
      await this.salvarImagem(i.receitaId, i.blob ?? base64ParaBlob(i.base64, i.tipo));
    }
    for (const il of backup.ilustracoes ?? []) {
      if (await this.obterIlustracoes(il.receitaId)) continue;
      await this.salvarIlustracoes(il.receitaId, { cartela: il.cartela, grade: il.grade, recortes: il.recortes });
      for (const r of il.recortes ?? []) if (r.blob && r.chave) await this.salvarNaBiblioteca(r.chave, r.ingrediente, r.blob, il.receitaId);
    }
    const cfg = backup.config ?? {};
    if (cfg.colecoes) {
      const atuais = (await this.obterConfig('colecoes')) ?? [];
      const juntas = [...atuais, ...cfg.colecoes.filter((c) => !atuais.includes(c))];
      await this.salvarConfigSincronizada('colecoes', juntas);
    }
    for (const k of ['cardapio', 'pref:ajustes', 'pref:exibicao']) {
      if (cfg[k] != null && (await this.obterConfig(k)) == null) await this.salvarConfigSincronizada(k, cfg[k]);
    }
    return { novas, atualizadas };
  }
}

/** Pede ao navegador para não apagar os dados sozinho (importante sem login). */
export async function pedirArmazenamentoPersistente() {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}

function base64ParaBlob(b64, tipo) {
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}
