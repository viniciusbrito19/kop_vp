import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Item } from '../models/produto.model';

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

  async excluir(id: string): Promise<void> {
    const { error } = await this.db.from('itens').delete().eq('id', id);
    if (error) throw error;
  }
}
