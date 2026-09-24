# Pratoria — proposta: arquivo .pratoria/.md, UX mobile→desktop, análise e design

Versão 1 · 23/09/2026 · para aprovação do Allan

---

## 1. Decisões registradas nesta rodada

- **Compressão:** o zip usa a `fflate`.
- **Preferências gerais** (ajustes do prompt, ajustes da plataforma e ajustes de imagem):
  - ficam **sempre no aparelho**;
  - com conta, também sincronizam com o Supabase;
  - a página indica se estão sincronizadas.
- **Todos os ajustes são gerais,** valem para qualquer receita.
- **Arquivo exportado:** sempre um `.zip` com extensão **`.pratoria`**.
  - O usuário **não** é informado de que é um zip.
  - O PWA reconhece pelo conteúdo, e não pela extensão.
- **Base64:** fica dentro do `.md` se o usuário ligar a opção ao exportar.
- **O arquivo leva** o nome de quem compartilhou e o momento em que foi gerado.

---

## 2. Layout do `.md`

### 2.1 Princípios de segurança

1. **Duas camadas separadas:**
   - **ENVELOPE:** quem compartilhou, quando o arquivo foi gerado e o que vai dentro. Muda a cada exportação.
   - **RECEITA:** o conteúdo em si. Não muda ao compartilhar.

   Como a receita tem sua própria impressão digital (`sha256`), reenviar não "altera" a receita.
2. **Marcadores de máquina em comentários HTML** (`<!-- PRATORIA:… -->`):
   - são invisíveis em qualquer visualizador de Markdown;
   - são únicos, porque nenhum texto de receita começa assim;
   - são só ASCII, sem acento nos marcadores.
