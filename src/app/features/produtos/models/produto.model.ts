export interface Item {
  id: string;
  codigo_sap: string | null;
  descricao: string;
  unidade: string | null;
  ean: string | null;
  preco_venda: number | null;
  ativo: boolean;
  cobra_fpp: boolean;
  cobra_royalties: boolean;
  created_at: string;
}
