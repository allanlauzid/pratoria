// Pratoria — modelos de prompt pré-prontos (sem IA no site).
// O site só preenche lacunas; quem executa é o ChatGPT, na conta do usuário.
// Mudou o texto? Aumente PROMPT_VERSAO (fica gravado em cada receita importada).

import { CATEGORIAS, REFEICOES, DIETAS, ALERGENOS, SECOES_MERCADO, NUTRIENTES } from './listas.js';
import { isoLocal } from '../id.js';
import { aplicarAjustesPrompt } from './ajustes.js';

export const PROMPT_VERSAO = '2026-09-24.2';
const CERCA = '```';

/** Aceita só http(s). Devolve a URL normalizada ou lança erro com mensagem para o usuário. */
export function validarUrlReceita(entrada) {
  let url;
  try { url = new URL(String(entrada ?? '').trim()); } catch { throw new Error('Isso não parece um link. Cole o endereço completo, começando com https://'); }
  if (!/^https?:$/.test(url.protocol)) throw new Error('Use um link que comece com http:// ou https://');
  url.hash = '';
  return url.toString();
}

const regrasComuns = (aj, secoesMercado) => `2. Português do Brasil, frases simples. Seja fiel: não invente ingredientes, quantidades, tempos nem passos.
3. Medidas brasileiras (xícara, colher de sopa, colher de chá, g, kg, ml, l, °C). Converta cups, oz, lb e °F.
4. Preparo anterior (massa, molho, grão cozido, marinada) vira outra PREPARACAO, na ordem de execução.
5. PASSOS: uma ação por passo, no imperativo, até 2 frases curtas (no máximo 90 caracteres), com tempo e temperatura no próprio passo.
6. Preparação com mais de 5 ingredientes: em NOTA, diga em que ordem eles entram.
7. INGREDIENTES: 4 campos com |, mesmo vazios: quantidade | unidade | ingrediente | observação. Quantidade em número ou fração (1, 1/2, 1 1/2, 1 a 2); vazia se "a gosto". Itens contáveis sem unidade (2 | | ovos |). Corte e preparo vão na observação.
8. COMPRAS é OBRIGATÓRIA e vem ANTES de tudo, mesmo que repita os ingredientes: tudo que precisa comprar, sem repetir, sem água: item | quantidade para comprar (embalagem de mercado) | seção. Seções: ${secoesMercado}.
9. Campos *_min: minutos em número (ou faixa "480 a 720"). tempo_espera_min = molho, descanso, fermentação, geladeira.
10. categoria (uma): ${CATEGORIAS.join('; ')}.
11. refeicao (uma ou mais): ${REFEICOES.join(', ')}.
12. dieta: só as que TODOS os ingredientes permitem: ${DIETAS.join(', ')}. alergenos: os presentes: ${ALERGENOS.join(', ')}.
13. NUTRICAO: só se a fonte informar, por porção (${NUTRIENTES.join(', ')}). Senão, apague a seção.
14. visual: uma frase do que se vê no prato pronto (ingredientes, cortes, cores), sem louça nem cenário.
15. gerado_por: ChatGPT e o modelo (ex.: ChatGPT GPT-5). Não altere usuario, gerado_em e prompt_versao.
16. Campo sem informação: deixe vazio. Seções opcionais sem conteúdo: apague. Não invente.
17. ILUSTRACOES: escolha até ${aj.ilustracoes} ingredientes mais visuais para desenhar a giz (sem sal, água, óleo). Uma linha cada, na ordem em que entram: ordem | ingrediente | como desenhar (ex.: meio limão com polpa aparente) | preparação:número do passo em que entra.`;

const blocoDeAjustes = (aj) => (aj.frases.length
  ? `\nAJUSTES DO USUÁRIO (aplique; têm prioridade sobre a fidelidade ao original)\n${aj.frases.map((f) => `- ${f}`).join('\n')}\n` : '');

