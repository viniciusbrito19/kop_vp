-- Migração: emissão separada de títulos FPP e Royalties
-- Executar no SQL Editor do Supabase

-- 1. Adiciona as colunas de controle de emissão
ALTER TABLE apuracoes_crm
  ADD COLUMN IF NOT EXISTS fpp_emitido        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS royalties_emitidos boolean NOT NULL DEFAULT false;

-- 2. Marca apurações já confirmadas como emitidas
--    (foram geradas pelo fluxo antigo que criava todos os títulos de uma vez)
UPDATE apuracoes_crm
SET fpp_emitido        = true,
    royalties_emitidos = true
WHERE status = 'confirmado';
