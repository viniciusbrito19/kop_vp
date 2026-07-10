-- Migração: créditos de royalties (Devolução Garantida, Devoluções de Produto, Outros)
-- Executar no SQL Editor do Supabase

ALTER TABLE apuracoes_crm
  ADD COLUMN IF NOT EXISTS credito_devolucao_garantida numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credito_devolucoes_produto  numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credito_outros              numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_roy_liquido           numeric(12,2);
