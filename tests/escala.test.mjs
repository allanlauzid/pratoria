import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numeroDeCozinha, ingredienteExibido } from '../src/core/formato/escala.js';
import { lerIngrediente } from '../src/core/formato/parser.js';

const ing = (t) => lerIngrediente(t, [], 'x');

test('números de cozinha', () => {
  assert.equal(numeroDeCozinha(1.5), '1½');
  assert.equal(numeroDeCozinha(0.33), '⅓');
  assert.equal(numeroDeCozinha(2.96), '3');
  assert.equal(numeroDeCozinha(0.75), '¾');
  assert.equal(numeroDeCozinha(12.4), '12');
  assert.equal(numeroDeCozinha(0.05), '⅛');
});

test('escalar porções', () => {
  assert.equal(ingredienteExibido(ing('1/4 | xícara | grão-de-bico seco |'), { fator: 2 }), '½ xícara de grão-de-bico seco');
  assert.equal(ingredienteExibido(ing('1 a 2 | colheres de sopa | salsa fresca | picada'), { fator: 3 }), '3 a 6 colheres de sopa de salsa fresca, picada');
  assert.equal(ingredienteExibido(ing('1 | | tomate médio | picado'), { fator: 1.5 }), '1½ tomate médio, picado');
  assert.equal(ingredienteExibido(ing(' | | pimenta-do-reino | a gosto'), { fator: 4 }), 'pimenta-do-reino, a gosto');
  assert.equal(ingredienteExibido(ing('1/2 | xícara | leite |'), { fator: 4 }), '2 xícaras de leite');
});

test('converter volume para ml', () => {
  assert.equal(ingredienteExibido(ing('1/4 | xícara | grão-de-bico seco |'), { unidades: 'metrico' }), '60 ml de grão-de-bico seco');
  assert.equal(ingredienteExibido(ing('1 1/2 | colher de sopa | suco de limão |'), { unidades: 'metrico' }), '23 ml de suco de limão');
  assert.equal(ingredienteExibido(ing('100 | g | sardinha |'), { unidades: 'metrico' }), '100 g de sardinha');
  assert.equal(ingredienteExibido(ing('5 | xícaras | água |'), { unidades: 'metrico' }), '1¼ l de água');
});
