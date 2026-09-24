import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpretarReceita, textoIngrediente } from '../src/core/formato/parser.js';
import { serializarReceita } from '../src/core/formato/serializar.js';
import { lerQuantidade, exibirQuantidade } from '../src/core/formato/quantidade.js';
import { creditoCurto } from '../src/core/formato/credito.js';

export const piloto = readFileSync(new URL('../src/data/receitas/salada-mediterranea-sardinha-grao-de-bico.pratoria.txt', import.meta.url), 'utf8');

test('receita-piloto é lida sem erros nem avisos', () => {
  const { receita, erros, avisos } = interpretarReceita(piloto);
  assert.deepEqual(erros, []);
  assert.deepEqual(avisos, []);
  assert.equal(receita.slug, 'salada-mediterranea-de-sardinha-com-grao-de-bico');
  assert.equal(receita.rendimento.porcoes, 1);
  assert.equal(receita.compras.length, 12);
  assert.deepEqual(receita.compras[6], { item: 'sardinha em conserva no azeite', quantidade: '1 lata (100 a 125 g)', secao: 'enlatados e conservas' });
  assert.deepEqual(receita.compras[9], { item: 'azeite extravirgem', quantidade: '', secao: 'mercearia' });
  const [grao, salada] = receita.preparacoes;
  assert.equal(grao.ingredientes.length, 3);
  assert.equal(grao.passos.length, 9);
  assert.equal(salada.ingredientes.length, 11);
  assert.equal(salada.passos.length, 9);
  assert.match(salada.nota, /seis primeiros/);
  assert.deepEqual(receita.tempos.espera, { texto: '480 a 720', min: 480, max: 720 });
  assert.deepEqual(receita.refeicao, ['almoço', 'jantar']);
  assert.deepEqual(receita.alergenos, ['peixe']);
  assert.equal(receita.substituicoes.length, 2);
  assert.equal(receita.substituicoes[1].obs, '');
  assert.equal(receita.servir.length, 1);
  assert.equal(receita.fonte.autor, 'Elena Paravantes');
  assert.equal(receita.tituloOriginal, '5 Minute Mediterranean Salad with Sardines and Chickpeas');
});

test('frases de ingrediente ficam naturais', () => {
  const [grao, salada] = interpretarReceita(piloto).receita.preparacoes;
  assert.equal(grao.ingredientes[0].texto, '¼ xícara de grão-de-bico seco');
  assert.equal(grao.ingredientes[1].texto, 'água, o suficiente para deixar de molho e cozinhar');
  assert.equal(salada.ingredientes[0].texto, '1 tomate médio, picado');
  assert.equal(salada.ingredientes[6].texto, '100 g de sardinha em conserva no azeite');
  assert.equal(salada.ingredientes[7].texto, '1½ colher de sopa de suco de limão fresco');
  assert.deepEqual(salada.ingredientes[8].quantidade, { texto: '1 a 2', min: 1, max: 2 });
  assert.equal(salada.ingredientes[10].quantidade, null);
});

test('ida e volta: serializar e ler de novo dá o mesmo objeto', () => {
  const a = interpretarReceita(piloto).receita;
  a.anotacoes = ['Usei limão-siciliano.'];
  const b = interpretarReceita(serializarReceita(a)).receita;
  assert.deepEqual(b, a);
});

test('anotações pessoais podem ficar de fora do texto', () => {
  const r = interpretarReceita(piloto).receita;
  r.anotacoes = ['segredo'];
  assert.ok(!serializarReceita(r, { incluirAnotacoes: false }).includes('segredo'));
});

test('tolera cópia de markdown renderizado (sem #, com • e negrito, texto antes)', () => {
  const colado = `Claro! Aqui está:
PRATORIA v1
**titulo:** Ovo cozido
descrição: Simples.
rendimento: 2 porções
fonte_url: https://ex.com/ovo
COMPRAS
• ovos | 2 | frios e laticínios
PREPARAÇÃO: Ovos
INGREDIENTES
• 2 | | ovos |
PASSOS
1) Ferva a água.
2) Cozinhe os ovos por 9 minutos.
FIM`;
  const { receita, erros } = interpretarReceita(colado);
  assert.deepEqual(erros, []);
  assert.equal(receita.titulo, 'Ovo cozido');
  assert.equal(receita.rendimento.porcoes, 2);
  assert.equal(receita.preparacoes[0].passos.length, 2);
  assert.equal(receita.compras[0].secao, 'frios e laticínios');
});

test('avisa valores fora das listas padrão', () => {
  const { avisos } = interpretarReceita('#PRATORIA v1\ntitulo: T\ncategoria: Doces finos\nalergenos: glúten, pólen\n## PREPARACAO: A\n### PASSOS\n1. x\n#FIM', { origem: 'manual' });
  assert.ok(avisos.some((a) => /Categoria fora/.test(a)));
  assert.ok(avisos.some((a) => /Alérgeno fora.*pólen/.test(a)));
});

test('detecta resposta cortada e falta de campos obrigatórios', () => {
  const { erros, avisos, valido } = interpretarReceita('#PRATORIA v1\ndescricao: x\n## PREPARACAO: A\n### INGREDIENTES\n- 1 | | ovo |');
  assert.equal(valido, false);
  assert.ok(erros.some((e) => /título/.test(e)));
  assert.ok(erros.some((e) => /não tem passos/.test(e)));
  assert.ok(avisos.some((a) => /#FIM/.test(a)));
  assert.ok(avisos.some((a) => /fonte_url/.test(a)));
});

test('gera lista de compras quando ela falta', () => {
  const { receita, avisos } = interpretarReceita('#PRATORIA v1\ntitulo: T\nfonte_url: https://x.y\n## PREPARACAO: A\n### INGREDIENTES\n- 1 | | ovo |\n- | | água | \n- 1 | | Ovo | \n### PASSOS\n1. Faça.\n#FIM');
  assert.deepEqual(receita.compras, [{ item: 'ovo', quantidade: '', secao: '' }]);
  assert.ok(avisos.some((a) => /gerada/.test(a)));
});

test('quantidades', () => {
  assert.equal(lerQuantidade('1½').min, 1.5);
  assert.equal(lerQuantidade('1 1/2').min, 1.5);
  assert.equal(lerQuantidade('0,5').min, 0.5);
  assert.deepEqual(lerQuantidade('1-2'), { texto: '1-2', min: 1, max: 2 });
  assert.equal(lerQuantidade('a gosto').min, null);
  assert.equal(exibirQuantidade('3/4'), '¾');
  assert.equal(exibirQuantidade('2 1/4'), '2¼');
  assert.equal(textoIngrediente({ quantidade: null, unidade: 'pitada', item: 'de sal', obs: '' }), 'pitada de sal');
});

test('crédito discreto', () => {
  const r = interpretarReceita(piloto).receita;
  assert.deepEqual(creditoCurto(r), { texto: 'Adaptada de OliveTomato · Elena Paravantes', url: r.fonte.url });
  assert.equal(creditoCurto({ fonte: { url: 'https://www.tudogostoso.com.br/x' } }).texto, 'Adaptada de tudogostoso.com.br');
  assert.equal(creditoCurto({ fonte: {} }), null);
});
