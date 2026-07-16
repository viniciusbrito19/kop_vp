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
  fpp_emitido: boolean;
  royalties_emitidos: boolean;
  credito_devolucao_garantida: number;
  credito_devolucoes_produto_linha: number;
  credito_devolucoes_produto_sazonal: number;
  credito_outros_linha: number;
  credito_outros_sazonal: number;
  valor_roy_liquido_linha: number | null;
  valor_roy_liquido_sazonal: number | null;
  created_at: string;
}

export interface TituloApuracao {
  id: string;
  codigo: string;
  descricao: string | null;
  categoria: string | null;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  lancamento_extrato_id: string | null;
}

export interface ItemApuracao {
  descricao: string;
  quantidade: number;
  custo_unitario: number | null;
  custo_total: number | null;
  preco_total_venda: number;
  cobra_fpp: boolean;
  cobra_royalties: boolean;
  fpp: number;
  base_royalties: number;
  royalties: number;
  sem_ean: boolean;
}

export interface PedidoApuracao {
  pedido_id: string;
  codigo: string | null;
  numero_nf: string | null;
  data_emissao: string;
  tipo: 'linha' | 'sazonal';
  aliquota_royalties: number;
  valor_venda: number;
  itens_sem_ean: number;
  itens: ItemApuracao[];
}

/** Royalties de um mesmo período podem ter alíquotas diferentes (ex.: Linha 27,5% e Linha 37%) — cada combinação (tipo, alíquota) é apurada e emitida separadamente. */
export interface GrupoRoyalties {
  tipo: 'linha' | 'sazonal';
  aliquota: number;
  roy_bruto: number;
  /** Σ valor dos produtos sem imposto (vProd/NF) dos pedidos do grupo — base da Devolução Garantida (só relevante para tipo 'linha'). */
  valor_produtos_sem_imposto: number;
  /** 0 para grupos 'sazonal' — a Devolução Garantida só se aplica a Linha. */
  credito_devolucao_garantida: number;
}

export interface PreviewApuracao {
  pedidos: PedidoApuracao[];
  total_linha: number;
  total_sazonal: number;
  total_venda: number;
  fpp: number;
  fpp_linha: number;
  fpp_sazonal: number;
  roy_linha: number;
  roy_sazonal: number;
  credito_devolucao_garantida: number;
  valor_produtos_sem_imposto_linha: number;
  grupos_royalties: GrupoRoyalties[];
}

export interface ItemReconciliado {
  item_pedido_id: string;
  descricao_pedido: string;
  descricao_produto: string;
  ean: string;
  estrategia: 'c_prod';
}

/** Item cujo cProd bate com mais de um codigo_sap no catálogo. */
export interface ItemMultiMatch {
  item_pedido_id: string;
  descricao_pedido: string | null;
  c_prod: string;
  candidatos: Array<{ ean: string; descricao: string; codigo_sap: string; cobra_fpp: boolean; cobra_royalties: boolean }>;
  pedido_id: string;
  numero_nf: string | null;
}

/** Item sem correspondência por EAN nem por cProd. */
export interface ItemSemMatch {
  descricao: string;
  c_prod: string | null;
  ocorrencias: number;
  pedidos: { pedido_id: string; numero_nf: string | null }[];
}

export interface ItemEanSemCatalogo {
  ean: string;
  descricoes: string[];
  ocorrencias: number;
  pedidos: { pedido_id: string; numero_nf: string | null }[];
}

export interface ResultadoReconciliacao {
  reconciliados: ItemReconciliado[];
  multiMatch: ItemMultiMatch[];
  semMatch: ItemSemMatch[];
  eanSemCatalogo: ItemEanSemCatalogo[];
  totalItens: number;
  jaComEan: number;
}

export interface ProdutoCatalogo {
  ean: string;
  descricao: string;
  codigo_sap: string | null;
  preco_venda: number | null;
  cobra_fpp: boolean;
  cobra_royalties: boolean;
}
