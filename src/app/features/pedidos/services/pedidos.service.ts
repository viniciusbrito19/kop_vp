import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Pedido, PedidoForm, ItemPedidoForm } from '../models/pedido.model';

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private db = inject(SupabaseService).client;

  async listar(): Promise<Pedido[]> {
    const { data, error } = await this.db
      .from('pedidos')
      .select('*, fornecedor:fornecedores(nome), tipo_pedido:tipos_pedido(nome), titulos(valor, data_pagamento, data_vencimento)')
      .order('data_limite', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async buscarPorId(id: string): Promise<Pedido> {
    const { data, error } = await this.db
      .from('pedidos')
      .select('*, fornecedor:fornecedores(nome), tipo_pedido:tipos_pedido(nome)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async salvar(form: PedidoForm, itens: ItemPedidoForm[]): Promise<Pedido> {
    const { data: pedido, error } = await this.db
      .from('pedidos')
      .insert(form)
      .select()
      .single();
    if (error) throw error;

    if (itens.length > 0) {
      const { error: itemError } = await this.db
        .from('itens_pedido')
        .insert(itens.map(item => ({ ...item, pedido_id: pedido.id })));
      if (itemError) throw itemError;
    }

    return pedido;
  }

  async buscarItens(pedidoId: string) {
    const { data, error } = await this.db
      .from('itens_pedido')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('id');
    if (error) throw error;
    return data ?? [];
  }

  async atualizar(id: string, form: PedidoForm, itens: ItemPedidoForm[]): Promise<void> {
    const { error } = await this.db.from('pedidos').update(form).eq('id', id);
    if (error) throw error;
    // Replace items wholesale: delete existing, re-insert new ones
    await this.db.from('itens_pedido').delete().eq('pedido_id', id);
    if (itens.length > 0) {
      const { error: itemError } = await this.db
        .from('itens_pedido')
        .insert(itens.map(item => ({ ...item, pedido_id: id })));
      if (itemError) throw itemError;
    }
  }

  async excluir(id: string): Promise<void> {
    const { error } = await this.db.from('pedidos').delete().eq('id', id);
    if (error) throw error;
  }

  async verificarDuplicata(
    numeroNf: string | null,
    codigo: string | null,
    excludeId?: string | null,
  ): Promise<Pedido | null> {
    if (!numeroNf && !codigo) return null;

    let query = this.db
      .from('pedidos')
      .select('*, fornecedor:fornecedores(nome)')
      .limit(1);

    if (numeroNf) {
      query = query.eq('numero_nf', numeroNf);
    } else {
      query = query.eq('codigo', codigo!);
    }

    if (excludeId) query = query.neq('id', excludeId);

    const { data } = await query.maybeSingle();
    return data ?? null;
  }
}
