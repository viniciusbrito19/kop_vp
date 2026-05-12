export interface Titulo {
  id: string;
  pedido_id: string;
  codigo: string;           // XXXXXXXX/XXX  (8 dígitos / número da parcela)
  data_vencimento: string | null;
  data_pagamento: string | null;
  valor: number;
  lancamento_extrato_id?: string | null;
  created_at: string;
}

export type TituloForm = Omit<Titulo, 'id' | 'created_at'>;
