export interface CategoriaFornecedor {
  id: string;
  nome: string;
  created_at: string;
}

export type CategoriaFornecedorForm = Pick<CategoriaFornecedor, 'nome'>;
