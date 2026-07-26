import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { RecebimentoCartao } from '../models/receita.model';

@Injectable({ providedIn: 'root' })
export class ReceitasService {
  private db = inject(SupabaseService).client;

  async listar(): Promise<RecebimentoCartao[]> {
    const PAGE = 1000;
    const raw: RecebimentoCartao[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await this.db
        .from('recebimentos_cartao')
        .select('id, data_prevista, data_venda, valor_liquido, created_at')
        .order('data_prevista')
        .range(offset, offset + PAGE - 1);
      if (error) throw error;
      const page = data ?? [];
      raw.push(...page);
      if (page.length < PAGE) break;
      offset += PAGE;
    }

    return raw;
  }

  // Substitui todos os registros no intervalo de datas do CSV (idempotente).
  async importar(registros: Pick<RecebimentoCartao, 'data_prevista' | 'data_venda' | 'valor_liquido'>[]): Promise<number> {
    if (registros.length === 0) return 0;
    const datas     = registros.map(r => r.data_prevista).sort();
    const dataMin   = datas[0];
    const dataMax   = datas[datas.length - 1];

    const { error: delErr } = await this.db
      .from('recebimentos_cartao')
      .delete()
      .gte('data_prevista', dataMin)
      .lte('data_prevista', dataMax);
    if (delErr) throw delErr;

    const { data, error } = await this.db
      .from('recebimentos_cartao')
      .insert(registros)
      .select('id');
    if (error) throw error;
    return (data ?? []).length;
  }

  parseCsv(text: string): Pick<RecebimentoCartao, 'data_prevista' | 'data_venda' | 'valor_liquido'>[] {
    const result: Pick<RecebimentoCartao, 'data_prevista' | 'data_venda' | 'valor_liquido'>[] = [];
    for (const linha of text.split('\n').slice(1)) {
      if (!linha.trim()) continue;
      const c = linha.split(';').map(s => s.trim());
      if (c.length < 10) continue;
      const dataPrevista = this._parseDate(c[0]);
      if (!dataPrevista) continue;
      result.push({
        data_prevista: dataPrevista,
        data_venda:    this._parseDate(c[1]),
        valor_liquido: this._parseNum(c[9]),
      });
    }
    return result;
  }

  private _parseDate(s: string): string | null {
    const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  }

  private _parseNum(s: string): number {
    return parseFloat(s.replace(',', '.')) || 0;
  }
}
