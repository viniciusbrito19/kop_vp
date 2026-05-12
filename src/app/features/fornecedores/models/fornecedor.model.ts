export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string | null;
  created_at: string;
}

export type FornecedorForm = Omit<Fornecedor, 'id' | 'created_at'>;
