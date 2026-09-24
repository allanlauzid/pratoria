-- =====================================================================
-- Pratoria — esquema Supabase (Postgres + RLS + Storage)
-- Ainda NÃO aplicado: rodar no SQL Editor do projeto quando a conta existir.
-- Decisões de armazenamento: ver docs/armazenamento.md
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  invite_code  text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Cada usuário lê e edita o próprio perfil; lê o perfil dos contatos.
create policy "perfil: dono lê" on public.profiles for select using (id = auth.uid());
create policy "perfil: dono edita" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Cria o perfil automaticamente no cadastro.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Contatos (rede privada do usuário; não é rede social)
-- Uma linha por par. Quem convida = requester. Quem recebe aceita/recusa.
-- ---------------------------------------------------------------------
create type public.contact_status as enum ('pending', 'accepted', 'blocked');

create table public.contacts (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       public.contact_status not null default 'pending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create unique index contacts_par_unico on public.contacts (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
alter table public.contacts enable row level security;

create policy "contatos: partes leem" on public.contacts for select
  using (auth.uid() in (requester_id, addressee_id));
create policy "contatos: convidado responde" on public.contacts for update
  using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());
create policy "contatos: partes removem" on public.contacts for delete
  using (auth.uid() in (requester_id, addressee_id));
-- Inserção só pela função abaixo (por código de convite), para não expor perfis.

create or replace function public.are_contacts(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from contacts
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
  );
$$;

create policy "perfil: contatos leem" on public.profiles for select
  using (public.are_contacts(auth.uid(), id)
         or exists (select 1 from contacts c where c.addressee_id = auth.uid() and c.requester_id = profiles.id));

create or replace function public.add_contact_by_code(code text) returns void
language plpgsql security definer set search_path = public as $$
declare alvo uuid;
begin
  select id into alvo from profiles where invite_code = upper(trim(code));
  if alvo is null then raise exception 'Código de convite não encontrado'; end if;
  if alvo = auth.uid() then raise exception 'Esse é o seu próprio código'; end if;
  insert into contacts (requester_id, addressee_id) values (auth.uid(), alvo)
  on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------
-- Receitas (cópia na nuvem; a base é o aparelho — IndexedDB — e funciona sem login)
-- `data` guarda o objeto completo gerado pelo parser (formato v1).
-- Colunas soltas existem para busca, ordenação e sincronização.
-- ---------------------------------------------------------------------
create table public.recipes (
  id             text primary key check (id ~ '^prt-[0-9a-f]{16}$'), -- gerado no aparelho (src/core/id.js)
  origin_id      text,                          -- id da receita de quem enviou (quando recebida)
  owner_id       uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  slug           text not null,
  title          text not null,
  category       text not null default '',
  tags           text[] not null default '{}',
  format_version int  not null default 1,
  data           jsonb not null,                -- receita completa (parser v1)
  raw_text       text,                          -- texto PRATORIA original colado (para reprocessar)
  original       jsonb,                         -- {dados, texto, guardadoEm}: versão antes da 1ª edição do usuário
  edited_at      timestamptz,                   -- quando o usuário editou (null = nunca)
  personal       jsonb not null default '{}',   -- favorita, avaliação, status, coleções, anotações…
  source_site    text not null default '',
  source_author  text not null default '',
  source_url     text not null default '',
  image_path     text,                         -- caminho no bucket recipe-images
  origin         text not null default 'import' check (origin in ('import', 'manual', 'share')),
  shared_from    uuid references public.profiles(id) on delete set null,
  is_public      boolean not null default false, -- link público (noindex)
  public_token   text unique,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,                  -- exclusão lógica, para sincronizar entre aparelhos
  unique (owner_id, slug)
);
create index recipes_sync on public.recipes (owner_id, updated_at);
alter table public.recipes enable row level security;

create policy "receitas: dono tudo" on public.recipes for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger recipes_touch before update on public.recipes for each row execute function public.touch_updated_at();
create trigger contacts_touch before update on public.contacts for each row execute function public.touch_updated_at();

-- Link público: lido por função, sem abrir a tabela para anônimos.
create or replace function public.get_public_recipe(token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('data', data, 'image_path', image_path, 'title', title)
  from recipes where public_token = token and is_public and deleted_at is null;
$$;
grant execute on function public.get_public_recipe(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Configurações que acompanham o usuário entre aparelhos (aparelho + nuvem):
--   perfil, pref:ajustes, pref:exibicao, colecoes, cardapio
-- Ficam SÓ no aparelho (nunca aqui): cronômetros, último backup, "boas-vindas vista",
-- itens marcados da lista de compras, progresso do livro, rascunhos.
-- ---------------------------------------------------------------------
create table public.user_settings (
  owner_id   uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  key        text not null check (key in ('perfil', 'pref:ajustes', 'pref:exibicao', 'colecoes', 'cardapio')),
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, key)
);
alter table public.user_settings enable row level security;
create policy "config: dono tudo" on public.user_settings for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create trigger user_settings_touch before update on public.user_settings for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Envios (caixa de entrada): uma CÓPIA da receita enviada a um contato.
-- ---------------------------------------------------------------------
create type public.share_status as enum ('pending', 'accepted', 'declined');

create table public.shares (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  recipe_data  jsonb not null,           -- cópia congelada no momento do envio
  image_path   text,                     -- imagem do remetente (leitura liberada ao destinatário)
  message      text not null default '' check (char_length(message) <= 500),
  status       public.share_status not null default 'pending',
  created_at   timestamptz not null default now()
);
alter table public.shares enable row level security;

create policy "envios: partes leem" on public.shares for select
  using (auth.uid() in (sender_id, recipient_id));
create policy "envios: só para contatos" on public.shares for insert
  with check (sender_id = auth.uid() and public.are_contacts(sender_id, recipient_id));
create policy "envios: destinatário responde" on public.shares for update
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "envios: partes apagam" on public.shares for delete
  using (auth.uid() in (sender_id, recipient_id));

-- ---------------------------------------------------------------------
-- Storage: imagens dos pratos (WebP gerado no aparelho)
-- Caminho: {user_id}/{recipe_id}.webp  (recipe_id = prt-…)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', false, 2097152, array['image/webp', 'image/png'])
on conflict (id) do nothing;

create policy "imagens: dono gerencia" on storage.objects for all
  using (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "imagens: destinatário de envio lê" on storage.objects for select
  using (bucket_id = 'recipe-images'
         and exists (select 1 from public.shares s where s.recipient_id = auth.uid() and s.image_path = storage.objects.name));

-- PENDENTE: imagem no link público. Opções: Edge Function que gera URL assinada,
-- ou copiar a imagem para um bucket público ao ativar o link. Decidir depois.
