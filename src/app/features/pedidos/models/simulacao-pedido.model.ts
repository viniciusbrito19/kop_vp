export interface ItemSimulado {
  codigo_sap: string;
  descricao: string;
  preco_compra: number | null;
  preco_venda: number | null;
  cobra_fpp: boolean;
  cobra_royalties: boolean;
  quantidade: number;
}

/** Estado completo da simulação, persistido como JSON. */
export interface SimulacaoPedidoDados {
  itens: ItemSimulado[];
  aliquotaRoyalties: number | null;
  dataEmissao: string;
  fppOffsetDias: number;
  offsetsRoyalties: number[];
  offsetsCompra: number[];
}

export interface SimulacaoPedidoResumo {
  id: string;
  nome: string;
  created_at: string;
  updated_at: string;
}

export interface SimulacaoPedido extends SimulacaoPedidoResumo {
  dados: SimulacaoPedidoDados;
}