3. **Cada bloco tem início e fim.** O arquivo termina com `<!-- PRATORIA:FIM-DO-ARQUIVO -->`. Se faltar, o PWA sabe que o arquivo chegou cortado e diz exatamente o que se perdeu.
4. **A ordem protege o essencial:** envelope → receita → índice de imagens → prompts → anexos base64. O grande vem por último. Se cortar, a receita continua inteira.
5. **Blocos de código cercados** (```` ``` ````) com "nome" (`pratoria-envelope`, `pratoria-prompt`, `pratoria-imagem`). Sobrevivem a e-mail, editores e visualizadores, que não mexem no conteúdo de blocos de código.
6. **Linhas curtas:**
   - base64 em linhas de 76 caracteres;
   - arte e divisórias com até 60 colunas, o que evita quebras automáticas.
7. **Codificação:**
   - UTF-8 sem BOM, quebras de linha `\n`, sem tabulações;
   - acentos só no conteúdo, nunca nos marcadores;
   - o PWA normaliza `\r\n` e espaços no fim da linha antes de conferir hashes.
8. **Integridade verificável:**
   - `receita_sha256` para o bloco da receita;
   - `sha256` para cada imagem;
   - `arquivo_versao` para evoluir o formato sem quebrar arquivos antigos.
9. **Leitura sempre como dado:**
   - o PWA nunca executa nada do arquivo e mostra texto, nunca HTML do arquivo;
   - limite de tamanho;
   - proteção contra "zip-bomba": confere o tamanho descompactado antes de abrir.

### 2.2 Estética

- Arte ASCII do prato e da marca no topo, com colofão no fim. As duas ficam dentro de blocos ```` ```text ````, então aparecem alinhadas tanto no texto puro quanto renderizadas.
- Divisórias no estilo `+--[ SEÇÃO ]---+`, também em blocos de texto.
- Nada de `~~`, `***` ou `___` soltos, que o Markdown transforma em riscado, negrito ou linha.

### 2.3 Exemplo completo (Texto + imagens com base64 ligado)

````markdown
<!-- PRATORIA:ARQUIVO v1 -->
```text
       ,-.      .-~-.      .---.
      ( @ )    ( o o )    (_____)
  .---'-'------'---'------'-----'---.
  \                                 /
   \     P  R  A  T  O  R  I  A    /
    '.___________________________.'
          caderno de receitas
```

> Receita compartilhada pelo Pratoria. Para vê-la organizada, abra no
> Pratoria: Receber → Abrir arquivo. Não edite as linhas <!-- … -->.

<!-- PRATORIA:ENVELOPE:INICIO -->
```pratoria-envelope
# +--[ ENVELOPE ]-------------------------------------+
compartilhado_por: Allan
exportado_em: 2026-09-23T14:05:12-03:00
historico: Pratoria 2026-09-23T12:00 > Allan 2026-09-23T14:05
app: Pratoria 0.2.0
arquivo_versao: 1
pacote: texto+imagens
imagens_no_md: sim
receita_id: prt-5fd8751032eba68d
receita_sha256: 9b1c0e7d4a…
pacote_completo: [pacote completo não disponível online]
# +---------------------------------------------------+
```
<!-- PRATORIA:ENVELOPE:FIM -->

<!-- PRATORIA:RECEITA:INICIO -->
#PRATORIA v1
id: prt-5fd8751032eba68d
usuario: Allan
gerado_em: 2026-09-23T12:00:00-03:00
gerado_por: ChatGPT GPT-5
prompt_versao: 2026-09-23.2
ajustes: gramas, 2 porções
titulo: Salada Mediterrânea de Sardinha com Grão-de-bico
fonte_site: OliveTomato
fonte_autor: Elena Paravantes
fonte_url: https://www.olivetomato.com/…   (ou: [sem link original])
…demais campos…

## COMPRAS
- grão-de-bico seco | 1 pacote pequeno | mercearia
…
## PREPARACAO: Salada
### NOTA
…
### INGREDIENTES
- 1 |  | tomate médio | picado
### PASSOS
1. …
## ILUSTRACOES
- 1 | tomate | meio tomate com sementes aparentes | Salada:1
…
#FIM
<!-- PRATORIA:RECEITA:FIM -->

<!-- PRATORIA:IMAGENS:INICIO -->
```text
+--[ IMAGENS ]---------------------------------------+
```
- prato | imagens/prato.webp | 1200x873 | sha256:3f9a… | anexo
- ilustracoes | imagens/ilustracoes.webp | 1536x1024 | sha256:c21e… | anexo
- ilustracoes-mapa | 4x3 | tomate,pepino,cebola,sardinha,limão,salsa
<!-- PRATORIA:IMAGENS:FIM -->

<!-- PRATORIA:PROMPTS:INICIO -->
```text
+--[ PROMPTS ]---------------------------------------+
```
```pratoria-prompt tipo=texto
Converta a receita do link abaixo para o formato PRATORIA v1…
```
```pratoria-prompt tipo=imagem
Gere uma imagem fotorrealista do prato pronto…
```
```pratoria-prompt tipo=ilustracoes
Gere uma cartela 4x3 de ilustrações a giz…
```
<!-- PRATORIA:PROMPTS:FIM -->

<!-- PRATORIA:ANEXOS:INICIO -->
```pratoria-imagem nome=prato tipo=image/webp sha256=3f9a…
UklGRlQAAABXRUJQVlA4IEgAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v3AgAA…
…(linhas de 76 caracteres)…
```
```pratoria-imagem nome=ilustracoes tipo=image/webp sha256=c21e…
…
```
<!-- PRATORIA:ANEXOS:FIM -->

```text
  +---------------------------------------------------+
  |  feito no Pratoria  ·  arquivo gerado em           |
  |  23/09/2026 14:05  ·  por Allan                     |
  +---------------------------------------------------+
```
<!-- PRATORIA:FIM-DO-ARQUIVO -->
````

### 2.4 Estado de cada imagem no índice

| Estado | Significado |
|---|---|
| `anexo` | base64 dentro deste `.md` |
| `arquivo` | arquivo na pasta `imagens/` do `.pratoria` |
| `link` | no endereço de `pacote_completo` |
| `ausente` | não veio; o PWA oferece gerar pelo prompt |

### 2.5 O que vai no `.pratoria` (zip)

| Escolha ao exportar | Conteúdo |
|---|---|
| Só texto | `receita.md` (imagens `ausente`) |
| Texto + imagens (padrão) | `receita.md` + `imagens/*.webp` (imagens `arquivo`) |
| Texto + imagens dentro do .md | `receita.md` com anexos base64 (imagens `anexo`) |

**Reconhecimento no PWA:**

- os primeiros bytes são `PK` → zip;
- contém `PRATORIA:ARQUIVO` ou `#PRATORIA v1` → `.md`.

Aceita `.pratoria`, `.zip`, `.md`, `.txt` ou texto colado vindo de link ou QR.

---

## 3. UX/UI mobile (base de tudo) → desktop

### 3.1 Navegação no celular

Barra inferior com 5 itens, na zona do polegar:

**Caderno · Compras · [ + ] · Receber · Mais**

- **[ + ]** abre uma folha com três opções: **Importar de um link**, **Colar/abrir arquivo .pratoria** e **Escrever receita à mão**.
- **Compras** é a lista de compras geral, que junta as receitas marcadas como "quero fazer".
- **Mais** reúne ajustes, preferências, backup, conta/sincronização e sobre.

**Indicador de nuvem no topo, sempre visível:**

- ● **Só neste aparelho** (sem conta);
- ◐ **Sincronizando…**;
- ✓ **Sincronizado**;
- ! **Pendente**, com toque para ver o que falta.

### 3.2 Fluxo: primeira abertura → receita

1. **Boas-vindas** (1 tela, pulável): nome (opcional, vai nas receitas e arquivos), "Seu caderno funciona sem internet e sem conta" e o botão **Começar**. A receita-piloto já está no caderno.
2. **Caderno (início):**
   - topo com marca, indicador de nuvem e busca;
   - card **"Continuar cozinhando"**, quando há um livro aberto pela metade;
   - faixa **"Quero fazer"** em rolagem horizontal;
   - **chips** de categoria e de filtros rápidos: ⏱ até 30 min · sem forno · favoritas;
   - **lista** de receitas em cards horizontais (foto à esquerda), fácil de ler com uma mão.
3. **Busca** (tela cheia):
   - campo, buscas recentes;
   - filtros de tempo, dieta, sem X, e "tenho em casa" (digitar ingredientes e ver o que dá para fazer).
4. **Receita,** numa rolagem única, sem abas escondendo conteúdo:
   - **foto** com a "prateleira" de giz ao fundo;
   - **título** e **crédito discreto**;
   - **chips:** porções · tempo · dificuldade;
   - **aviso de espera,** quando existe;
   - **barra fixa inferior:** **Cozinhar** (Mão na Massa, botão grande) + Compartilhar + ⋯;
   - **índice fixo** (âncoras): Ingredientes · Preparo · Extras · Notas;
   - **Ingredientes,** com o controle de porções (– 2 +) e o botão **Aa** de ajustes da plataforma (unidades, substituições, tamanho do texto);
   - **Preparo,** com os passos numerados; os passos com tempo mostram ⏱ para abrir um cronômetro;
   - **Extras** (substituir, servir, conservar) e **Saúde** (estimado);
   - **Minhas notas**, status e rodapé com a fonte completa e o id.
5. **Mão na Massa:** o livro atual, mais os cronômetros dos passos e a prateleira de giz.
6. **Compartilhar** (folha):
   - escolha do pacote: **Só texto** / **Texto + imagens** / (opção) **imagens dentro do .md**;
   - modalidades abaixo; as que não comportam o pacote aparecem apagadas, com o motivo.

### 3.3 Como o desktop deriva do celular

| Celular | Desktop (≥ 64rem) |
|---|---|
| Barra inferior de 5 itens | Trilho lateral com os mesmos 5 itens e rótulos |
| Lista de cards horizontais | Grade de cards (mesmo componente, empilhado) |
| Receita em coluna única | Duas colunas: ingredientes fixos à esquerda, preparo à direita (mesma ordem de leitura) |
| Barra fixa inferior (Cozinhar) | Mesma barra, fixa no topo da coluna direita |
| Folhas inferiores | Diálogos centralizados ou painel lateral direito |
| Livro: 1 página | Livro: 2 páginas lado a lado |
| Busca em tela cheia | Busca no topo do conteúdo, filtros em painel lateral |

---

## 4. Análise geral e sugestões

### 4.1 O que está forte
- **Local-first de verdade:** funciona sem conta e sem internet.
- **Importação sem IA própria**, com um formato validado e tolerante.
- **Livro com paginação medida,** que é o grande diferencial na cozinha.
- **Compartilhamento sem servidor** e um arquivo único e autoexplicativo.

### 4.2 Lacunas e sugestões (em ordem de impacto)
1. **Escrever/editar receita na plataforma** (sem IA e sem mexer no `.md` à mão).
   - Hoje só dá para importar.
   - Proposta: editor por campos (título, ingredientes estruturados, passos, extras) que gera o `.md` por baixo.
   - Edições de receitas importadas viram uma "camada" sobre o original, e o original fica preservado para reprocessar.
2. **Cronômetros nos passos,** sem IA: detectar "12 a 15 minutos" ou "8 a 12 horas" e oferecer ⏱ no livro. Com vários cronômetros, eles ficam empilhados no topo e disparam som/vibração.
3. **Lista de compras geral:** junta os itens das receitas "quero fazer", soma o que for igual, agrupa por seção do mercado e respeita "tenho em casa".
4. **Menos atrito na importação:**
   - compartilhar um link direto do navegador para o Pratoria (Android) já pula para o passo 2;
   - ao voltar da IA, oferecer "Colar resposta" com um toque.
5. **Receita duplicada:** ao importar algo com o mesmo `fonte_url` ou o mesmo `idOrigem`, perguntar **Atualizar / Manter as duas / Cancelar**.
6. **Lembrete de backup sem conta:** após 5 receitas novas, ou 30 dias sem backup, sugerir exportar o caderno inteiro num `.pratoria` de caderno.
7. **Coleções** (ex.: "Natal", "Marmitas"): agrupar receitas além da categoria.
8. **Tamanho do texto e contraste alto** globais, pensando no celular apoiado na bancada.
9. **Modo noturno do livro** (papel escuro quente), para cozinhar à noite sem ofuscar.
10. **Limite de espaço:** mostrar quanto o caderno ocupa e permitir compactar imagens antigas.
11. **Futuro:** cardápio da semana arrastando receitas para os dias, gerando a lista de compras.

### 4.3 Ajustes no que já existe
- **Compartilhar:** remover o cartão-imagem e o copiar/colar; trocar o `.pratoria.txt` pelo `.pratoria` (zip) e pelo `.md` descrito acima.
- **Link e QR:** sem conta, levam o `.md` compactado; com conta, levam o endereço do `.pratoria` no Supabase.
- **Barra inferior:** hoje tem 4 itens (Caderno, Importar, Receber, Ajustes). A proposta troca por 5 (Caderno, Compras, +, Receber, Mais).
- **Receita:** o botão Cozinhar passa para uma barra fixa inferior, e entram o índice de âncoras e o controle de porções.

---

## 5. Opções de design (quadro "Pratoria — opções de design")

As três direções usam a mesma estrutura: barra inferior de 5 itens, receita em rolagem única, barra fixa "Cozinhar" e folha de compartilhar com os dois pacotes.

| | A · Caderno de família | B · Mercearia de bairro | C · Lousa de bistrô |
|---|---|---|---|
| **Clima** | Papel creme, tinta sépia, terracota: caderno de receitas da avó, atualizado | Papel kraft, bordas grossas, etiquetas "carimbadas" em vermelho, verde-oliva: armazém e rótulo de pote | Fundo verde-lousa, letras cor de giz, mostarda e tomate: quadro de bistrô |
| **Títulos** | Fraunces (serifada macia) | Zilla Slab (serifada quadrada) | Fraunces |
| **Texto** | Atkinson Hyperlegible Next | Atkinson Hyperlegible Next | Atkinson Hyperlegible Next |
| **Casamento com o giz** | Bom | Médio: o giz contrasta com o gráfico duro | Ótimo: o giz nasce na lousa |
| **Leitura na cozinha** | Ótima de dia | Ótima de dia | Ótima à noite; de dia, com sol na janela, um pouco menos |
| **Risco** | Ficar "fofo" demais se exagerar nos detalhes | Ficar "retrô de loja" e cansar | Tema escuro como padrão afasta parte do público |

**Recomendação:** **A** como tema padrão e **C** como "modo noturno" do app e do livro. Os dois compartilham os mesmos componentes, só muda a paleta. O desktop no quadro foi derivado do celular na direção A.
