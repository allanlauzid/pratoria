import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { interpretarReceita } from '../src/core/formato/parser.js';
import { criarPratoria, abrirEntrada } from '../src/core/pacote/pratoria.js';
import { lerMd } from '../src/core/pacote/md.js';
import { montarPromptImagem, montarPromptReceita, montarPromptIlustracoes } from '../src/core/import/prompts.js';
import { compactar } from '../src/core/compartilhar/compactar.js';

const piloto = interpretarReceita(readFileSync(new URL('../src/data/receitas/salada-mediterranea-sardinha-grao-de-bico.pratoria.txt', import.meta.url), 'utf8')).receita;
piloto.id = 'prt-5fd8751032eba68d';
piloto.ilustracoes = [
  { ordem: 1, ingrediente: 'grão-de-bico', desenho: 'grãos soltos', onde: { preparacao: 'Grão-de-bico', passo: 1 } },
  { ordem: 2, ingrediente: 'tomate', desenho: 'meio tomate', onde: { preparacao: 'Salada', passo: 1 } },
];
const foto = new Blob([new Uint8Array(5000).map((_, i) => (i * 7) % 256)], { type: 'image/webp' });
const cartela = new Blob([new Uint8Array(3000).map((_, i) => (i * 13) % 256)], { type: 'image/webp' });
const base = {
  receita: piloto, compartilhadoPor: 'Allan', exportadoEm: '2026-09-24T09:30:00-03:00',
  imagens: [{ nome: 'prato', blob: foto, largura: 1200, altura: 873 }, { nome: 'ilustracoes', blob: cartela }],
  prompts: { texto: montarPromptReceita(piloto.fonte.url, { usuario: 'Allan' }), imagem: montarPromptImagem(piloto), ilustracoes: montarPromptIlustracoes(piloto) },
  app: 'Pratoria teste',
};

