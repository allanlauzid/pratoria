import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import jsQR from 'jsqr';
import { interpretarReceita } from '../src/core/formato/parser.js';
import { compactar, descompactar } from '../src/core/compartilhar/compactar.js';
import { linkDaReceita, textoDoLink, ehLinkDeReceita } from '../src/core/compartilhar/link.js';
import { arquivoDaReceita, lerArquivoRecebido, conteudoDoArquivo } from '../src/core/compartilhar/arquivo.js';
import { qrsDaReceita, matrizDoQR, ColetorQR, svgDoQR } from '../src/core/compartilhar/qr.js';

const piloto = interpretarReceita(readFileSync(new URL('../src/data/receitas/salada-mediterranea-sardinha-grao-de-bico.pratoria.txt', import.meta.url), 'utf8')).receita;
piloto.anotacoes = ['nota secreta'];
const SITE = 'https://pratoria.app';
const semAnot = (r) => ({ ...r, anotacoes: [] });

test('compactação: ida e volta, acentos e detecção de corrupção', async () => {
  const t = 'Pão de queijo — ½ xícara, 180 °C, ação ç ã é';
  assert.equal(await descompactar(await compactar(t)), t);
  const c = await compactar('x'.repeat(500));
  await assert.rejects(descompactar(c.slice(0, -4)));
});

test('opção 1: link com a receita dentro', async () => {
  const { url, tamanho, longo } = await linkDaReceita(piloto, { siteUrl: SITE + '/' });
  console.log('link da receita-piloto:', tamanho, 'caracteres');
  assert.ok(url.startsWith('https://pratoria.app/#r1.z'));
  assert.equal(longo, false);
  assert.ok(ehLinkDeReceita(url));
  const texto = await textoDoLink(url);
  assert.ok(!texto.includes('nota secreta'));
  assert.deepEqual(interpretarReceita(texto).receita, semAnot(piloto));
  assert.equal(await textoDoLink(url.split('#')[1]), texto);            // só o hash
  await assert.rejects(textoDoLink('https://pratoria.app/#/receita/x'));
});

test('opção 2: arquivo .pratoria.txt com imagem embutida', async () => {
  const imagem = new Blob([new Uint8Array(3000).map((_, i) => i % 251)], { type: 'image/webp' });
  const arquivo = await arquivoDaReceita(piloto, { imagem });
  assert.equal(arquivo.name, 'salada-mediterranea-de-sardinha-com-grao-de-bico.pratoria.txt');
  assert.equal(arquivo.type, 'text/plain');
  const { texto, imagem: img } = await lerArquivoRecebido(arquivo);
  assert.deepEqual(interpretarReceita(texto).receita, semAnot(piloto));
  assert.equal(img.type, 'image/webp');
  assert.deepEqual(new Uint8Array(await img.arrayBuffer()), new Uint8Array(await imagem.arrayBuffer()));
  // o arquivo inteiro colado como texto também funciona (parser para no #FIM)
  const { erros, avisos } = interpretarReceita(await conteudoDoArquivo(piloto, { imagem }));
  assert.deepEqual(erros, []); assert.deepEqual(avisos, []);
  // sem imagem
  assert.equal((await lerArquivoRecebido(await conteudoDoArquivo(piloto))).imagem, null);
});

/** Desenha a matriz em pixels e lê com jsQR — o mesmo leitor usado no iPhone. */
function lerComoCamera(conteudo, escala = 4) {
  const { data, size } = matrizDoQR(conteudo);
  const w = size * escala, px = new Uint8ClampedArray(w * w * 4);
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const v = data[Math.floor(y / escala)][Math.floor(x / escala)] ? 0 : 255, o = (y * w + x) * 4;
    px[o] = px[o + 1] = px[o + 2] = v; px[o + 3] = 255;
  }
  return jsQR(px, w, w)?.data ?? null;
}

test('opção 4: QRs gerados são lidos e remontam a receita (fora de ordem, com repetição)', async () => {
  const { tipo, conteudos } = await qrsDaReceita(piloto, { siteUrl: SITE });
  console.log('QR:', tipo, conteudos.length, 'código(s)');
  const coletor = new ColetorQR();
  const ordem = [...conteudos.keys()].reverse();
  ordem.splice(1, 0, ordem[0]); // lê um repetido
  let final;
  for (const i of ordem) {
    const lido = lerComoCamera(conteudos[i]);
    assert.equal(lido, conteudos[i], `QR ${i + 1} ilegível`);
    final = await coletor.adicionar(lido);
    if (final.estado !== 'completo') assert.equal(final.estado, 'parcial');
  }
  assert.equal(final.estado, 'completo');
  assert.deepEqual(interpretarReceita(final.texto).receita, semAnot(piloto));
  assert.match(svgDoQR(conteudos[0]), /^<svg/);
});

test('opção 4: receita curta vira 1 QR com o link (abre pela câmera comum)', async () => {
  const curta = interpretarReceita('#PRATORIA v1\ntitulo: Ovo\n## PREPARACAO: Ovo\n### PASSOS\n1. Cozinhe 9 min.\n#FIM').receita;
  const { tipo, conteudos } = await qrsDaReceita(curta, { siteUrl: SITE });
  assert.equal(tipo, 'link');
  assert.ok(conteudos[0].startsWith(SITE + '/#r1.'));
  const r = await new ColetorQR().adicionar(lerComoCamera(conteudos[0]));
  assert.equal(interpretarReceita(r.texto).receita.titulo, 'Ovo');
});

test('coletor ignora QRs estranhos e recomeça ao trocar de receita', async () => {
  const c = new ColetorQR();
  assert.equal((await c.adicionar('https://google.com')).estado, 'ignorado');
  const r = await c.adicionar('PRT1/1/3/aaaaaaaa/abc');
  assert.deepEqual(r, { estado: 'parcial', recebidos: 1, total: 3, faltam: [2, 3] });
  const r2 = await c.adicionar('PRT1/2/2/bbbbbbbb/abc');
  assert.deepEqual(r2, { estado: 'parcial', recebidos: 1, total: 2, faltam: [1] });
});

test('receber: link, arquivo e texto colado entram pela mesma porta', async () => {
  const { receber } = await import('../src/core/compartilhar/receber.js');
  const { url } = await linkDaReceita(piloto, { siteUrl: SITE });
  assert.equal((await receber(`Olha essa: ${url} 😋`)).via, 'link');
  const arq = await arquivoDaReceita(piloto, { imagem: new Blob([new Uint8Array([9, 9])], { type: 'image/jpeg' }) });
  const r = await receber(arq);
  assert.equal(r.via, 'arquivo'); assert.equal(r.imagem.type, 'image/jpeg');
  assert.equal(interpretarReceita((await receber(await conteudoDoArquivo(piloto))).texto).receita.titulo, piloto.titulo);
});
