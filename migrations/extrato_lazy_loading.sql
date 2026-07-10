-- Migração: paginação server-side do extrato financeiro
-- Executar no SQL Editor do Supabase

-- Índice de suporte à ordenação padrão (mais recente primeiro) usada na paginação
CREATE INDEX IF NOT EXISTS idx_lancamentos_extrato_data_ordem
  ON lancamentos_extrato (data_lancamento DESC, ordem_original DESC);

-- Índice de suporte ao filtro "vinculado" (EXISTS abaixo) e aos joins existentes
CREATE INDEX IF NOT EXISTS idx_titulos_lancamento_extrato_id
  ON titulos (lancamento_extrato_id);

-- Índice trigram para acelerar busca ILIKE por destinatário/remetente
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_lancamentos_extrato_destinatario_trgm
  ON lancamentos_extrato USING gin (destinatario_remetente gin_trgm_ops);

-- Função RPC: calcula totais/contagens do extrato já filtrados no banco,
-- evitando trazer todas as linhas para o cliente só para somar valores.
CREATE OR REPLACE FUNCTION extrato_totais(
  p_data_inicio   date DEFAULT NULL,
  p_data_fim      date DEFAULT NULL,
  p_natureza      text DEFAULT NULL,
  p_tipo          text DEFAULT NULL,
  p_destinatario  text DEFAULT NULL,
  p_vinculado     boolean DEFAULT NULL
)
RETURNS TABLE (
  total_entradas numeric,
  total_saidas   numeric,
  qtd_entradas   bigint,
  qtd_saidas     bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COALESCE(SUM(le.valor) FILTER (WHERE le.natureza = 'entrada'), 0)        AS total_entradas,
    COALESCE(ABS(SUM(le.valor) FILTER (WHERE le.natureza = 'saida')), 0)     AS total_saidas,
    COUNT(*) FILTER (WHERE le.natureza = 'entrada')                         AS qtd_entradas,
    COUNT(*) FILTER (WHERE le.natureza = 'saida')                           AS qtd_saidas
  FROM lancamentos_extrato le
  WHERE (p_data_inicio  IS NULL OR le.data_lancamento >= p_data_inicio)
    AND (p_data_fim     IS NULL OR le.data_lancamento <= p_data_fim)
    AND (p_natureza     IS NULL OR le.natureza = p_natureza)
    AND (p_tipo         IS NULL OR le.tipo = p_tipo)
    AND (p_destinatario IS NULL OR le.destinatario_remetente ILIKE '%' || p_destinatario || '%')
    AND (
      p_vinculado IS NULL OR p_vinculado = false OR EXISTS (
        SELECT 1 FROM titulos t WHERE t.lancamento_extrato_id = le.id
      )
    )
$$;
