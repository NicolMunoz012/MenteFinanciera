-- Tablas de MenteFinanciera.
-- Cada fila pertenece a un usuario (user_id) y la clave primaria es compuesta:
-- (user_id, id). Así cada usuario puede numerar sus movimientos 1, 2, 3...
-- sin chocar con los de otra cuenta.

create table public.categories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id integer not null,
  name text not null,
  budget numeric not null check (budget > 0),
  primary key (user_id, id),
  unique (user_id, name)
);

create table public.transactions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id integer not null,
  name text not null,
  category text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  date date not null,
  source text not null check (source in ('manual', 'scan', 'voice')),
  primary key (user_id, id)
);

create table public.goals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id integer not null,
  name text not null,
  target numeric not null check (target > 0),
  saved numeric not null default 0 check (saved >= 0),
  due_date date not null,
  primary key (user_id, id)
);

create table public.reminders (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id integer not null,
  name text not null,
  amount numeric not null check (amount > 0),
  due_date date not null,
  is_paid boolean not null default false,
  primary key (user_id, id)
);

-- Row Level Security: cada usuario solo ve y modifica sus propias filas.
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.reminders enable row level security;

create policy "categories_own" on public.categories
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "transactions_own" on public.transactions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "goals_own" on public.goals
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "reminders_own" on public.reminders
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Permisos para el rol que usa el SDK con la anon key + sesión del usuario.
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
