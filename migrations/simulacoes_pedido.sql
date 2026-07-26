-- Tabela para salvar simulações de pedido (tela "Simular pedido"), permitindo
-- ao usuário revisitar uma simulação feita anteriormente.
create table if not exists public.simulacoes_pedido (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dados jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.simulacoes_pedido enable row level security;

drop policy if exists "Allow all for anon and authenticated" on public.simulacoes_pedido;

create policy "Allow all for anon and authenticated"
  on public.simulacoes_pedido
  for all
  to anon, authenticated
  using (true)
  with check (true);
