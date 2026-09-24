# Pratoria — caderno de receitas (PWA, mobile-first)

Svelte 5 + Vite · funciona 100% sem login e sem internet (depois da primeira visita) · publicado no GitHub Pages.

## Publicar no GitHub Pages (uma vez)

1. Crie um repositório no GitHub (sugestão de nome: `pratoria`). Se a pasta ainda não for um repositório git, rode `git init -b main` e faça um commit antes.
2. Nesta pasta, rode:
   ```
   git remote add origin https://github.com/<seu-usuario>/pratoria.git
   git push -u origin main
   ```
3. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Em cerca de 2 minutos o site estará em `https://<seu-usuario>.github.io/pratoria/`.
   Cada `git push` publica de novo, e o app avisa quem usa: "Uma nova versão do Pratoria está disponível".

O workflow (`.github/workflows/deploy.yml`) roda os testes, gera o site com o caminho certo do repositório e publica.

## Rodar no computador

```
npm install        # na primeira vez (a pasta node_modules não vai para o GitHub)
npm run dev        # desenvolvimento: http://localhost:5173
npm test           # testes do núcleo (26)
npm run build && npm run preview   # versão final, com offline/PWA: http://localhost:4173
```

## Estrutura

| Caminho | O que é |
|---|---|
| `src/telas/` | Caderno, Receita, Compras, Importar, Receber, Mais (Ajustes) |
| `src/livro/` | Modo Mão na Massa: páginas, paginação medida, motor de virada |
| `src/componentes/` | navegação, compartilhar, QR, prompts das IAs, imagem, prévia |
| `src/lib/` | estado do app, rotas, PWA, formatação, tratamento de imagem, cartão |
| `src/core/` | núcleo sem interface, testado: formato, id, caderno local, pacote `.pratoria` (`pacote/`), ajustes pré-prontos, escala de porções, recorte da cartela |
| `src/sw.js` | service worker (offline + receber do menu Compartilhar do Android) |
| `src/styles/` | tokens rústicos e estilos globais |
| `public/` | ícones e imagem da receita-piloto |
| `supabase/` | esquema para ligar quando a conta existir |
| `docs/` | formato v1, armazenamento, compartilhamento |

## Rotas
`#/` caderno · `#/receita/<id>` · `#/receita/<id>/cozinhar` · `#/importar` · `#/receber` · `#/ajustes` · `#r1.…` (link com receita dentro).
O roteamento usa `#` porque o GitHub Pages não tem configuração de servidor.