test('.pratoria texto+imagens: zip com receita.md + imagens, tudo íntegro', async () => {
  const { arquivo, md } = await criarPratoria({ ...base, pacote: 'imagens', base64: false });
  assert.equal(arquivo.name, 'salada-mediterranea-de-sardinha-com-grao-de-bico.pratoria');
  const nomes = Object.keys(unzipSync(new Uint8Array(await arquivo.arrayBuffer())));
  assert.deepEqual(nomes.sort(), ['imagens/ilustracoes.webp', 'imagens/prato.webp', 'receita.md']);
  assert.match(md, /compartilhado_por: Allan/);
  assert.match(md, /exportado_em: 2026-09-24T09:30:00-03:00/);
  assert.match(md, /P {2}R {2}A {2}T {2}O {2}R {2}I {2}A/);
  const r = await abrirEntrada(arquivo);
  assert.equal(r.via, 'pacote');
  assert.deepEqual(r.avisos, []);
  assert.equal(r.receitaIntegra, true);
  assert.deepEqual(r.imagens.map((i) => [i.nome, i.estado, i.integra]), [['prato', 'arquivo', true], ['ilustracoes', 'arquivo', true]]);
  assert.deepEqual(new Uint8Array(await r.imagens[0].blob.arrayBuffer()), new Uint8Array(await foto.arrayBuffer()));
  assert.deepEqual(interpretarReceita(r.textoReceita).receita.ilustracoes, piloto.ilustracoes);
  assert.equal(Object.keys(r.prompts).length, 3);
  assert.match(r.prompts.texto, /```\n#PRATORIA v1/); // cercas internas sobrevivem
  assert.deepEqual(r.mapa.ingredientes, ['grão-de-bico', 'tomate']);
});

test('base64 dentro do .md: o .md funciona sozinho, fora do zip', async () => {
  const { arquivo, md } = await criarPratoria({ ...base, pacote: 'imagens', base64: true });
  assert.deepEqual(Object.keys(unzipSync(new Uint8Array(await arquivo.arrayBuffer()))), ['receita.md']);
  assert.ok(md.split('\n').filter((l) => /^[A-Za-z0-9+/=]{20,}$/.test(l)).every((l) => l.length <= 76));
  const r = await abrirEntrada(md);            // só o .md, como texto
  assert.deepEqual(r.imagens.map((i) => [i.estado, i.integra]), [['anexo', true], ['anexo', true]]);
  const r2 = await abrirEntrada(new Blob([md])); // .md como arquivo
  assert.equal(r2.via, 'arquivo');
});

test('só texto: imagens ficam "ausente", mas o índice guarda a impressão digital', async () => {
  const { arquivo, md } = await criarPratoria({ ...base, pacote: 'texto', base64: false });
  assert.deepEqual(Object.keys(unzipSync(new Uint8Array(await arquivo.arrayBuffer()))), ['receita.md']);
  assert.match(md, /- prato \| imagens\/prato.webp \| 1200x873 \| sha256:[0-9a-f]{64} \| ausente/);
  const r = await abrirEntrada(arquivo);
  assert.deepEqual(r.imagens.map((i) => i.estado), ['ausente', 'ausente']);
});

test('sem link original fica explícito', async () => {
  const semLink = { ...piloto, fonte: { ...piloto.fonte, url: '' } };
  const { md } = await criarPratoria({ ...base, receita: semLink, pacote: 'texto' });
  assert.match(md, /fonte_url: \[sem link original\]/);
  const r = await abrirEntrada(md);
  assert.equal(interpretarReceita(r.textoReceita).receita.fonte.url, '');
});

test('danos são detectados: imagem alterada, receita editada, arquivo cortado', async () => {
  const { md } = await criarPratoria({ ...base, pacote: 'imagens', base64: true });
  const linhas = md.split('\n'); const i = linhas.findIndex((l) => /^[A-Za-z0-9+/]{76}$/.test(l));
  linhas[i] = (linhas[i][0] === 'A' ? 'B' : 'A') + linhas[i].slice(1);
  const r1 = await abrirEntrada(linhas.join('\n'));
  assert.equal(r1.imagens[0].integra, false);
  assert.ok(r1.avisos.some((a) => /danificada/.test(a)));
  const r2 = await abrirEntrada(md.replace('Sirva imediatamente.', 'Sirva gelada.'));
  assert.equal(r2.receitaIntegra, false);
  const cortado = md.slice(0, md.indexOf('<!-- PRATORIA:PROMPTS:INICIO -->') + 200);
  const r3 = await lerMd(cortado);
  assert.equal(r3.completo, false);
  assert.equal(interpretarReceita(r3.textoReceita).valido, true);
});

test('extensão não importa (zip renomeado) e arquivo antigo .pratoria.txt continua abrindo', async () => {
  const { arquivo } = await criarPratoria({ ...base, pacote: 'imagens' });
  const r = await abrirEntrada(new File([arquivo], 'qualquer.zip'));
  assert.equal(r.via, 'pacote');
  const antigo = '#PRATORIA v1\ntitulo: Ovo\n## PREPARACAO: Ovo\n### PASSOS\n1. Cozinhe.\n#FIM\n\n#IMAGEM image/webp\nAQID\n#FIM-IMAGEM\n';
  const r2 = await abrirEntrada(antigo);
  assert.equal(r2.imagens[0].nome, 'prato');
  assert.equal(interpretarReceita(r2.textoReceita).receita.titulo, 'Ovo');
});

test('tamanho do .md sem anexos (vai compactado no link)', async () => {
  const { md } = await criarPratoria({ ...base, pacote: 'texto' });
  const carga = await compactar(md);
  console.log('.md sem anexos:', md.length, 'caracteres → compactado no link:', carga.length);
});

test('link e QR levam o receita.md (sem anexos e sem prompts) e voltam inteiros', async () => {
  const { linkDoTexto } = await import('../src/core/compartilhar/link.js');
  const { qrsDaReceita } = await import('../src/core/compartilhar/qr.js');
  const { criarPratoria: criar } = await import('../src/core/pacote/pratoria.js');
  const { md } = await criar({ ...base, prompts: {}, pacote: 'texto' });
  const { url } = await linkDoTexto(md, { siteUrl: 'https://x.github.io/pratoria/' });
  const { conteudos } = await qrsDaReceita(piloto, { siteUrl: 'https://x.github.io/pratoria/', texto: md });
  console.log('link com o .md:', url.length, 'caracteres ·', conteudos.length, 'QRs');
  const r = await abrirEntrada(`veja: ${url}`);
  assert.equal(r.via, 'link');
  assert.equal(r.envelope.compartilhado_por, 'Allan');
  assert.equal(interpretarReceita(r.textoReceita).receita.titulo, piloto.titulo);
  assert.ok(url.length < 8000);
});
