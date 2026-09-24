# Supabase — como ligar depois

Nada aqui depende de a conta já existir. Quando criar o projeto:

1. Crie o projeto em supabase.com (região mais próxima: São Paulo).
2. Em **SQL Editor**, cole e execute `schema.sql` inteiro, uma vez.
3. Em **Authentication → Providers**, ative *Email* (link mágico) e, se quiser, Google.
4. Em **Authentication → URL Configuration**, cadastre a URL do site (e `http://localhost:5173` para testes).
5. Copie **Project URL** e **anon public key** (Settings → API) para um arquivo `.env` na raiz, seguindo `.env.example`.

A chave `anon` pode ficar no front: quem protege os dados são as regras RLS do `schema.sql`.
Nunca coloque a chave `service_role` no site.
