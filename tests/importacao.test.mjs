import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpretarReceita } from '../src/core/formato/parser.js';
import { serializarReceita } from '../src/core/formato/serializar.js';
import { montarPromptReceita, montarPromptImagem, montarPromptTextoLivre, montarPromptImagemDoLink, montarPromptImagemCurto, linkBingImagens, linkBingCriador, acoesDoPrompt, validarUrlReceita, PROMPT_VERSAO } from '../src/core/import/prompts.js';
import { prepararParaCaderno } from '../src/core/import/importar.js';
import { gerarId, verificarId, pareceId, textoCanonicoId } from '../src/core/id.js';
import { textoParaCompartilhar, textoParaCopiar } from '../src/core/compartilhar/compartilhar.js';
import { ilustracoesDaReceita, ilustracaoDoIngrediente, utensiliosDoPasso } from '../src/core/ilustracoes.js';

const piloto = readFileSync(new URL('../src/data/receitas/salada-mediterranea-sardinha-grao-de-bico.pratoria.txt', import.meta.url), 'utf8');
const AGORA = new Date('2026-09-23T17:05:12Z');

test('id: formato, estabilidade e sensibilidade', async () => {
  const base = { usuario: 'Allan', titulo: 'Bolo de Milho', momento: '2026-09-23T14:05:12-03:00', url: 'https://ex.com/bolo#topo' };
  const id = await gerarId(base);
  assert.ok(pareceId(id), id);
  assert.equal(id, await gerarId({ ...base, usuario: '  allan ', url: 'https://ex.com/bolo' })); // normaliza
  assert.equal(id, await gerarId({ ...base, momento: '2026-09-23T17:05:12Z' }));             // mesmo instante
  assert.notEqual(id, await gerarId({ ...base, momento: '2026-09-23T14:05:13-03:00' }));
  assert.notEqual(id, await gerarId({ ...base, url: '' }));
  assert.ok(await verificarId(id, base));
  assert.ok(!(await verificarId(id, { ...base, titulo: 'Outro' })));
  assert.match(textoCanonicoId({ ...base, url: '' }), /\n$/);
});

test('prompt: grava usuario, momento e versão; LLM só copia', () => {
  const p = montarPromptReceita('https://ex.com/receita#comentarios', { usuario: 'Allan', agora: AGORA });
  assert.match(p, /usuario: Allan\n/);
  assert.match(p, /gerado_em: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d\n/);
  assert.match(p, new RegExp(`prompt_versao: ${PROMPT_VERSAO.replace(/\./g, '\\.')}\\n`));
  assert.match(p, /fonte_url: https:\/\/ex\.com\/receita\n/);
  // o modelo vazio do prompt é lido pelo parser sem campos desconhecidos
  const modelo = p.split('```')[1];
  const { avisos } = interpretarReceita(modelo);
  assert.ok(!avisos.some((a) => /desconhecido/.test(a)), avisos.join(' | '));
});

test('prompt cabe numa URL razoável', () => {
  const p = montarPromptReceita('https://www.tudogostoso.com.br/receita/12345-bolo-de-milho-cremoso.html', { usuario: 'Allan', agora: AGORA });
  const { href } = acoesDoPrompt(p)[0];
  console.log('prompt:', p.length, 'caracteres | link ChatGPT:', href.length, 'caracteres');
  assert.ok(href.length < 8000, `link com ${href.length} caracteres`);
});

