import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { DespesaRecorrente, DespesaRecorrenteForm } from '../models/despesa.model';

export interface TituloDespesa {
  id: string;
  codigo: string;
  descricao: string | null;
  categoria: string | null;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  lancamento_extrato_id: string | null;
  despesa_recorrente_id: string | null;
  fornecedores: { nome: string; categoria_fornecedor?: { id: string; nome: string } | null } | null;
}

export interface TituloPedidoMes {
  id: string;
  codigo: string;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  pedido: { codigo: string | null; fornecedor: { nome: string } | null } | null;
}

export interface TituloRoyaltiesMes {
  id: string;
  codigo: string;
  descricao: string | null;
  categoria: string | null;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
}

@Injectable({ providedIn: 'root' })
export class DespesasService {
  private db = inject(SupabaseService).client;

  async listarTemplates(): Promise<DespesaRecorrente[]> {
    const { data, error } = await this.db
      .from('despesas_recorrentes')
      .select('*, fornecedor:fornecedores(id, nome, categoria_fornecedor:categorias_fornecedor(id, nome))')
      .order('descricao');
    if (error) throw error;
    return data ?? [];
  }

  async salvarTemplate(form: DespesaRecorrenteForm): Promise<DespesaRecorrente> {
    const { data, error } = await this.db
      .from('despesas_recorrentes')
      .insert(form)
      .select('*, fornecedor:fornecedores(id, nome, categoria_fornecedor:categorias_fornecedor(id, nome))')
      .single();
    if (error) throw error;
    return data;
  }

  async atualizarTemplate(id: string, form: Partial<DespesaRecorrenteForm>): Promise<void> {
    const { error } = await this.db
      .from('despesas_recorrentes')
      .update(form)
      .eq('id', id);
    if (error) throw error;
  }

