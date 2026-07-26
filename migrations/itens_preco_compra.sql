-- Adiciona a coluna de preço de compra (valor pago à fábrica) à tabela de produtos.
alter table public.itens
  add column if not exists preco_compra numeric(12, 2);
