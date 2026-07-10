import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  LancamentoExtrato,
  NaturezaLancamento,
  TipoLancamento,
} from '../models/extrato.model';
import { CorrelacaoService } from './correlacao.service';

type LancamentoInsert = Omit<LancamentoExtrato, 'id' | 'created_at' | 'pedido'>;

export type ColunaOrdenavelExtrato = 'data_lancamento' | 'tipo' | 'valor';

export interface FiltrosExtrato {
  dataInicio: string | null;
  dataFim: string | null;
  natureza: NaturezaLancamento | '' | null;
  tipo: TipoLancamento | '' | null;
  destinatario: string | null;
  vinculado: boolean | null;
}

export interface ListarExtratoParams {
  page: number;
  pageSize: number;
  sortActive: ColunaOrdenavelExtrato | '';
  sortDirection: 'asc' | 'desc' | '';
  filtros: FiltrosExtrato;
}

export interface TotaisExtrato {
  totalEntradas: number;
  totalSaidas: number;
  qtdEntradas: number;
  qtdSaidas: number;
}

const SELECT_LANCAMENTO = '*, titulos(pedido_id, categoria, descricao, pedidos(id, codigo))';
const SELECT_LANCAMENTO_VINCULADO =
  '*, titulos!inner(pedido_id, categoria, descricao, pedidos(id, codigo))';

@Injectable({ providedIn: 'root' })
export class ExtratoService {
  private db = inject(SupabaseService).client;
  private correlacaoSvc = inject(CorrelacaoService);

  async atualizarTipo(id: string, tipo: TipoLancamento): Promise<void> {
    const { error } = await this.db
      .from('lancamentos_extrato')
      .update({ tipo })
      .eq('id', id);
    if (error) throw error;
  }

  async listar(params: ListarExtratoParams): Promise<{ data: LancamentoExtrato[]; count: number }> {
    const { page, pageSize, sortActive, sortDirection, filtros } = params;
    const offset = page * pageSize;

    let query = this.db
      .from('lancamentos_extrato')
      .select(filtros.vinculado ? SELECT_LANCAMENTO_VINCULADO : SELECT_LANCAMENTO, { count: 'exact' });

    query = this.aplicarFiltros(query, filtros);

    if (sortActive && sortDirection) {
      query = query.order(sortActive, { ascending: sortDirection === 'asc' });
    } else {
      query = query.order('data_lancamento', { ascending: false });
    }
    query = query.order('ordem_original', { ascending: false });
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return { data: (data ?? []).map(this.mapearLinha), count: count ?? 0 };
  }

  /** Busca a tabela inteira (sem paginação) — usado por telas que precisam agregar
   * sobre todo o histórico do extrato (ex.: KPIs de recebimento em receitas-futuras). */
  async listarTodos(): Promise<LancamentoExtrato[]> {
    const PAGE = 1000;
    const raw: any[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await this.db
        .from('lancamentos_extrato')
        .select(SELECT_LANCAMENTO)
        .order('data_lancamento', { ascending: false })
        .order('ordem_original', { ascending: false })
        .range(offset, offset + PAGE - 1);
      if (error) throw error;
      const page = data ?? [];
      raw.push(...page);
      if (page.length < PAGE) break;
      offset += PAGE;
    }

    return raw.map(this.mapearLinha);
  }

  private mapearLinha(row: any): LancamentoExtrato {
    const { titulos: rawTitulos, ...rest } = row;
    const titulo = (rawTitulos as any[] | null)?.[0];
    const pedido  = titulo?.pedido_id ? (titulo?.pedidos ?? null) : null;
    const despesa = titulo && !titulo.pedido_id
      ? { descricao: titulo.descricao ?? null, categoria: titulo.categoria ?? null }
      : null;
    return { ...rest, pedido, despesa } as LancamentoExtrato;
  }