  async excluirTemplate(id: string): Promise<void> {
    const { error } = await this.db
      .from('despesas_recorrentes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async listarExcecoesMes(ano: number, mes: number): Promise<string[]> {
    const { data, error } = await this.db
      .from('despesas_recorrentes_excecoes_mes')
      .select('despesa_recorrente_id')
      .eq('ano', ano)
      .eq('mes', mes);
    if (error) throw error;
    return (data ?? []).map(r => r.despesa_recorrente_id);
  }

  async desativarTemplateMes(templateId: string, ano: number, mes: number): Promise<void> {
    const { error } = await this.db
      .from('despesas_recorrentes_excecoes_mes')
      .upsert({ despesa_recorrente_id: templateId, ano, mes }, { onConflict: 'despesa_recorrente_id,ano,mes' });
    if (error) throw error;
  }

  async ativarTemplateMes(templateId: string, ano: number, mes: number): Promise<void> {
    const { error } = await this.db
      .from('despesas_recorrentes_excecoes_mes')
      .delete()
      .eq('despesa_recorrente_id', templateId)
      .eq('ano', ano)
      .eq('mes', mes);
    if (error) throw error;
  }

  async gerarMes(templateId: string, mes: number, ano: number): Promise<void> {
    const { data: tpl, error: e1 } = await this.db
      .from('despesas_recorrentes')
      .select('*')
      .eq('id', templateId)
      .single();
    if (e1) throw e1;

    const mesPad  = String(mes).padStart(2, '0');
    const nextMes = mes === 12
      ? `${ano + 1}-01`
      : `${ano}-${String(mes + 1).padStart(2, '0')}`;

    // Prevent duplicate generation
    const { data: existente } = await this.db
      .from('titulos')
      .select('id')
      .eq('despesa_recorrente_id', templateId)
      .gte('data_vencimento', `${ano}-${mesPad}-01`)
      .lt('data_vencimento', `${nextMes}-01`)
      .maybeSingle();
    if (existente) throw new Error('Título já gerado para este mês.');

    // Clamp dia to actual last day of month
    const diaMax = new Date(ano, mes, 0).getDate();
    const dia = String(Math.min(tpl.dia_venc, diaMax)).padStart(2, '0');
    const dataVenc = `${ano}-${mesPad}-${dia}`;

    const { error } = await this.db.from('titulos').insert({
      pedido_id:             null,
      codigo:                `DR-${templateId.slice(0, 8).toUpperCase()}-${ano}${mesPad}`,
      categoria:             tpl.categoria,
      descricao:             tpl.descricao,
      fornecedor_id:         tpl.fornecedor_id,
      despesa_recorrente_id: tpl.id,
      valor:                 tpl.valor_estimado,
      data_vencimento:       dataVenc,
      data_pagamento:        null,
    });
    if (error) throw error;
  }

  async listarTitulosDespesa(): Promise<TituloDespesa[]> {
    const { data, error } = await this.db
      .from('titulos')
      .select('id, codigo, descricao, categoria, valor, data_vencimento, data_pagamento, lancamento_extrato_id, despesa_recorrente_id, fornecedores(nome, categoria_fornecedor:categorias_fornecedor(id, nome))')
      .is('pedido_id', null)
      .order('data_vencimento', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as TituloDespesa[];
  }

  async listarTitulosPedidosMes(ano: number, mes: number): Promise<TituloPedidoMes[]> {
    const mesPad  = String(mes).padStart(2, '0');
    const nextMes = mes === 12
      ? `${ano + 1}-01`
      : `${ano}-${String(mes + 1).padStart(2, '0')}`;

    const { data, error } = await this.db
      .from('titulos')
      .select('id, codigo, valor, data_vencimento, data_pagamento, pedido:pedidos(codigo, fornecedor:fornecedores(nome))')
      .not('pedido_id', 'is', null)
      .gte('data_vencimento', `${ano}-${mesPad}-01`)
      .lt('data_vencimento', `${nextMes}-01`)
      .order('data_vencimento', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as TituloPedidoMes[];
  }

  async listarTitulosRoyaltiesMes(ano: number, mes: number): Promise<TituloRoyaltiesMes[]> {
    const mesPad  = String(mes).padStart(2, '0');
    const nextMes = mes === 12
      ? `${ano + 1}-01`
      : `${ano}-${String(mes + 1).padStart(2, '0')}`;

    const { data, error } = await this.db
      .from('titulos')
      .select('id, codigo, descricao, categoria, valor, data_vencimento, data_pagamento')
      .in('categoria', ['royalties', 'fpp'])
      .gte('data_vencimento', `${ano}-${mesPad}-01`)
      .lt('data_vencimento', `${nextMes}-01`)
      .order('data_vencimento', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as TituloRoyaltiesMes[];
  }

  async identificarLancamento(params: {
    lancamentoId: string;
    dataLancamento: string;
    valorReal: number;
    fornecedorId: string | null;
    descricao: string;
    templateId: string | null;
  }): Promise<void> {
    // If linked to a template, try to update a pre-generated pending título for the same month
    if (params.templateId) {
      const mes     = params.dataLancamento.slice(0, 7);
      const anoNum  = parseInt(mes.slice(0, 4));
      const mesNum  = parseInt(mes.slice(5, 7));
      const nextMes = mesNum === 12
        ? `${anoNum + 1}-01`
        : `${anoNum}-${String(mesNum + 1).padStart(2, '0')}`;

      const { data: existente } = await this.db
        .from('titulos')
        .select('id')
        .eq('despesa_recorrente_id', params.templateId)
        .gte('data_vencimento', `${mes}-01`)
        .lt('data_vencimento', `${nextMes}-01`)
        .is('data_pagamento', null)
        .maybeSingle();

      if (existente) {
        const { error } = await this.db
          .from('titulos')
          .update({
            data_pagamento:        params.dataLancamento,
            lancamento_extrato_id: params.lancamentoId,
            valor:                 params.valorReal,
          })
          .eq('id', existente.id);
        if (error) throw error;
        return;
      }
    }

    // Create a new título (avulsa, or recorrente with no pre-generated título)
    const { error } = await this.db.from('titulos').insert({
      pedido_id:             null,
      codigo:                `AV-${params.lancamentoId.slice(0, 8).toUpperCase()}`,
      categoria:             null,
      descricao:             params.descricao,
      fornecedor_id:         params.fornecedorId,
      despesa_recorrente_id: params.templateId,
      valor:                 params.valorReal,
      data_vencimento:       params.dataLancamento,
      data_pagamento:        params.dataLancamento,
      lancamento_extrato_id: params.lancamentoId,
    });
    if (error) throw error;
  }
}
