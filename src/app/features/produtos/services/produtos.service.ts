import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Item } from '../models/produto.model';

type ProdutoCsv = Pick<Item, 'codigo_sap' | 'descricao' | 'unidade' | 'ean' | 'preco_venda' | 'ativo'>;

@Injectable({ providedIn: 'root' })
export class ProdutosService {
  private db = inject(SupabaseService).client;

  async listar(): Promise<Item[]> {
    const { data, error } = await this.db
      .from('itens')
      .select('*')
      .order('descricao');
    if (error) throw error;
    return data ?? [];
  }

  async toggleAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await this.db.from('itens').update({ ativo }).eq('id', id);
    if (error) throw error;
  }

  async toggleFlag(id: string, campo: 'cobra_fpp' | 'cobra_royalties', valor: boolean): Promise<void> {
    const { error } = await this.db.from('itens').update({ [campo]: valor }).eq('id', id);
    if (error) throw error;
  }

  async excluir(id: string): Promise<void> {
    const { error } = await this.db.from('itens').delete().eq('id', id);
    if (error) throw error;
  }

  async importarCsv(
    file: File,
    existentes: Item[],
  ): Promise<{ inseridos: number; ignorados: number; novosItens: Item[] }> {
    const texto = await this.lerArquivo(file);
    const registros = this.parsearCsv(texto);

    if (registros.length === 0) throw new Error('Nenhum produto encontrado no arquivo.');

    const eans = new Set(existentes.map(i => i.ean).filter(Boolean));
    const saps = new Set(existentes.map(i => i.codigo_sap).filter(Boolean));

    const novos = registros.filter(r => {
      if (r.ean) return !eans.has(r.ean);
      if (r.codigo_sap) return !saps.has(r.codigo_sap);
      return true;
    });

    const ignorados = registros.length - novos.length;
    if (novos.length === 0) return { inseridos: 0, ignorados, novosItens: [] };

    const { data, error } = await this.db
      .from('itens')
      .insert(novos.map(r => ({ ...r, cobra_fpp: false, cobra_royalties: false })))
      .select();

    if (error) throw error;
    const novosItens = (data ?? []) as Item[];
    return { inseridos: novosItens.length, ignorados, novosItens };
  }

  private async lerArquivo(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    let texto = new TextDecoder('utf-8').decode(buffer);
    if (texto.includes('DescriÃ') || texto.includes('PreÃ')) {
      texto = new TextDecoder('iso-8859-1').decode(buffer);
    }
    return texto;
  }

  private parsearCsv(texto: string): ProdutoCsv[] {
    const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
    const idxHeader = linhas.findIndex(l => /^Produto/i.test(l));
    if (idxHeader === -1) throw new Error('Formato inválido: cabeçalho "Produto" não encontrado.');

    return linhas.slice(idxHeader + 1).flatMap(linha => {
      const p = linha.split(';');
      if (p.length < 6) return [];
      const descricao = p[2]?.trim();
      const codigo_sap = p[1]?.trim() || null;
      if (!descricao || !codigo_sap) return [];
      const preco = parseFloat((p[5] ?? '').replace(',', '.'));
      return [{
        codigo_sap,
        descricao,
        unidade:     p[3]?.trim() || null,
        ean:         p[4]?.trim() || null,
        preco_venda: isNaN(preco) ? null : preco,
        ativo:       p[6]?.trim().toUpperCase() === 'ATIVO',
      }];
    });
  }
}
