export interface ApuracaoCrm {
  id: string;
  ano: number;
  mes: number;
  quinzena: 1 | 2;
  data_inicio: string;
  data_fim: string;
  data_vencimento: string;
  total_venda: number;
  total_linha: number;
  total_sazonal: number;
  valor_fpp: number;
  valor_roy_linha: number;
  valor_roy_sazonal: number;
  status: 'calculado' | 'confirmado';
  created_at: string;
}

export interface PedidoApuracao {
  pedido_id: string;
  numero_nf: string | null;
  data_emissao: string;
  tipo: 'linha' | 'sazonal';
  valor_venda: number;
  itens_sem_ean: number;
}

export interface PreviewApuracao {
  pedidos: PedidoApuracao[];
  total_linha: number;
  total_sazonal: number;
  total_venda: number;
  fpp: number;
  roy_linha: number;
  roy_sazonal: number;
}

export interface ItemReconciliado {
  item_pedido_id: string;
  descricao_pedido: string;
  descricao_produto: string;
  ean: string;
  estrategia: 'exato' | 'normalizado';
}

export interface ItemSemMatch {
  descricao: string;
  ocorrencias: number;
  pedidos: { pedido_id: string; numero_nf: string | null }[];
}

export interface ResultadoReconciliacao {
  reconciliados: ItemReconciliado[];
  semMatch: ItemSemMatch[];
  totalItens: number;
  jaComEan: number;
}

export interface ProdutoCatalogo {
  ean: string;
  descricao: string;
  preco_venda: number | null;
}
