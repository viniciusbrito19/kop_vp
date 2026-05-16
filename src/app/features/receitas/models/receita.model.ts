export interface RecebimentoCartao {
  id: string;
  data_prevista: string;   // ISO YYYY-MM-DD
  data_venda: string | null;
  valor_liquido: number;
  created_at: string;
}

export interface GrupoDia {
  data: string;
  diaSemana: string;
  diaNum: number;
  mesAbrev: string;
  count: number;
  total: number;
}
