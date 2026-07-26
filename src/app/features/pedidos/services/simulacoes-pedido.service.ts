import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { SimulacaoPedido, SimulacaoPedidoDados, SimulacaoPedidoResumo } from '../models/simulacao-pedido.model';

@Injectable({ providedIn: 'root' })
export class SimulacoesPedidoService {
  private db = inject(SupabaseService).client;

  async listar(): Promise<SimulacaoPedidoResumo[]> {
    const { data, error } = await this.db
      .from('simulacoes_pedido')
      .select('id, nome, created_at, updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async buscarPorId(id: string): Promise<SimulacaoPedido> {
    const { data, error } = await this.db
      .from('simulacoes_pedido')
      .select('id, nome, dados, created_at, updated_at')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as SimulacaoPedido;
  }

  async salvar(nome: string, dados: SimulacaoPedidoDados): Promise<SimulacaoPedidoResumo> {
    const { data, error } = await this.db
      .from('simulacoes_pedido')
      .insert({ nome, dados })
      .select('id, nome, created_at, updated_at')
      .single();
    if (error) throw error;
    return data as SimulacaoPedidoResumo;
  }

  async atualizar(id: string, nome: string, dados: SimulacaoPedidoDados): Promise<void> {
    const { error } = await this.db
      .from('simulacoes_pedido')
      .update({ nome, dados, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async excluir(id: string): Promise<void> {
    const { error } = await this.db.from('simulacoes_pedido').delete().eq('id', id);
    if (error) throw error;
  }
}
