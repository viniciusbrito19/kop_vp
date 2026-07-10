-- Migração: segrega créditos e valor líquido de royalties em Linha e Sazonal
-- (substitui as colunas únicas criadas em apuracoes_crm_creditos_royalties.sql)
-- Executar no SQL Editor do Supabase

ALTER TABLE apuracoes_crm
  DROP COLUMN IF EXISTS credito_devolucoes_produto,
  DROP COLUMN IF EXISTS credito_outros,
  DROP COLUMN IF EXISTS valor_roy_liquido;

ALTER TABLE apuracoes_crm
  ADD COLUMN IF NOT EXISTS credito_devolucoes_produto_linha   numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credito_devolucoes_produto_sazonal numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credito_outros_linha               numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credito_outros_sazonal             numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_roy_liquido_linha            numeric(12,2),
  ADD COLUMN IF NOT EXISTS valor_roy_liquido_sazonal          numeric(12,2);
