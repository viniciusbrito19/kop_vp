import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Fornecedor, FornecedorForm } from '../models/fornecedor.model';

@Injectable({ providedIn: 'root' })
export class FornecedoresService {
  private db = inject(SupabaseService).client;

  async listar(): Promise<Fornecedor[]> {
    const { data, error } = await this.db
      .from('fornecedores')
      .select('*, categoria_fornecedor:categorias_fornecedor(id, nome), chaves:fornecedor_chaves_extrato(id, chave)')
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

  async adicionarChaves(fornecedorId: string, chaves: string[]): Promise<void> {
    if (!chaves.length) return;
    const { error } = await this.db
      .from('fornecedor_chaves_extrato')
      .insert(chaves.map(chave => ({ fornecedor_id: fornecedorId, chave })));
    if (error) throw error;
  }

  async removerChaves(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const { error } = await this.db
      .from('fornecedor_chaves_extrato')
      .delete()
      .in('id', ids);
    if (error) throw error;
  }
}
