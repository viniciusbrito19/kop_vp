import type { CategoriaFornecedor } from '../../categorias-fornecedor/models/categoria-fornecedor.model';

export interface FornecedorChave {
  id: string;
  chave: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string | null;
  categoria_fornecedor_id: string | null;
  categoria_fornecedor?: CategoriaFornecedor | null;
  chaves?: FornecedorChave[];
  created_at: string;
}

export type FornecedorForm = Omit<Fornecedor, 'id' | 'created_at' | 'chaves' | 'categoria_fornecedor'>;
