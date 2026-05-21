-- Cole isso no SQL Editor do Supabase e clique em "Run"

create table public.user_data (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Row Level Security) para proteger os dados
alter table public.user_data enable row level security;

-- Criar política para permitir que usuários autenticados e anônimos possam ler e atualizar seus próprios dados baseados no ID (que é o ID do device ou do auth)
create policy "Users can view own data"
  on public.user_data for select
  using ( true );

create policy "Users can insert own data"
  on public.user_data for insert
  with check ( true );

create policy "Users can update own data"
  on public.user_data for update
  using ( true );
