import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  LancamentoExtrato,
  NaturezaLancamento,
  TipoLancamento,
} from '../models/extrato.model';
import { CorrelacaoService } from './correlacao.service';

type LancamentoInsert = Omit<LancamentoExtrato, 'id' | 'created_at' | 'pedido'>;

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

  async listar(): Promise<LancamentoExtrato[]> {
    const PAGE = 1000;
    const raw: any[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await this.db
        .from('lancamentos_extrato')
        .select('*, titulos(pedido_id, categoria, descricao, pedidos(id, codigo))')
        .order('data_lancamento', { ascending: false })
        .order('ordem_original', { ascending: false })
        .range(offset, offset + PAGE - 1);
      if (error) throw error;
      const page = data ?? [];
      raw.push(...page);
      if (page.length < PAGE) break;
      offset += PAGE;
    }

    return raw.map(row => {
      const { titulos: rawTitulos, ...rest } = row as any;
      const titulo = (rawTitulos as any[] | null)?.[0];
      const pedido  = titulo?.pedido_id ? (titulo?.pedidos ?? null) : null;
      const despesa = titulo && !titulo.pedido_id
        ? { descricao: titulo.descricao ?? null, categoria: titulo.categoria ?? null }
        : null;
      return { ...rest, pedido, despesa } as LancamentoExtrato;
    });
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
