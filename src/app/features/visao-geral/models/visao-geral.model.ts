export type Granularidade = 'dia' | 'semana' | 'mes';

export interface BucketFluxo {
  label: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

export interface ItemDespesaTipo {
  id: string;
  descricao: string;
  dataVencimento: string;
  valor: number;
}

export interface DespesasPorTipo {
  fixas: number;
  pedidos: number;
  royaltiesFpp: number;
  itensFixas: ItemDespesaTipo[];
  itensPedidos: ItemDespesaTipo[];
  itensRoyaltiesFpp: ItemDespesaTipo[];
}

export interface CapitalGiro {
  saldoCaixa: number;
  custoFixoMensal: number;
  mesesReserva: number;
}

export type UrgenciaAlerta = 'urgente' | 'em_breve';
export type TipoAlerta = 'pedido' | 'royalties' | 'fixa';

export interface AlertaItem {
  id: string;
  tipo: TipoAlerta;
  titulo: string;
  subtitulo: string;
  valor: number;
  dataVencimento: string;
  urgencia: UrgenciaAlerta;
}

export interface VisaoGeralData {
  granularidade: Granularidade;
  buckets: BucketFluxo[];
  totalEntradas: number;
  totalSaidas: number;
  capitalGiro: CapitalGiro;
  despesasPorTipo: DespesasPorTipo;
  alertas: AlertaItem[];
}
