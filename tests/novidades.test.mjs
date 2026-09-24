import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { trechosComTempo, rotuloDuracao } from '../src/core/tempos.js';
import { ingredienteDeTexto, linhas } from '../src/core/formato/texto-livre.js';
import { formularioDaReceita, receitaDoFormulario, corDoPasso, dividirPasso, ingredientesDasCompras, comLinhaExtra, linhaCompra, LIMITE_PASSO } from '../src/core/editor.js';
import { interpretarReceita } from '../src/core/formato/parser.js';
import { encontrarDuplicada } from '../src/core/duplicadas.js';
import { lembrarBackup, tamanhoLegivel } from '../src/core/lembretes.js';
import { cardapioVazio, adicionarAoDia, tirarDoDia, receitasDoCardapio, normalizarCardapio, diaDeHoje } from '../src/core/cardapio.js';

const piloto = interpretarReceita(readFileSync(new URL('../src/data/receitas/salada-mediterranea-sardinha-grao-de-bico.pratoria.txt', import.meta.url), 'utf8')).receita;

test('tempos nos passos', () => {
  const t = trechosComTempo('Depois que pegar pressão, cozinhe por 12 a 15 minutos.');
  const c = t.find((x) => x.tempo);
  assert.equal(c.texto, '12 a 15 minutos');
  assert.deepEqual([c.tempo.min, c.tempo.max], [720, 900]);
  assert.equal(c.tempo.rotulo, '12 min–15 min');
  assert.equal(t.map((x) => x.texto).join(''), 'Depois que pegar pressão, cozinhe por 12 a 15 minutos.');
  assert.equal(trechosComTempo('Deixe de molho por 8 a 12 horas.').find((x) => x.tempo).tempo.min, 8 * 3600);
  assert.equal(trechosComTempo('Asse por meia hora').find((x) => x.tempo).tempo.min, 1800);
  assert.equal(trechosComTempo('Forno a 180 °C por 40 min.').find((x) => x.tempo).tempo.min, 2400);
  assert.equal(trechosComTempo('Bata por 30 segundos').find((x) => x.tempo).tempo.min, 30);
  assert.equal(trechosComTempo('Cozinhe por 1 hora e meia').find((x) => x.tempo).tempo.min, 5400);
  assert.ok(!trechosComTempo('Use 2 colheres de sopa e 3 ovos.').some((x) => x.tempo));
  assert.equal(rotuloDuracao(5400), '1 h 30 min');
});

test('ingrediente escrito à mão', () => {
  const a = ingredienteDeTexto('1 1/2 xícara de farinha de trigo, peneirada');
  assert.deepEqual([a.quantidade.min, a.unidade, a.item, a.obs], [1.5, 'xícara', 'farinha de trigo', 'peneirada']);
  const b = ingredienteDeTexto('2 dentes de alho, amassados');
  assert.deepEqual([b.quantidade.min, b.unidade, b.item], [2, 'dentes', 'alho']);
  const c = ingredienteDeTexto('100g de sardinha');
  assert.deepEqual([c.quantidade.min, c.unidade, c.item], [100, 'g', 'sardinha']);
  const d = ingredienteDeTexto('sal a gosto');
  assert.equal(d.quantidade, null); assert.equal(d.item, 'sal a gosto');
  const e = ingredienteDeTexto('½ cebola pequena, bem picada');
  assert.deepEqual([e.quantidade.min, e.unidade, e.item, e.obs], [0.5, '', 'cebola pequena', 'bem picada']);
  const f = ingredienteDeTexto('1 a 2 colheres de sopa de salsa fresca');
  assert.deepEqual([f.quantidade.min, f.quantidade.max, f.unidade, f.item], [1, 2, 'colheres de sopa', 'salsa fresca']);
  assert.equal(ingredienteDeTexto('1 limão').item, 'limão');
  assert.deepEqual(linhas('1. Lave\n\n- Corte\n  • Sirva '), ['Lave', 'Corte', 'Sirva']);
});

test('editor: ida e volta sem perder a receita', () => {
  const f = formularioDaReceita(piloto);
  const { resultado } = receitaDoFormulario(f, piloto);
  assert.ok(resultado.valido, resultado.erros.join('; '));
  const r = resultado.receita;
  assert.equal(r.id, piloto.id);
  assert.equal(r.titulo, piloto.titulo);
  assert.equal(r.preparacoes.length, 2);
  for (const [k, p] of piloto.preparacoes.entries()) {
    assert.deepEqual(r.preparacoes[k].ingredientes.map((i) => [i.quantidade?.min ?? null, i.item]), p.ingredientes.map((i) => [i.quantidade?.min ?? null, i.item]));
    assert.deepEqual(r.preparacoes[k].passos, p.passos);
  }
  assert.equal(r.compras.length, piloto.compras.length, 'lista de compras original mantida');
  assert.equal(r.ilustracoes.length, 9);
  assert.equal(r.tempos.espera.min, 480);
});