const modelo = ({ usuario, geradoEm, aj, fonteUrl, fotoOriginal = '' }) => `${CERCA}
#PRATORIA v1
usuario: ${usuario}
gerado_em: ${geradoEm}
gerado_por:
prompt_versao: ${PROMPT_VERSAO}
${aj.tags.length ? `ajustes: ${aj.tags.join(', ')}\n` : ''}titulo:
titulo_original:
descricao:
categoria:
cozinha:
refeicao:
tags:
rendimento:
porcoes:
tempo_preparo_min:
tempo_cozimento_min:
tempo_espera_min:
tempo_total_min:
dificuldade: fácil, média ou difícil
custo: baixo, médio ou alto
equipamentos:
temperatura_forno:
dieta:
alergenos:
fonte_site:
fonte_autor:
fonte_url: ${fonteUrl}
fonte_publicado_em:
fonte_video:
idioma_original:
visual:
foto_original: ${fotoOriginal}

## COMPRAS
- item | quantidade para comprar | seção

## NUTRICAO
- nutriente | valor com unidade

## PREPARACAO: nome
### NOTA
frase
### INGREDIENTES
- quantidade | unidade | ingrediente | observação
### PASSOS
1. passo
### DICAS
- dica

## ILUSTRACOES
- 1 | ingrediente | como desenhar | preparação:passo

## SUBSTITUICOES
- ingrediente | substituto | observação
## VARIACOES
- variação
## SERVIR
- como servir, acompanhamentos
## CONSERVACAO
- geladeira, congelador, validade

#FIM
${CERCA}`;

/**
 * FORMA 1 — "tenho o link".
 * @param {string} entradaUrl link da receita
 * @param {{usuario?: string, agora?: Date, ajustes?: object}} [op]
 *   O site grava usuario e gerado_em no próprio prompt: o LLM só copia. O id é
 *   calculado pelo site na importação (LLMs não calculam hash com confiabilidade).
 */
export function montarPromptReceita(entradaUrl, op = {}) {
  const url = validarUrlReceita(entradaUrl);
  const usuario = String(op.usuario ?? '').trim() || 'sem nome';
  const geradoEm = isoLocal(op.agora ?? new Date());
  const aj = aplicarAjustesPrompt(op.ajustes);
  return `Converta a receita do link abaixo para o formato PRATORIA v1, que um site lê automaticamente. Siga as regras à risca.

LINK: ${url}

REGRAS
1. Leia a receita inteira no link. Se não conseguir acessar, não invente: peça que eu cole o texto da página.
${regrasComuns(aj, SECOES_MERCADO.join(', '))}
18. foto_original: o endereço direto (https://…jpg/webp/png) da foto principal do prato na página, se houver (ex.: a imagem de destaque). Senão, vazio.
${blocoDeAjustes(aj)}
Responda SOMENTE com um único bloco de código, sem texto antes ou depois, nesta estrutura:

${modelo({ usuario, geradoEm, aj, fonteUrl: url })}`;
}

/**
 * FORMA 2 — "vou digitar a receita" (linguagem livre).
 * O ChatGPT revisa inconsistências e, se faltar algo importante, pergunta antes de converter.
 * @param {string} texto receita escrita pelo usuário
 * @param {{usuario?: string, agora?: Date, ajustes?: object, titulo?: string}} [op]
 */
