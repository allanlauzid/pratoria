import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpretarReceita } from '../src/core/formato/parser.js';
import { textoWhatsApp, limparParaWhatsApp } from '../src/core/compartilhar/whatsapp.js';

const txt = readFileSync(new URL('../src/data/receitas/salada-mediterranea-sardinha-grao-de-bico.pratoria.txt', import.meta.url), 'utf8');
const { receita } = interpretarReceita(txt);
const SITE = 'https://exemplo.github.io/pratoria/';

test('whatsapp: estrutura, formatação e CTA', () => {
  const t = textoWhatsApp(receita, { siteUrl: SITE });
  assert.match(t, /^🍽️ \*SALADA MEDITERRÂNEA/);
  assert.match(t, /👥 \*Serve:\* 1 porção/);
  assert.match(t, /🧺 \*INGREDIENTES\*/);
  assert.match(t, /👩‍🍳 \*MODO DE PREPARO\*/);
  assert.match(t, /\n\*1\.\* /);
  assert.match(t, /\n• /);
  assert.match(t, /Pratoria/);
  assert.ok(t.includes(SITE));
  assert.match(t, /_Receita adaptada de OliveTomato · Elena Paravantes_/);
});

test('whatsapp: nunca leva o link original', () => {
  const t = textoWhatsApp(receita, { siteUrl: SITE });
  assert.ok(!t.includes('olivetomato.com'));
  const urls = t.match(/https?:\/\/\S+/g) ?? [];
  assert.deepEqual(urls, [SITE]);
});

test('whatsapp: porções escaladas', () => {
  const t = textoWhatsApp(receita, { porcoes: 3, siteUrl: SITE });
  assert.match(t, /3 porções/);
  assert.match(t, /Quantidades ajustadas para 3 porções/);
});

test('whatsapp: marcadores inofensivos no conteúdo', () => {
  assert.equal(limparParaWhatsApp('sal *grosso* e_pimenta ~x~ https://a.b/c'), 'sal grosso e pimenta x');
});
