import type { CategoriaDespesa } from '../../despesas/models/despesa.model';

export interface Titulo {
  id: string;
  pedido_id: string | null;
  codigo: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  valor: number;
  lancamento_extrato_id?: string | null;
  categoria?: CategoriaDespesa | null;
  descricao?: string | null;
  fornecedor_id?: string | null;
  despesa_recorrente_id?: string | null;
  created_at: string;
}

export type TituloForm = Omit<Titulo, 'id' | 'created_at'>;
