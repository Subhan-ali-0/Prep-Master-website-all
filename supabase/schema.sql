-- ============================================
-- PREP MASTER - SUPABASE DATABASE SCHEMA
-- ============================================

create extension if not exists pgcrypto;


-- ============================================
-- APPS
-- ============================================

create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  logo_url text default '',
  description text default '',
  home_url text not null,
  category text default 'Education',
  purchase_video_url text default '',

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================
-- APP KEYS
-- ============================================

create table if not exists public.app_keys (
  id uuid primary key default gen_random_uuid(),

  app_id uuid not null references public.apps(id) on delete cascade,

  key text not null unique,

  active boolean not null default true,

  used_by text,
  used_at timestamptz,

  created_at timestamptz not null default now()
);


-- ============================================
-- USERS
-- ============================================

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),

  username text not null unique,

  password_hash text not null,

  unlocked_apps uuid[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================
-- NOTIFICATIONS
-- ============================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),

  title text not null,

  message text not null,

  created_at timestamptz not null default now()
);


-- ============================================
-- INDEXES
-- ============================================

create index if not exists apps_active_idx
on public.apps(active);

create index if not exists apps_category_idx
on public.apps(category);

create index if not exists app_keys_app_id_idx
on public.app_keys(app_id);

create index if not exists app_keys_active_idx
on public.app_keys(active);

create index if not exists notifications_created_at_idx
on public.notifications(created_at desc);


-- ============================================
-- UPDATED_AT FUNCTION
-- ============================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

drop trigger if exists apps_updated_at on public.apps;

create trigger apps_updated_at
before update on public.apps
for each row
execute function public.set_updated_at();


drop trigger if exists users_updated_at on public.users;

create trigger users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();


-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.apps enable row level security;
alter table public.app_keys enable row level security;
alter table public.users enable row level security;
alter table public.notifications enable row level security;


-- ============================================
-- IMPORTANT
-- ============================================
-- Prep Master backend uses SUPABASE_SERVICE_ROLE_KEY.
-- Therefore frontend users do NOT need direct
-- database access.
--
-- Service-role key bypasses RLS and must NEVER
-- be placed in frontend JavaScript.
--
-- No public INSERT / UPDATE / DELETE policies
-- are created intentionally.


-- ============================================
-- OPTIONAL STARTER APP
-- ============================================
-- Uncomment this section if you want one test app.
--
-- insert into public.apps
-- (name, logo_url, description, home_url, category, purchase_video_url)
-- values
-- (
--   'PW',
--   '',
--   'PW Education App',
--   'https://example.com',
--   'Education',
--   ''
-- );


-- ============================================
-- DONE
-- ============================================
