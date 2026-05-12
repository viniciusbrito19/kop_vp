import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { TipoPedido, TipoPedidoForm } from '../models/tipo-pedido.model';

@Injectable({ providedIn: 'root' })
export class TiposPedidoService {
  private db = inject(SupabaseService).client;

  async listar(apenasAtivos = false): Promise<TipoPedido[]> {
    let query = this.db.from('tipos_pedido').select('*').order('nome');
    if (apenasAtivos) query = query.eq('ativo', true);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async salvar(form: TipoPedidoForm): Promise<TipoPedido> {
    const { data, error } = await this.db
      .from('tipos_pedido')
      .insert(form)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async atualizar(id: string, form: Partial<TipoPedidoForm>): Promise<void> {
    const { error } = await this.db.from('tipos_pedido').update(form).eq('id', id);
    if (error) throw error;
  }

  async excluir(id: string): Promise<void> {
    const { error } = await this.db.from('tipos_pedido').delete().eq('id', id);
    if (error) throw error;
  }
}
