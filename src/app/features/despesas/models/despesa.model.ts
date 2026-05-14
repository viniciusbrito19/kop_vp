export type CategoriaDespesa =
  | 'fornecedor' | 'funcionario' | 'aluguel'
  | 'energia' | 'agua' | 'royalties' | 'fpp' | 'outro';

export const LABELS_CATEGORIA: Record<CategoriaDespesa, string> = {
  fornecedor:  'Fornecedor',
  funcionario: 'Funcionário',
  aluguel:     'Aluguel',
  energia:     'Energia',
  agua:        'Água',
  royalties:   'Royalties',
  fpp:         'FPP',
  outro:       'Outro',
};

export const CATEGORIAS_DESPESA = (Object.keys(LABELS_CATEGORIA) as CategoriaDespesa[]).map(k => ({
  value: k,
  label: LABELS_CATEGORIA[k],
}));

export interface DespesaRecorrente {
  id: string;
  fornecedor_id: string | null;
  categoria: CategoriaDespesa | null;
  descricao: string;
  valor_estimado: number;
  dia_venc: number;
  ativo: boolean;
  created_at: string;
  fornecedor?: { id: string; nome: string; categoria_fornecedor?: { id: string; nome: string } | null } | null;
}

export type DespesaRecorrenteForm = Omit<DespesaRecorrente, 'id' | 'created_at' | 'fornecedor'>;
