export interface TipoPedido {
  id: string;
  nome: string;
  ativo: boolean;
  incide_royalties: boolean;
  tipo_royalties: 'linha' | 'sazonal' | null;
  created_at: string;
}

export type TipoPedidoForm = Pick<TipoPedido, 'nome' | 'ativo' | 'incide_royalties' | 'tipo_royalties'>;