  async totais(filtros: FiltrosExtrato): Promise<TotaisExtrato> {
    const { data, error } = await this.db.rpc('extrato_totais', {
      p_data_inicio:  filtros.dataInicio || null,
      p_data_fim:     filtros.dataFim || null,
      p_natureza:     filtros.natureza || null,
      p_tipo:         filtros.tipo || null,
      p_destinatario: filtros.destinatario || null,
      p_vinculado:    filtros.vinculado || null,
    });
    if (error) throw error;

    const linha = (data as any[] | null)?.[0];
    return {
      totalEntradas: Number(linha?.total_entradas ?? 0),
      totalSaidas:   Number(linha?.total_saidas ?? 0),
      qtdEntradas:   Number(linha?.qtd_entradas ?? 0),
      qtdSaidas:     Number(linha?.qtd_saidas ?? 0),
    };
  }

  async saldoAtual(): Promise<number> {
    const { data, error } = await this.db
      .from('lancamentos_extrato')
      .select('saldo')
      .order('data_lancamento', { ascending: false })
      .order('ordem_original', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.saldo ?? 0;
  }

  private aplicarFiltros(query: any, filtros: FiltrosExtrato): any {
    if (filtros.dataInicio) query = query.gte('data_lancamento', filtros.dataInicio);
    if (filtros.dataFim) query = query.lte('data_lancamento', filtros.dataFim);
    if (filtros.natureza) query = query.eq('natureza', filtros.natureza);
    if (filtros.tipo) query = query.eq('tipo', filtros.tipo);
    if (filtros.destinatario) query = query.ilike('destinatario_remetente', `%${filtros.destinatario}%`);
    return query;
  }

  async excluir(id: string): Promise<void> {
    const { error } = await this.db
      .from('lancamentos_extrato')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async desvincular(lancamentoId: string): Promise<void> {
    const { data: titulos, error: e1 } = await this.db
      .from('titulos')
      .select('id, pedido_id, despesa_recorrente_id')
      .eq('lancamento_extrato_id', lancamentoId);
    if (e1) throw e1;

    const titulo = titulos?.[0];
    if (!titulo) return;

    if (titulo.pedido_id || titulo.despesa_recorrente_id) {
      // Título estruturado: volta a "pendente de pagamento"
      const { error } = await this.db
        .from('titulos')
        .update({ lancamento_extrato_id: null, data_pagamento: null })
        .eq('id', titulo.id);
      if (error) throw error;
    } else {
      // Despesa avulsa: criada só para este lançamento, pode ser excluída
      const { error } = await this.db
        .from('titulos')
        .delete()
        .eq('id', titulo.id);
      if (error) throw error;
    }
  }

  async importarCsv(file: File): Promise<{ inseridos: number; duplicatas: number }> {
    const texto = await this.lerArquivo(file);
    const lancamentos = this.parsearCsv(texto);

    if (lancamentos.length === 0) {
      throw new Error('Nenhum lançamento encontrado no arquivo.');
    }

    // Relies on UNIQUE(hash) in the DB — duplicates are silently ignored.
    const { data, error } = await this.db
      .from('lancamentos_extrato')
      .upsert(lancamentos, { onConflict: 'hash', ignoreDuplicates: true })
      .select('id');

    if (error) throw error;

    const inseridos = (data ?? []).length;
    const duplicatas = lancamentos.length - inseridos;
    try { await this.correlacaoSvc.executar(); } catch { /* silent */ }
    return { inseridos, duplicatas };
  }

  private async lerArquivo(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    // Try UTF-8 first; fall back to ISO-8859-1 (common in Brazilian bank exports)
    let texto = new TextDecoder('utf-8').decode(buffer);
    if (texto.includes('PerÃ') || texto.includes('LanÃ') || texto.includes('DescriÃ')) {
      texto = new TextDecoder('iso-8859-1').decode(buffer);
    }
    return texto;
  }

  private parsearCsv(texto: string): LancamentoInsert[] {
    const linhas = texto
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const idxHeader = linhas.findIndex(l => /^Data/i.test(l));
    if (idxHeader === -1) {
      throw new Error('Formato de CSV inválido: cabeçalho não encontrado.');
    }

    const resultado: LancamentoInsert[] = [];

    for (const linha of linhas.slice(idxHeader + 1)) {
      const partes = linha.split(';');
      if (partes.length < 4) continue;

      const dataStr = partes[0].trim();
      const descricao = partes[1].trim();
      const valorStr = partes[2].trim();
      const saldoStr = partes[3].trim();

      const data = this.parsearData(dataStr);
      const valor = this.parsearValor(valorStr);
      const saldo = this.parsearValor(saldoStr);

      if (!data || isNaN(valor) || isNaN(saldo)) continue;

      const natureza: NaturezaLancamento = valor >= 0 ? 'entrada' : 'saida';
      const tipo = this.classificarTipo(descricao, natureza);
      const destinatario = this.extrairDestinatario(descricao);
      const hash = `${dataStr}|${descricao}|${valorStr}|${saldoStr}`;

      resultado.push({
        data_lancamento: data,
        natureza,
        tipo,
        destinatario_remetente: destinatario,
        descricao_original: descricao,
        valor,
        saldo,
        ordem_original: resultado.length,
        hash,
      });
    }

    return resultado;
  }

  private parsearData(dataStr: string): string | null {
    const match = dataStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  private parsearValor(valorStr: string): number {
    return parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
  }

  private classificarTipo(descricao: string, natureza: NaturezaLancamento): TipoLancamento {
    const d = descricao.toLowerCase();

    if (d.includes('pix enviado devolvido') || d.includes('pix recebido devolvido')) {
      return 'pix_devolvido';
    }
    if (d.startsWith('pix enviado')) return 'pix_enviado';
    if (d.startsWith('pix recebido')) return 'pix_recebido';
    if (d.startsWith('pagamento efetuado')) return 'pagamento_efetuado';
    if (d.startsWith('compra no debito') || d.startsWith('compra no débito')) {
      return 'compra_debito';
    }
    if (d.startsWith('boleto de cobranca') || d.startsWith('boleto de cobrança')) {
      return 'deposito_boleto';
    }
    if (d.startsWith('credito domicilio') || d.startsWith('crédito domicílio')) {
      return 'recebimento_cartao';
    }
    if (d.includes('transferencia recebida') || d.includes('transferência recebida')) {
      return 'transferencia_recebida';
    }
    if (/^d[eé]bito\b/.test(d) && !d.includes('debito no cartao')) {
      return 'debito_conta';
    }

    return natureza === 'entrada' ? 'outros_recebimentos' : 'outros_pagamentos';
  }

  private extrairDestinatario(descricao: string): string {
    const quotedMatch = descricao.match(/"([^"]+)"/);
    if (!quotedMatch) return descricao.trim();

    const conteudo = quotedMatch[1].trim();

    // "Cp :CNPJ-NOME" → NOME
    const cpMatch = conteudo.match(/^Cp\s*:\s*\d+-(.+)$/i);
    if (cpMatch) return cpMatch[1].trim();

    // "00019 NUMBER NOME..." → NOME
    const numMatch = conteudo.match(/^00019\s+\d+\s+(.+)$/);
    if (numMatch) return numMatch[1].trim();

    // "No estabelecimento NOME CIDADE BRA" → NOME (strip last 2 words: city + BRA)
    const estabMatch = conteudo.match(/^No estabelecimento\s+(.+)/i);
    if (estabMatch) {
      const palavras = estabMatch[1].trim().split(/\s+/);
      if (palavras.length >= 3 && palavras[palavras.length - 1].toUpperCase() === 'BRA') {
        return palavras.slice(0, -2).join(' ');
      }
      return estabMatch[1].trim();
    }

    return conteudo;
  }
}
