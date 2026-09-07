export interface TipoPedido {
  id: string;
  nome: string;
  ativo: boolean;
  incide_royalties: boolean;
  tipo_royalties: 'linha' | 'sazonal' | null;
  percentual_royalties: number | null;
  created_at: string;
}

export type TipoPedidoForm = Pick<TipoPedido, 'nome' | 'ativo' | 'incide_royalties' | 'tipo_royalties' | 'percentual_royalties'>;

/**
 * Percentual de royalties (em pontos percentuais) aplicado quando o tipo de pedido não define um
 * próprio — mesmos padrões usados no cálculo da apuração quando `percentual_royalties` é nulo.
 */
export const PERCENTUAL_ROYALTIES_PADRAO: Record<'linha' | 'sazonal', number> = { linha: 37, sazonal: 27.5 };
