# Onde cada dado fica

**Princípios aprovados:**
- Máximo de armazenamento no aparelho.
- O app funciona **100% sem login**.
- Com conta, a nuvem (Supabase) é uma cópia extra. **Na dúvida, guardar nos dois.**
- Nada novo é guardado sem perguntar ao Allan antes; cada decisão é registrada aqui.

| Dado | Sem login | Com conta | Status |
|---|---|---|---|
| Perfil local (nome usado no prompt) | aparelho | aparelho + Supabase `profiles` | aprovado |
| Receitas (objeto + texto original + dados pessoais) | aparelho | aparelho + Supabase `recipes` | aprovado |
| Imagens dos pratos | aparelho | aparelho + Supabase Storage | aprovado |
| Lista de compras marcada | aparelho | aparelho | aprovado |
| Progresso do livro, tutorial visto, "manter tela ligada" | aparelho | aparelho | aprovado |
| Rascunho da importação | aparelho | aparelho | aprovado 23/09 |
| Cartela e recortes a giz (`ilustracoes`), biblioteca de ingredientes (`biblioteca`) | aparelho | aparelho + Supabase | aprovado 23/09 |
| Preferências gerais (ajustes do prompt, exibição, "tenho em casa") | aparelho | aparelho + Supabase, com indicador | aprovado 23/09 |
| "Na lista de compras", porções preferidas, histórico de quem compartilhou (dados da receita) | aparelho | aparelho + Supabase | junto das receitas |
| Itens marcados na lista de compras geral | aparelho | aparelho | aprovado |
| Edições do usuário (versão editada + original guardado para restaurar) | aparelho | aparelho + Supabase `recipes.original` | aprovado 24/09 |
| Receitas escritas à mão | aparelho | aparelho + Supabase `recipes` | aprovado 24/09 |
| Coleções e cardápio da semana | aparelho | aparelho + Supabase `user_settings` | aprovado 24/09 |
| Cronômetros em andamento, data do último backup, lembrete adiado, "boas-vindas vista" | aparelho | aparelho | aprovado 24/09 |
| Rascunho do editor | aparelho | aparelho | como o rascunho da importação |
| Contatos e envios | — | Supabase | aprovado |
| Link público de receita | — | Supabase (`noindex`) | aprovado provisoriamente; buscar alternativa sem servidor |
| Prompts, listas, parser, ilustrações, ícones, fontes, receita-piloto | site | site | aprovado |

## Compartilhar sem servidor (funciona sem login)
- **WhatsApp e outros apps:** o menu nativo de compartilhar envia a imagem (com fundo de papel aplicado, porque o WhatsApp mostra a transparência em preto) junto com o texto PRATORIA.
  - Quem recebe toca em "Colar receita" no Pratoria.
  - No Android, com o app instalado, dá para compartilhar direto do WhatsApp para o Pratoria.
- **Copiar:** botão com ícone ao lado da marca; copia o texto PRATORIA da receita aberta.
- As anotações pessoais não vão em nenhum dos dois.

## Proteção sem login

- **Backup do caderno inteiro** num único `caderno-AAAA-MM-DD.pratoria` (zip com `caderno.json`, fotos e desenhos a giz, coleções e cardápio). Abre em Mais → Restaurar ou em Receber. O backup antigo em `.json` continua sendo aceito.
- **Lembrete:** com 5 receitas sem nenhum backup, 5 receitas novas desde o último, ou 30 dias com novidades. "Depois" adia 7 dias.

- O app pede ao navegador armazenamento persistente (`navigator.storage.persist`).
- **Backup/restauração** em arquivo (receitas + imagens).
- **Aviso sobre o iOS:** o Safari pode apagar os dados de um site aberto só no navegador após cerca de 7 dias sem uso. Isso não acontece com o app instalado na tela inicial, então o app deve sugerir a instalação.
