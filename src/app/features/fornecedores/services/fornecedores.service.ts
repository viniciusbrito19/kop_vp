import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Fornecedor, FornecedorForm } from '../models/fornecedor.model';

@Injectable({ providedIn: 'root' })
export class FornecedoresService {
  private db = inject(SupabaseService).client;

  async listar(): Promise<Fornecedor[]> {
    const { data, error } = await this.db
      .from('fornecedores')
      .select('*')
      .order('nome');
    if (error) throw error;
    return data ?? [];
  }

  async salvar(form: FornecedorForm): Promise<Fornecedor> {
    const { data, error } = await this.db
      .from('fornecedores')
      .insert(form)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async atualizar(id: string, form: Partial<FornecedorForm>): Promise<void> {
    const { error } = await this.db
      .from('fornecedores')
      .update(form)
      .eq('id', id);
    if (error) throw error;
  }

  async excluir(id: string): Promise<void> {
    const { error } = await this.db
      .from('fornecedores')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
}