test('formulário guiado: receita nova com etapas', () => {
  const f = formularioDaReceita();
  assert.equal(f.compras.length, 1, 'começa com um campo');
  f.titulo = 'Ovo mexido'; f.porcoes = '1'; f.tempoPreparo = '5';
  f.compras = comLinhaExtra([{ item: 'ovos', quantidade: '1 dúzia', secao: 'frios e laticínios' }, { item: 'manteiga', quantidade: '1 tablete', secao: '' }], linhaCompra);
  assert.equal(f.compras.length, 3, 'sempre sobra um campo vazio no fim');
  f.etapas[0].ingredientes = ingredientesDasCompras(f.compras);
  assert.deepEqual(f.etapas[0].ingredientes.map((i) => i.item), ['ovos', 'manteiga', '']);
  f.etapas[0].ingredientes[0].quantidade = '2';
  f.etapas[0].passos = ['Derreta a manteiga em fogo baixo.', 'Junte os ovos e mexa por 2 minutos.', ''];
  const { resultado, texto } = receitaDoFormulario(f, null, { usuario: 'Allan', agora: '2026-09-24T10:00:00-03:00' });
  assert.ok(resultado.valido, resultado.erros.join('; '));
  assert.match(texto, /fonte_url: \[sem link original\]/);
  assert.ok(texto.indexOf('## COMPRAS') < texto.indexOf('## PREPARACAO'));
  assert.deepEqual(resultado.receita.compras.map((c) => c.quantidade), ['1 dúzia', '1 tablete']);
  assert.equal(resultado.receita.preparacoes[0].ingredientes[0].quantidade.min, 2);
  assert.equal(resultado.receita.preparacoes[0].passos.length, 2);
  const vazio = receitaDoFormulario(formularioDaReceita()).resultado;
  assert.ok(!vazio.valido);
  assert.ok(vazio.erros.includes('Dê um nome para a receita.'));
});

test('formulário guiado: tamanho dos passos (calibrado na salada)', () => {
  for (const p of piloto.preparacoes.flatMap((x) => x.passos)) assert.equal(corDoPasso(p), 'verde', p);
  assert.equal(corDoPasso('x'.repeat(LIMITE_PASSO.verde + 1)), 'amarelo');
  assert.equal(corDoPasso('x'.repeat(LIMITE_PASSO.amarelo + 1)), 'vermelho');
  const longo = 'Coloque o grão-de-bico na panela de pressão com bastante água nova e o sal. Depois que pegar pressão, cozinhe por 12 a 15 minutos e desligue o fogo.';
  const [a, b] = dividirPasso(longo);
  assert.ok(a.length <= LIMITE_PASSO.verde && b.length <= LIMITE_PASSO.verde, `${a} | ${b}`);
  assert.match(b, /^D/);
  const f = formularioDaReceita(); f.titulo = 'X'; f.etapas[0].passos = ['y'.repeat(200)];
  assert.ok(!receitaDoFormulario(f).resultado.valido);
});

test('duplicadas', () => {
  const regs = [{ id: 'prt-1', dados: { id: 'prt-1', fonte: { url: 'https://site.com/a#x' } } }, { id: 'prt-2', dados: { id: 'prt-2', idOrigem: 'prt-9', fonte: {} } }];
  assert.equal(encontrarDuplicada(regs, { id: 'prt-1' }).motivo, 'id');
  assert.equal(encontrarDuplicada(regs, { id: 'prt-9' }).registro.id, 'prt-2');
  assert.equal(encontrarDuplicada(regs, { id: 'prt-7', fonte: { url: 'https://site.com/a' } }).motivo, 'link');
  assert.equal(encontrarDuplicada(regs, { id: 'prt-7', fonte: { url: '' } }), null);
});

test('lembrete de backup', () => {
  const agora = new Date('2026-09-24T12:00:00Z');
  assert.equal(lembrarBackup({ receitas: 5, agora }).mostrar, true);
  assert.equal(lembrarBackup({ receitas: 3, agora }).mostrar, false);
  assert.equal(lembrarBackup({ receitas: 3, primeiraEm: '2026-08-01T00:00:00Z', agora }).mostrar, true);
  assert.equal(lembrarBackup({ receitas: 12, ultimo: { em: '2026-09-20T00:00:00Z', receitas: 7 }, agora }).mostrar, true);
  assert.equal(lembrarBackup({ receitas: 8, ultimo: { em: '2026-09-20T00:00:00Z', receitas: 7 }, agora }).mostrar, false);
  assert.equal(lembrarBackup({ receitas: 8, ultimo: { em: '2026-08-01T00:00:00Z', receitas: 7 }, agora }).mostrar, true);
  assert.equal(lembrarBackup({ receitas: 20, adiadoAte: '2026-09-30T00:00:00Z', agora }).mostrar, false);
  assert.equal(tamanhoLegivel(1536000), '1,5 MB');
});

