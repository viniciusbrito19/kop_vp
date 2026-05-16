export interface Item {
  id: string;
  codigo_sap: string | null;
  descricao: string;
  unidade: string | null;
  ean: string | null;
  preco_venda: number | null;
  ativo: boolean;
  created_at: string;
}