test('destino: só ChatGPT, sempre com copiar; Microsoft para imagens', () => {
  assert.deepEqual(acoesDoPrompt('x').map((a) => a.id), ['chatgpt', 'copiar']);
  assert.equal(acoesDoPrompt('olá & tal').at(-1).texto, 'olá & tal');
  assert.match(acoesDoPrompt('a b')[0].href, /^https:\/\/chatgpt\.com\/\?q=a%20b$/);
  assert.equal(acoesDoPrompt('x'.repeat(9000))[0].longo, true);
  assert.throws(() => validarUrlReceita('receita de bolo'));
  assert.throws(() => validarUrlReceita('javascript:alert(1)'));
  assert.match(montarPromptImagem({ titulo: 'Bolo', visual: 'fatia' }), /transparente.*branco puro/s);
  assert.match(montarPromptImagemDoLink('https://ex.com/r'), /https:\/\/ex\.com\/r/);
  assert.ok(montarPromptImagemCurto({ titulo: 'X'.repeat(300), visual: 'y'.repeat(300) }).length <= 480);
  assert.equal(linkBingImagens('Bolo de fubá'), 'https://www.bing.com/images/search?q=Bolo%20de%20fub%C3%A1%20receita');
  assert.match(linkBingCriador('um prato'), /^https:\/\/www\.bing\.com\/images\/create\?q=um%20prato$/);
});

test('prompt de texto livre: revisa, pergunta e usa o mesmo formato', () => {
  const p = montarPromptTextoLivre('Bolo da vó: 3 ovos, 2 xícaras de farinha. Bata tudo e asse.', { usuario: 'Allan', agora: AGORA, titulo: 'Bolo da vó' });
  assert.match(p, /até 5 perguntas/);
  assert.match(p, /fonte_url: \[sem link original\]/);
  assert.match(p, /3 ovos, 2 xícaras/);
  assert.match(p, /COMPRAS é OBRIGATÓRIA/);
  const { avisos } = interpretarReceita(p.split('```')[1]);
  assert.ok(!avisos.some((a) => /desconhecido/.test(a)), avisos.join(' | '));
  assert.throws(() => montarPromptTextoLivre('curto'));
});

test('prompt de link: compras primeiro e foto_original', () => {
  const p = montarPromptReceita('https://ex.com/r', { usuario: 'A', agora: AGORA });
  const m = p.split('```')[1];
  assert.ok(m.indexOf('## COMPRAS') < m.indexOf('## PREPARACAO'));
  assert.match(m, /\nfoto_original: \n/);
  const r = interpretarReceita('#PRATORIA v1\ntitulo: X\nfoto_original: https://img.ex.com/a.jpg\n## PREPARACAO: A\n### PASSOS\n1. a\n#FIM').receita;
  assert.equal(r.fotoOriginal, 'https://img.ex.com/a.jpg');
  assert.match(serializarReceita(r), /foto_original: https:\/\/img\.ex\.com\/a\.jpg/);
});

test('importação nova: id calculado a partir do momento do prompt', async () => {
  const r = interpretarReceita(piloto.replace('usuario: Pratoria', 'usuario: Allan')).receita;
  const pronta = await prepararParaCaderno(r, { usuario: 'Allan', agora: AGORA });
  assert.ok(pareceId(pronta.id));
  assert.equal(pronta.idOrigem, '');
  assert.ok(await verificarId(pronta.id, { usuario: 'Allan', titulo: r.titulo, momento: r.geradoEm, url: r.fonte.url }));
});

test('receita recebida de outra pessoa: novo id, origem preservada', async () => {
  const daMaria = await prepararParaCaderno(interpretarReceita(piloto.replace('usuario: Pratoria', 'usuario: Maria')).receita, { usuario: 'Maria', agora: AGORA });
  const texto = textoParaCompartilhar(daMaria, { siteUrl: 'https://pratoria.app' });
  assert.match(texto, /^Receita: Salada/);
  const recebida = await prepararParaCaderno(interpretarReceita(texto).receita, { usuario: 'Allan', agora: new Date('2026-09-24T10:00:00Z') });
  assert.equal(recebida.idOrigem, daMaria.id);
  assert.equal(recebida.recebidaDe, 'Maria');
  assert.equal(recebida.usuario, 'Allan');
  assert.notEqual(recebida.id, daMaria.id);
  // recolar a própria receita mantém o id
  const recolada = await prepararParaCaderno(interpretarReceita(textoParaCopiar(recebida)).receita, { usuario: 'Allan', agora: AGORA });
  assert.equal(recolada.id, recebida.id);
});