export function montarPromptTextoLivre(texto, op = {}) {
  const corpo = String(texto ?? '').trim();
  if (corpo.length < 20) throw new Error('Escreva a receita com um pouco mais de detalhe (ingredientes e modo de preparo).');
  const usuario = String(op.usuario ?? '').trim() || 'sem nome';
  const geradoEm = isoLocal(op.agora ?? new Date());
  const aj = aplicarAjustesPrompt(op.ajustes);
  const titulo = String(op.titulo ?? '').trim();
  return `Organize a receita que eu escrevi abaixo no formato PRATORIA v1, que um site lê automaticamente.

PRIMEIRO, REVISE
- Procure inconsistências: ingrediente usado no preparo que não está na lista (ou o contrário), quantidade faltando, tempo ou temperatura faltando, rendimento, ordem confusa.
- Se faltar algo IMPORTANTE, responda antes SOMENTE com até 5 perguntas curtas e numeradas e espere minha resposta.
- Se estiver claro (ou depois das minhas respostas), converta. O que você supuser, registre em NOTA da preparação correspondente.

MINHA RECEITA${titulo ? ` — ${titulo}` : ''}
"""
${corpo}
"""

REGRAS
1. Use só o que eu escrevi e o que eu responder. Pode corrigir a escrita e dividir passos longos.
${regrasComuns(aj, SECOES_MERCADO.join(', '))}
18. fonte_site e fonte_url: deixe como estão. fonte_autor: ${usuario}.
${blocoDeAjustes(aj)}
Quando for converter, responda SOMENTE com um único bloco de código, sem texto antes ou depois, nesta estrutura:

${modelo({ usuario, geradoEm, aj, fonteUrl: '[sem link original]' }).replace('fonte_site:\n', 'fonte_site: Receita de família\n')}`;
}

/** Grade da cartela conforme a quantidade de ilustrações. */
export function gradeDaCartela(n) {
  if (n <= 6) return { colunas: 3, linhas: 2 };
  if (n <= 9) return { colunas: 3, linhas: 3 };
  return { colunas: 4, linhas: 3 };
}

/**
 * Prompt da CARTELA de ilustrações a giz (ChatGPT).
 * O site recorta cada desenho pela transparência e pela posição na grade.
 */
export function montarPromptIlustracoes(receita) {
  const itens = (receita?.ilustracoes ?? []).slice().sort((a, b) => a.ordem - b.ordem).slice(0, 12);
  if (!itens.length) throw new Error('A receita não tem a seção ILUSTRACOES.');
  const { colunas, linhas } = gradeDaCartela(itens.length);
  const lista = itens.map((it, i) => `${i + 1}. ${it.ingrediente}${it.desenho ? ` — ${it.desenho}` : ''}`).join('\n');
  return `Gere UMA imagem: uma cartela de ilustrações de ingredientes, em grade de ${colunas} colunas × ${linhas} linhas, lida da esquerda para a direita e de cima para baixo, nesta ordem exata:

${lista}

ESTILO (obrigatório)
- Desenho a giz de cera / pastel seco, com textura e pigmento visíveis; traço observado e elegante, de ilustração gastronômica editorial. Nada infantil, nada de clip-art.
- Cores naturais de cada ingrediente. Sem contorno preto, sem sombra projetada.
- Cada ingrediente centralizado na sua casa, com bastante espaço vazio em volta: nenhum desenho pode encostar em outro nem na borda.
- SEM texto, SEM números, SEM rótulos, SEM moldura ou linhas de grade.
- Fundo 100% transparente (PNG com canal alfa). Se não for possível, fundo branco puro e liso (#FFFFFF), sem textura de papel.
- Casas vazias, se sobrarem, ficam vazias.
- Formato ${colunas >= 4 ? 'paisagem 1536×1024' : 'quadrado 1024×1024'}.`;
}

/**
 * Prompt de imagem (ChatGPT). Estilo fixo da "louça da casa",
 * calibrado pela referência imagens/foto_receita_salada.png.
 */
export function montarPromptImagem(receita) {
  const titulo = String(receita?.titulo ?? '').trim();
  if (!titulo) throw new Error('A receita precisa de título para gerar o prompt de imagem.');
  const visual = String(receita?.visual ?? '').trim();
  return `Gere uma imagem fotorrealista do prato pronto "${titulo}".${visual ? ` O que aparece no prato: ${visual}` : ''}

${ESTILO_IMAGEM}`;
}

