import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Titulo, TituloForm } from '../models/titulo.model';

@Injectable({ providedIn: 'root' })
export class TitulosService {
  private db = inject(SupabaseService).client;

  async listarPorPedido(pedidoId: string): Promise<Titulo[]> {
    const { data, error } = await this.db
      .from('titulos')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('data_vencimento', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async salvar(form: TituloForm): Promise<Titulo> {
    const { data, error } = await this.db
      .from('titulos')
      .insert(form)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async excluir(id: string): Promise<void> {
    const { error } = await this.db.from('titulos').delete().eq('id', id);
    if (error) throw error;
  }
}
