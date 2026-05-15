import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface ResumoMes {
  entradas: number;
  saidas: number;
  saldo: number;
  margem: number;
}

export interface MesResumo {
  mes: string;        // YYYY-MM
  entradas: number;
  saidas: number;
  saldo: number;
  projetado: boolean;
}

@Injectable({ providedIn: 'root' })
export class FluxoCaixaService {
  private db = inject(SupabaseService).client;

  async resumoMes(ano: number, mes: number): Promise<ResumoMes> {
    const mesPad  = String(mes).padStart(2, '0');
    const from    = `${ano}-${mesPad}-01`;
    const nextAno = mes === 12 ? ano + 1 : ano;
    const nextMes = mes === 12 ? '01' : String(mes + 1).padStart(2, '0');
    const to      = `${nextAno}-${nextMes}-01`;

    const { data, error } = await this.db
      .from('lancamentos_extrato')
      .select('valor, natureza')
      .gte('data_lancamento', from)
      .lt('data_lancamento', to)
      .limit(10000);

    if (error) throw error;

    const rows     = data ?? [];
    const entradas = rows.filter(r => r.natureza === 'entrada').reduce((s, r) => s + r.valor, 0);
    const saidas   = rows.filter(r => r.natureza === 'saida').reduce((s, r) => s + Math.abs(r.valor), 0);
    const saldo    = entradas - saidas;
    const margem   = entradas > 0 ? (saldo / entradas) * 100 : 0;

    return { entradas, saidas, saldo, margem };
  }

  async historicoEProjecao(): Promise<{ historico: MesResumo[]; projecao: MesResumo[]; saldoBanco: number }> {
    const now = new Date();
    const ano = now.getFullYear();

    const mesKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Monta lista de meses históricos da abertura (Dez/2025) até o mês corrente
    const mesesHist: Date[] = [];
    let cursor = new Date(2025, 11, 1); // dezembro/2025
    const atual = new Date(ano, now.getMonth(), 1);
    while (cursor <= atual) {
      mesesHist.push(new Date(cursor));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    // 3 meses de projeção
    const mesesProj = [1, 2, 3].map(i => new Date(ano, now.getMonth() + i, 1));

    // Uma query por mês (usa gte + lt): evita qualquer limite de linhas do servidor
    const [histResults, projRefResults, saldoRow] = await Promise.all([
      Promise.all(mesesHist.map(d => this.resumoMes(d.getFullYear(), d.getMonth() + 1))),
      Promise.all(mesesProj.map(d => this.resumoMes(d.getFullYear() - 1, d.getMonth() + 1))),
      this.db
        .from('lancamentos_extrato')
        .select('saldo')
        .order('data_lancamento', { ascending: false })
        .order('ordem_original', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const saldoBanco = (saldoRow.data as any)?.saldo ?? 0;

    const historico: MesResumo[] = mesesHist.map((d, i) => ({
      mes:       mesKey(d),
      entradas:  histResults[i].entradas,
      saidas:    histResults[i].saidas,
      saldo:     histResults[i].saldo,
      projetado: false,
    }));

    // Fallback: média dos últimos 3 meses históricos
    const last3 = historico.slice(-3);
    const n3    = Math.max(last3.length, 1);
    const avgE  = last3.reduce((s, m) => s + m.entradas, 0) / n3;
    const avgS  = last3.reduce((s, m) => s + m.saidas,   0) / n3;

    const projecao: MesResumo[] = mesesProj.map((d, i) => {
      const ref      = projRefResults[i];
      const entradas = ref.entradas > 0 ? ref.entradas : avgE;
      const saidas   = ref.saidas   > 0 ? ref.saidas   : avgS;
      return { mes: mesKey(d), entradas, saidas, saldo: entradas - saidas, projetado: true };
    });

    return { historico, projecao, saldoBanco };
  }
}
