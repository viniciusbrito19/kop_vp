import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Titulo, TituloForm } from '../models/titulo.model';
import { CorrelacaoService } from '../../extrato/services/correlacao.service';

@Injectable({ providedIn: 'root' })
export class TitulosService {
  private db = inject(SupabaseService).client;
  private correlacaoSvc = inject(CorrelacaoService);

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
    try { await this.correlacaoSvc.executar(); } catch { /* silent */ }
    return data;
  }

  async excluir(id: string): Promise<void> {
    const { error } = await this.db.from('titulos').delete().eq('id', id);
    if (error) throw error;
  }
}