test('cardápio', () => {
  let c = cardapioVazio();
  c = adicionarAoDia(c, 'seg', 'a'); c = adicionarAoDia(c, 'seg', 'a'); c = adicionarAoDia(c, 'qua', 'b'); c = adicionarAoDia(c, 'sex', 'a');
  assert.deepEqual(c.dias.seg, ['a']);
  assert.deepEqual(receitasDoCardapio(c), ['a', 'b']);
  c = tirarDoDia(c, 'seg', 'a');
  assert.deepEqual(normalizarCardapio(c, new Set(['b'])).dias.sex, []);
  assert.equal(diaDeHoje(new Date('2026-09-24T12:00:00')), 'qui');
});

test('cronômetros da página do livro', async () => {
  const { cronometrosDosItens } = await import('../src/core/tempos.js');
  const itens = [{ tipo: 'passo', n: 1, texto: 'Lave.' }, { tipo: 'passo', n: 2, texto: 'Asse por 15 min no forno.' }, { tipo: 'dica', texto: 'por 5 min' }, { tipo: 'passo', n: 3, texto: 'Descanse 10 minutos e depois 5 minutos.' }, { tipo: 'passo', n: 4, texto: '1 hora' }];
  const c = cronometrosDosItens(itens);
  assert.deepEqual(c.map((x) => [x.n, x.tempo.min]), [[2, 900], [3, 600]]);
});

test('texto para fala e roteiros', async () => {
  const { textoParaFala, roteiroDaPagina, roteiroCompleto } = await import('../src/core/fala.js');
  assert.equal(textoParaFala('½ xícara de grão-de-bico seco'), 'meia xícara de grão-de-bico seco');
  assert.equal(textoParaFala('1½ colher de sopa de suco'), '1 e meia colher de sopa de suco');
  assert.equal(textoParaFala('1/2 limão'), 'meio limão');
  assert.equal(textoParaFala('¼ colher de chá de sal'), 'um quarto de colher de chá de sal');
  assert.equal(textoParaFala('Asse a 180 °C por 40 min.'), 'Asse a 180 graus por 40 minutos.');
  assert.equal(textoParaFala('100 g de sardinha'), '100 gramas de sardinha');
  const pg = { tipo: 'preparo', prep: 0, parte: 1, itens: [{ tipo: 'passo', n: 1, texto: 'Lave o grão-de-bico' }, { tipo: 'dica', texto: 'Use água fria' }] };
  assert.deepEqual(roteiroDaPagina(pg, piloto), ['Preparo: Grão-de-bico.', 'Passo 1. Lave o grão-de-bico.', 'Dica: Use água fria.']);
  assert.deepEqual(roteiroDaPagina({ tipo: 'guia' }, piloto), []);
  const tudo = roteiroCompleto(piloto);
  assert.equal(tudo[0], 'Salada Mediterrânea de Sardinha com Grão-de-bico.');
  assert.ok(tudo.some((t) => t.startsWith('Passo 9.')));
});

test('avisos do cronômetro', async () => {
  const { avisosDoCronometro, nivelDeAlerta, ordenarPorRestante } = await import('../src/core/alertas.js');
  assert.deepEqual(avisosDoCronometro(900).map((a) => [a.seg, a.toques]), [[300, 1], [120, 1], [60, 2], [30, 2]]);
  assert.deepEqual(avisosDoCronometro(180).map((a) => a.seg), [60, 30]);
  assert.deepEqual(avisosDoCronometro(300).map((a) => a.seg), [60, 30]);
  assert.deepEqual(avisosDoCronometro(60).map((a) => a.seg), [30]);
  assert.deepEqual(avisosDoCronometro(20), []);
  assert.equal(nivelDeAlerta(119), 'amarelo');
  assert.equal(nivelDeAlerta(45), 'laranja');
  assert.equal(nivelDeAlerta(10), 'vermelho');
  assert.equal(nivelDeAlerta(500), null);
  const l = [{ id: 'a', r: 90 }, { id: 'b', r: 10 }, { id: 'c', r: 400 }];
  assert.deepEqual(ordenarPorRestante(l, (x) => x.r).map((x) => x.id), ['b', 'a', 'c']);
});
