import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Caderno } from '../src/core/dados/local.js';
import { criarBackupCaderno, lerBackupCaderno, ehBackupCaderno } from '../src/core/pacote/caderno.js';

test('caderno local: salvar, pessoal, estado, rascunho, exclusão, fila e backup', async () => {
  const c = await Caderno.abrir();
  const perfil = await c.perfilLocal();
  assert.equal(perfil.nome, '');
  await c.salvarConfig('perfil', { ...perfil, nome: 'Allan' });
  assert.equal((await c.perfilLocal()).nome, 'Allan');

  await c.salvarReceita({ id: 'prt-0000000000000001', titulo: 'A' }, { texto: '#PRATORIA v1…' });
  await c.salvarReceita({ id: 'prt-0000000000000002', titulo: 'B' });
  await c.atualizarPessoal('prt-0000000000000001', { favorita: true });
  const a = await c.obterReceita('prt-0000000000000001');
  assert.equal(a.pessoal.favorita, true);
  assert.equal(a.pessoal.status, 'quero fazer');
  assert.equal(a.texto, '#PRATORIA v1…');

  await c.salvarEstado('prt-0000000000000001', { pagina: 5 });
  await c.salvarEstado('prt-0000000000000001', { compras: { tomate: true } });
  assert.deepEqual((await c.obterEstado('prt-0000000000000001')).pagina, 5);

  await c.salvarRascunho('importacao', { url: 'https://ex.com', passo: 2 });
  assert.equal((await c.obterRascunho('importacao')).passo, 2);

  await c.salvarImagem('prt-0000000000000001', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }));
  await c.excluirReceita('prt-0000000000000002');
  assert.equal((await c.listarReceitas()).length, 1);
  assert.equal((await c.listarFila()).length, 5);

  await c.salvarIlustracoes('prt-0000000000000001', { cartela: new Blob([new Uint8Array([9])], { type: 'image/png' }), grade: { colunas: 1, linhas: 1 },
    recortes: [{ ingrediente: 'tomate', chave: 'tomate', blob: new Blob([new Uint8Array([7, 7])], { type: 'image/png' }) }] });
  await c.salvarConfigSincronizada('colecoes', ['Natal']);
  const zip = await criarBackupCaderno(await c.exportarBackup());
  assert.ok(ehBackupCaderno(zip));
  const backup = { app: 'pratoria', ...lerBackupCaderno(zip) };
  assert.equal(backup.receitas.length, 1);
  assert.deepEqual([...new Uint8Array(await backup.imagens[0].blob.arrayBuffer())], [1, 2, 3]);
  assert.equal(backup.ilustracoes[0].recortes[0].ingrediente, 'tomate');

  c.db.close();
  await new Promise((ok) => { indexedDB.deleteDatabase('pratoria').onsuccess = ok; });
  const c2 = await Caderno.abrir();
  assert.deepEqual(await c2.importarBackup(backup), { novas: 1, atualizadas: 0 });
  assert.equal((await c2.obterReceita('prt-0000000000000001')).pessoal.favorita, true);
  assert.equal((await c2.obterIlustracoes('prt-0000000000000001')).recortes.length, 1);
  assert.deepEqual(await c2.obterConfig('colecoes'), ['Natal']);
  assert.equal((await c2.listarBiblioteca()).length, 1);
});

test('caderno local: edição guarda o original e restaura', async () => {
  const c = await Caderno.abrir();
  await c.salvarReceita({ id: 'prt-00000000000000e1', titulo: 'Bolo' }, { texto: 'orig' });
  await c.salvarEdicao('prt-00000000000000e1', { titulo: 'Bolo da vó' }, 'editado');
  await c.salvarEdicao('prt-00000000000000e1', { titulo: 'Bolo da vó 2' }, 'editado 2');
  let r = await c.obterReceita('prt-00000000000000e1');
  assert.equal(r.dados.titulo, 'Bolo da vó 2');
  assert.equal(r.dados.id, 'prt-00000000000000e1');
  assert.equal(r.original.dados.titulo, 'Bolo');
  assert.equal(r.original.texto, 'orig');
  r = await c.restaurarOriginal('prt-00000000000000e1');
  assert.equal(r.dados.titulo, 'Bolo');
  assert.equal(r.original, undefined);
});
