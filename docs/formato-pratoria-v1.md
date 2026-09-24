# Formato PRATORIA v1

É o texto que o ChatGPT devolve e que o site lê **sem IA** (`src/core/formato/parser.js`).
Ele também é usado para copiar receitas, enviar pelo WhatsApp e fazer backup.
Exemplo completo: `src/data/receitas/salada-mediterranea-sardinha-grao-de-bico.pratoria.txt`.

## Quem preenche cada campo

| Grupo | Campos | Quem preenche | Para que serve no Pratoria |
|---|---|---|---|
| Rastreio | `usuario`, `gerado_em`, `prompt_versao` | o **site**, já escrito no prompt | id da receita; saber qual versão do prompt gerou o texto |
| | `gerado_por` | o **LLM** (nome e modelo) | histórico e qualidade |
| | `id` | o **site**, na importação | identidade única; viaja junto quando a receita é compartilhada |
| Essencial | `titulo`, `titulo_original`, `descricao` | LLM | exibição e busca (inclusive pelo nome original) |
| Classificação | `categoria` (lista fixa), `cozinha`, `refeicao` (lista), `tags` | LLM | filtros e cadernos |
| Quantidade | `rendimento` (texto), `porcoes` (número) | LLM | exibição; futuro ajuste de porções |
| Tempo | `tempo_preparo_min`, `tempo_cozimento_min`, `tempo_espera_min`, `tempo_total_min` | LLM | filtro "rápidas"; aviso de molho ou descanso antes de começar |
| Execução | `dificuldade`, `custo`, `equipamentos`, `temperatura_forno` | LLM | filtros; ilustrações de utensílios; aviso "precisa de forno" |
| Saúde | `dieta` (lista), `alergenos` (lista), `## NUTRICAO` | LLM | filtros; **sempre exibido como "estimado — confira os rótulos"** |
| Crédito | `fonte_site`, `fonte_autor`, `fonte_url`, `fonte_publicado_em`, `fonte_video`, `idioma_original` | LLM | crédito discreto; link para o original e o vídeo |
| Imagem | `visual` | LLM | alimenta o prompt de imagem |
| Foto original | `foto_original` (link direto da foto do site, ou vazio) | LLM | botão "Abrir a foto original" na etapa da foto; a imagem é salva e enviada pelo usuário |
| Compras | `## COMPRAS`: item \| quantidade para comprar \| seção do mercado — **obrigatória e primeira seção**, mesmo que repita os ingredientes (se faltar, o site monta a partir dos ingredientes) | LLM | lista no topo da receita e agrupada por seção do mercado |
| Preparo | `## PREPARACAO` → `NOTA`, `INGREDIENTES`, `PASSOS`, `DICAS` | LLM | página da receita e Modo Cozinhar |
| Extras | `## SUBSTITUICOES`, `VARIACOES`, `SERVIR`, `CONSERVACAO` | LLM | páginas extras do livro; "não tenho X" |
| Ilustrações | `## ILUSTRACOES`: ordem \| ingrediente \| como desenhar \| preparação:passo | LLM (até 6, 9 ou 12, conforme a preferência) | cartela a giz; prateleira que acumula os desenhos no livro |
| Adaptação | `ajustes:` | site, no prompt (ajustes pré-prontos) | avisa que a receita foi adaptada (ex.: `gramas e ml, 4 porções`) |
| Pessoal | `## ANOTACOES` | usuário | notas próprias; **não** vão no texto compartilhado |

O banco guarda, além do texto: favorita, avaliação, status (quero fazer / já fiz), vezes preparada, última vez, coleções, porções preferidas, imagem, texto original colado, datas, id de origem e quem enviou.

## Estrutura

```
#PRATORIA v1
id:                      (site)
usuario: Allan           (site, no prompt)
gerado_em: 2026-09-23T14:05:12-03:00   (site, no prompt)
gerado_por: ChatGPT GPT-5              (LLM)
prompt_versao: 2026-09-23.2            (site, no prompt)
titulo: …                (obrigatório)
… demais campos …
## NUTRICAO               - nutriente | valor
## COMPRAS                - item | quantidade | seção
## PREPARACAO: nome       (repete; ordem de execução; ≥ 1)
### NOTA | ### INGREDIENTES (- qtd | unidade | ingrediente | obs) | ### PASSOS (1. …) | ### DICAS
## SUBSTITUICOES          - ingrediente | substituto | obs
## VARIACOES | ## SERVIR | ## CONSERVACAO | ## ANOTACOES
#FIM
```

**Erros (impedem salvar):** falta título, não há preparação, uma preparação não tem passos.
**Avisos:** falta `#FIM` (resposta cortada), falta `fonte_url`, ingrediente sem `|`, campo desconhecido, valor fora das listas padrão, linhas ignoradas, lista de compras ausente (é gerada a partir dos ingredientes).
**Tolerâncias:** bloco de código, texto antes do marcador, cópia de markdown já renderizado, negrito, acentos opcionais, marcadores `- * • –`, listas `1.` e `1)`, frações `½ ¼ ¾`, `1 1/2`, `1½`, `0,5`, faixas `1 a 2` e `1-2`.

## Id da receita

`prt-` + 16 dígitos hexadecimais: os primeiros 64 bits do SHA-256 de
`usuario | titulo | gerado_em (convertido para UTC) | fonte_url` (a url fica vazia se não houver link).

- **O site calcula, não o LLM.** LLMs não calculam hash de forma confiável e nem sempre sabem a hora exata. Por isso o site escreve `usuario` e `gerado_em` no próprio prompt, o LLM só copia, e o site calcula o id quando a receita é colada.
- **O hex é uma impressão digital, não um código reversível.** Por isso usuário, título, data e link ficam gravados ao lado do id, e `verificarId()` confirma que eles batem com o hex.
- **Receita recebida de outra pessoa:** o id dela vira `idOrigem`, e a pessoa que recebe ganha um id novo, com o próprio nome e a hora da importação.
- **Recolar a própria receita** (por exemplo, de um backup) mantém o mesmo id.
- **Risco de colisão:** 64 bits bastam para bilhões de receitas; na prática, é zero.

## Sem link original
`fonte_url: [sem link original]`: nunca fica vazio no arquivo. O leitor converte o marcador em url vazia e não reclama.

Mudanças incompatíveis no formato → `#PRATORIA v2`, mantendo o leitor da v1.


## Prompts (etapa 7, só ChatGPT)

- **Com link** (`montarPromptReceita`): o ChatGPT lê a página, devolve o formato e o `foto_original`.
- **Texto livre** (`montarPromptTextoLivre`): o ChatGPT revisa inconsistências, faz até 5 perguntas se faltar algo importante e só depois devolve o formato. `fonte_url` vem como `[sem link original]`.
- **Foto** (`montarPromptImagem` / `montarPromptImagemDoLink`) e versão curta de até 480 caracteres para o Criador de Imagens do Bing (`montarPromptImagemCurto`).
- **Passos:** o prompt pede no máximo 90 caracteres por passo, o mesmo limite verde do formulário guiado.
- **Base64:** nunca vem na resposta do ChatGPT. Ele só existe dentro do `.pratoria` gerado pelo próprio app.