const ESTILO_IMAGEM = `ESTILO (obrigatório)
- Servido em um bowl fundo de cerâmica artesanal (stoneware), esmalte off-white com pequenas pintinhas marrons e borda marrom sem esmalte. Se o prato não combinar com bowl (bolo, pão, bebida, peça assada), use louça equivalente no mesmo estilo de cerâmica rústica.
- Vista levemente de cima, câmera a 30–35°, prato inteiro visível e centralizado.
- Fundo 100% transparente (PNG com canal alfa). Se não for possível transparência real, use fundo branco puro e liso (#FFFFFF), sem xadrez desenhado. Sem mesa, toalha, cenário, sombra no chão, talheres, outros objetos ou texto.
- Margem livre de pelo menos 6% em todos os lados: nada pode encostar nas bordas da imagem.
- Formato paisagem 1536×1024.
- Luz natural suave, cores fiéis, aparência gastronômica editorial, ingredientes nítidos e reconhecíveis.
- Composição original, inspirada na receita: não copie a foto do site nem outras fotos existentes.`;

/** Imagem direto do link (antes de ter o texto): o ChatGPT lê a página para saber como é o prato. */
export function montarPromptImagemDoLink(entradaUrl) {
  const url = validarUrlReceita(entradaUrl);
  return `Leia a receita deste link e gere uma imagem fotorrealista do prato pronto, com os ingredientes e cortes que a receita descreve: ${url}

${ESTILO_IMAGEM}`;
}

/** Versão curta (≤ 480 caracteres) para o Criador de Imagens do Bing, que limita o tamanho do pedido. */
export function montarPromptImagemCurto(receita) {
  const titulo = String(receita?.titulo ?? '').trim();
  const visual = String(receita?.visual ?? '').trim();
  const base = `Foto realista do prato pronto "${titulo}"${visual ? `: ${visual}` : ''}. Em bowl de cerâmica artesanal off-white com pintinhas marrons e borda marrom, vista de cima a 30°, prato inteiro centralizado, fundo branco puro liso, sem mesa, talheres ou texto, luz natural suave, estilo gastronômico editorial.`;
  return base.length <= 480 ? base : `${base.slice(0, 477).replace(/\s+\S*$/, '')}…`;
}

// ---------------------------------------------------------------------------
// Microsoft: Bing Imagens (busca de referência) e Criador de Imagens do Bing.
// Bing Imagens: ?q= é o formato padrão. Criador: ?q= não é documentado — se o
// campo vier vazio, o prompt já foi copiado e é só colar.
// ---------------------------------------------------------------------------
export const linkBingImagens = (termo) => `https://www.bing.com/images/search?q=${encodeURIComponent(`${String(termo ?? '').trim()} receita`)}`;
export const linkBingCriador = (prompt) => `https://www.bing.com/images/create?q=${encodeURIComponent(prompt)}`;

// ---------------------------------------------------------------------------
// Destino dos prompts: SÓ ChatGPT (texto, imagem e ilustrações), decisão de 24/09.
// O prompt vai embutido no link (?q=, não oficial). Links muito longos podem
// falhar: acima de LIMITE_LINK o botão avisa para usar "Copiar prompt".
// ---------------------------------------------------------------------------

export const LIMITE_LINK = 7800;
export const DESTINOS = {
  chatgpt: { rotulo: 'ChatGPT', link: (q) => `https://chatgpt.com/?q=${q}` },
};

/**
 * Botões a exibir junto de um prompt: ChatGPT + Copiar.
 * @returns {Array<{id, rotulo, href?, texto?, longo?: boolean}>}
 */
export function acoesDoPrompt(prompt) {
  const href = DESTINOS.chatgpt.link(encodeURIComponent(prompt));
  return [
    { id: 'chatgpt', rotulo: 'Abrir no ChatGPT', href, longo: href.length > LIMITE_LINK },
    { id: 'copiar', rotulo: 'Copiar prompt', texto: prompt },
  ];
}
