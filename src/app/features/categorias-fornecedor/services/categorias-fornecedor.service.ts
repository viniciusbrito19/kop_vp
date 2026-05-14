import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { CategoriaFornecedor, CategoriaFornecedorForm } from '../models/categoria-fornecedor.model';

@Injectable({ providedIn: 'root' })
export class CategoriasFornecedorService {
  private db = inject(SupabaseService).client;

  async listar(): Promise<CategoriaFornecedor[]> {
    const { data, error } = await this.db
      .from('categorias_fornecedor')
      .select('*')
      .order('nome');
    if (error) throw error;
    return data ?? [];
  }

  async salvar(form: CategoriaFornecedorForm): Promise<CategoriaFornecedor> {
    const { data, error } = await this.db
      .from('categorias_fornecedor')
      .insert(form)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async atualizar(id: string, form: CategoriaFornecedorForm): Promise<void> {
    const { error } = await this.db
      .from('categorias_fornecedor')
      .update(form)
      .eq('id', id);
    if (error) throw error;
  }

  async excluir(id: string): Promise<void> {
    const { error } = await this.db
      .from('categorias_fornecedor')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
}
