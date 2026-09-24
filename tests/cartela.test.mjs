import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encontrarIlhas, atribuirGrade } from '../src/core/cartela.js';
import { gradeDaCartela, montarPromptIlustracoes } from '../src/core/import/prompts.js';

function cartela(w, h, desenhos) {
  const a = new Uint8Array(w * h);
  for (const { cx, cy, r, farelos } of desenhos) {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r && (x + y) % 3) a[y * w + x] = 220; // textura de giz (furos)
    if (farelos) for (let k = 0; k < 5; k++) a[(cy + r + 6) * w + cx + k * 3] = 200; // farelos soltos perto
  }
  a[5 * w + 5] = 255; // sujeira isolada
  return a;
}

test('cartela 3x3: acha cada desenho na sua casa, junta farelos, ignora sujeira', () => {
  const w = 900, h = 900, desenhos = [];
  for (let l = 0; l < 3; l++) for (let c = 0; c < 3; c++) if (!(l === 2 && c === 2)) desenhos.push({ cx: 150 + c * 300, cy: 150 + l * 300, r: 90, farelos: c === 1 });
  const ilhas = encontrarIlhas(cartela(w, h, desenhos), w, h);
  assert.equal(ilhas.length, 8);
  const casas = atribuirGrade(ilhas, w, h, 3, 3);
  assert.equal(casas.filter(Boolean).length, 8);
  assert.equal(casas[8], null);
  const c4 = casas[4];
  assert.ok(Math.abs(c4.x + c4.w / 2 - 450) < 20 && Math.abs(c4.y - 360) < 15, JSON.stringify(c4));
});

test('grade e prompt da cartela', () => {
  assert.deepEqual(gradeDaCartela(6), { colunas: 3, linhas: 2 });
  assert.deepEqual(gradeDaCartela(9), { colunas: 3, linhas: 3 });
  assert.deepEqual(gradeDaCartela(12), { colunas: 4, linhas: 3 });
  const p = montarPromptIlustracoes({ ilustracoes: [{ ordem: 2, ingrediente: 'limão', desenho: 'meio limão' }, { ordem: 1, ingrediente: 'tomate', desenho: '' }] });
  assert.match(p, /1\. tomate\n2\. limão — meio limão/);
  assert.match(p, /SEM texto/);
  assert.throws(() => montarPromptIlustracoes({ ilustracoes: [] }));
});

test('ilustrações entram no passo certo e se acumulam', async () => {
  const { ilustracoesAte, ilustracoesNovas } = await import('../src/core/ilustracoes.js');
  const receita = { preparacoes: [{ nome: 'Grão-de-bico' }, { nome: 'Salada' }], ilustracoes: [
    { ordem: 1, ingrediente: 'grão-de-bico', onde: { preparacao: 'Grao de bico', passo: 1 } },
    { ordem: 2, ingrediente: 'tomate', onde: { preparacao: 'Salada', passo: 1 } },
    { ordem: 3, ingrediente: 'limão', onde: { preparacao: 'salada', passo: 4 } },
  ] };
  const rec = ['grão-de-bico', 'tomate', 'limão'].map((ingrediente) => ({ ingrediente, url: ingrediente }));
  assert.deepEqual(ilustracoesAte(receita, rec, 0, 9).itens.map((x) => x.ingrediente), ['grão-de-bico']);
  assert.deepEqual(ilustracoesAte(receita, rec, 1, 3).itens.map((x) => x.ingrediente), ['grão-de-bico', 'tomate']);
  assert.deepEqual(ilustracoesAte(receita, rec, 1, 9).itens.length, 3);
  assert.deepEqual(ilustracoesNovas(receita, rec, 1, 4, 6), ['limão']);
});
