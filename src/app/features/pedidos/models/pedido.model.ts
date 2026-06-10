export type StatusPedido = 'recebido' | 'pendente' | 'cancelado';

export interface ItemPedido {
  id: string;
  pedido_id: string;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  valor_unitario: number | null;
  valor_total: number | null;
  ean: string | null;
  c_prod: string | null;
  venda_unitario: number | null;
  venda_total: number | null;
}

export type ItemPedidoForm = Omit<ItemPedido, 'id' | 'pedido_id'>;

export interface Pedido {
  id: string;
  fornecedor_id: string | null;
  tipo_pedido_id: string | null;
  codigo: string | null;
  data_limite: string | null;
  numero_nf: string | null;
  data_emissao: string | null;
  valor_total: number | null;
  status: StatusPedido;
  pdf_url: string | null;
  observacoes: string | null;
  valor_venda: number | null;
  percentual_royalties: number | null;
  created_at: string;
  fornecedor?: { nome: string };
  tipo_pedido?: { nome: string };
  titulos?: { valor: number; data_pagamento: string | null; data_vencimento: string | null }[];
}

export type PedidoForm = Omit<Pedido, 'id' | 'created_at' | 'fornecedor' | 'tipo_pedido'>;

export interface DuplicataExtraida {
  codigo: string;
  data_vencimento: string | null;
  valor: number;
}

export interface DadosExtraidosPdf {
  codigo: string | null;
  data_limite: string | null;
  numero_nf: string | null;
  data_emissao: string | null;
  valor_total: number | null;
  nome_emitente: string | null;
  cnpj_emitente: string | null;
  itens: ItemPedidoForm[];
  duplicatas: DuplicataExtraida[];
}
