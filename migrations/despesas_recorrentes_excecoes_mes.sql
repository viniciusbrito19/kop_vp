-- Exceções mensais de despesas recorrentes: presença de uma linha marca que o
-- template ficou desativado apenas no mês/ano indicado, sem afetar os demais.
create table if not exists public.despesas_recorrentes_excecoes_mes (
  id uuid primary key default gen_random_uuid(),
  despesa_recorrente_id uuid not null references public.despesas_recorrentes(id) on delete cascade,
  ano int not null,
  mes int not null check (mes between 1 and 12),
  created_at timestamptz not null default now(),
  unique (despesa_recorrente_id, ano, mes)
);

create index if not exists idx_despesas_recorrentes_excecoes_mes_ano_mes
  on public.despesas_recorrentes_excecoes_mes (ano, mes);

alter table public.despesas_recorrentes_excecoes_mes enable row level security;

create policy "Allow all for anon and authenticated"
  on public.despesas_recorrentes_excecoes_mes
  for all
  to anon, authenticated
  using (true)
  with check (true);
