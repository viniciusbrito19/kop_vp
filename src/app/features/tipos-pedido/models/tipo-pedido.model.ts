export interface TipoPedido {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export type TipoPedidoForm = Pick<TipoPedido, 'nome' | 'ativo'>;