test('ilustrações automáticas', () => {
  assert.equal(ilustracaoDoIngrediente('pimenta-do-reino moída na hora'), 'pimenta');
  assert.equal(ilustracaoDoIngrediente('Cebola roxa'), 'cebola');
  assert.equal(ilustracaoDoIngrediente('cebolinha'), 'cebolinha');
  assert.equal(ilustracaoDoIngrediente('salsa fresca'), 'salsa');
  assert.equal(ilustracaoDoIngrediente('grão-de-bico cozido'), 'grao-de-bico');
  assert.equal(ilustracaoDoIngrediente('quinoa'), null);
  assert.deepEqual(utensiliosDoPasso('Depois que pegar pressão, cozinhe por 12 a 15 minutos.').sort(), ['panela', 'panela-de-pressao', 'relogio']);
  const { progressao } = ilustracoesDaReceita(interpretarReceita(piloto).receita);
  assert.deepEqual(progressao, ['grao-de-bico', 'sal', 'tomate', 'pepino', 'cebola', 'azeitona', 'alcaparra', 'sardinha', 'limao', 'salsa', 'azeite', 'pimenta']);
});

test('ajustes pré-prontos entram no prompt e no campo ajustes', async () => {
  const { aplicarAjustesPrompt } = await import('../src/core/import/ajustes.js');
  assert.deepEqual(aplicarAjustesPrompt({}).frases, []);
  const tudo = { detalhe: 'iniciante', linguagem: 'tecnica', medidas: 'metricas', porcoes: 4, dieta: ['sem glúten', 'vegana'], semEquipamento: ['forno'], tempero: 'reduzido', extras: ['antecipado', 'servir', 'conservacao', 'nutricao'], ilustracoes: 12 };
  const p = montarPromptReceita('https://www.tudogostoso.com.br/receita/12345-bolo.html', { usuario: 'Allan', agora: AGORA, ajustes: tudo });
  assert.match(p, /AJUSTES DO USUÁRIO/);
  assert.match(p, /Converta a receita para 4 porções/);
  assert.match(p, /ajustes: passos para iniciante, linguagem técnica, gramas e ml, menos sal e açúcar, 4 porções, adaptada: sem glúten, vegana, sem forno\n/);
  assert.match(p, /até 12 ingredientes/);
  const { href } = acoesDoPrompt(p)[0];
  console.log('link ChatGPT com TODOS os ajustes:', href.length, 'caracteres');
  assert.ok(href.length < 9000);
  // o modelo com ajustes continua legível pelo parser
  const { avisos } = interpretarReceita(p.split('```')[1]);
  assert.ok(!avisos.some((a) => /desconhecido/.test(a)), avisos.join(' | '));
});

test('seção ILUSTRACOES: leitura e ida e volta', () => {
  const t = '#PRATORIA v1\ntitulo: X\n## PREPARACAO: Salada\n### PASSOS\n1. a\n## ILUSTRACOES\n- 1 | tomate | meio tomate | Salada:1\n- 2 | limão | fatias | Salada passo 4\n- salsa\n#FIM';
  const r = interpretarReceita(t, { origem: 'manual' }).receita;
  assert.deepEqual(r.ilustracoes[0], { ordem: 1, ingrediente: 'tomate', desenho: 'meio tomate', onde: { preparacao: 'Salada', passo: 1 } });
  assert.deepEqual(r.ilustracoes[1].onde, { preparacao: 'Salada', passo: 4 });
  assert.equal(r.ilustracoes[2].ingrediente, 'salsa');
  assert.deepEqual(interpretarReceita(serializarReceita(r)).receita.ilustracoes, r.ilustracoes);
});
