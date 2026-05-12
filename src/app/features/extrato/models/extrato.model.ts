export type NaturezaLancamento = 'entrada' | 'saida';

export type TipoLancamento =
  | 'pix_enviado'
  | 'pix_recebido'
  | 'pix_devolvido'
  | 'pagamento_efetuado'
  | 'compra_debito'
  | 'deposito_boleto'
  | 'recebimento_cartao'
  | 'transferencia_recebida'
  | 'debito_conta'
  | 'outros_pagamentos'
  | 'outros_recebimentos';

export const LABELS_TIPO: Record<TipoLancamento, string> = {
  pix_enviado: 'Pix enviado',
  pix_recebido: 'Pix recebido',
  pix_devolvido: 'Pix devolvido',
  pagamento_efetuado: 'Pagamento efetuado',
  compra_debito: 'Compra no débito',
  deposito_boleto: 'Depósito em boleto',
  recebimento_cartao: 'Recebimento cartão',
  transferencia_recebida: 'Transferência recebida',
  debito_conta: 'Débito em conta',
  outros_pagamentos: 'Outros pagamentos',
  outros_recebimentos: 'Outros recebimentos',
};

export interface LancamentoExtrato {
  id: string;
  data_lancamento: string; // YYYY-MM-DD
  natureza: NaturezaLancamento;
  tipo: TipoLancamento;
  destinatario_remetente: string;
  descricao_original: string;
  valor: number;
  saldo: number;
  ordem_original: number;
  hash: string;
  created_at: string;
}
