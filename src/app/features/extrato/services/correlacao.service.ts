import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';

@Injectable({ providedIn: 'root' })
export class CorrelacaoService {
  private db = inject(SupabaseService).client;

  async executar(): Promise<number> {
    const { data: titulos, error: e1 } = await this.db
      .from('titulos')
      .select('id, valor, data_vencimento')
      .is('data_pagamento', null)
      .is('lancamento_extrato_id', null);
    if (e1) throw e1;
    if (!titulos?.length) return 0;

    const { data: lancamentos, error: e2 } = await this.db
      .from('lancamentos_extrato')
      .select('id, data_lancamento, valor')
      .eq('tipo', 'pagamento_efetuado')
      .order('data_lancamento', { ascending: true });
    if (e2) throw e2;
    if (!lancamentos?.length) return 0;

    // Exclude extrato entries already linked to a título
    const { data: jaVinculados } = await this.db
      .from('titulos')
      .select('lancamento_extrato_id')
      .not('lancamento_extrato_id', 'is', null);
    const idsOcupados = new Set(
      (jaVinculados ?? []).map(t => t.lancamento_extrato_id as string)
    );

    const pendentes = lancamentos.filter(l => !idsOcupados.has(l.id));
    if (!pendentes.length) return 0;

    // Group unpaid titulos by valor (integer cents to avoid float precision issues)
    const porValor = new Map<number, { id: string; data_vencimento: string | null }[]>();
    for (const t of titulos) {
      const key = Math.round(t.valor * 100);
      if (!porValor.has(key)) porValor.set(key, []);
      porValor.get(key)!.push(t);
    }

    let correlacoes = 0;
    const usados = new Set<string>();

    for (const lanc of pendentes) {
      const key = Math.round(Math.abs(lanc.valor) * 100);
      const candidatos = (porValor.get(key) ?? []).filter(t => !usados.has(t.id));
      if (!candidatos.length) continue;

      // Among same-value titles, pick the one with data_vencimento nearest to data_lancamento
      const dataLanc = new Date(lanc.data_lancamento).getTime();
      let melhor = candidatos[0];
      for (const c of candidatos.slice(1)) {
        if (!melhor.data_vencimento) { melhor = c; continue; }
        if (!c.data_vencimento) continue;
        const diffMelhor = Math.abs(new Date(melhor.data_vencimento).getTime() - dataLanc);
        const diffC = Math.abs(new Date(c.data_vencimento).getTime() - dataLanc);
        if (diffC < diffMelhor) melhor = c;
      }

      const { error } = await this.db
        .from('titulos')
        .update({ data_pagamento: lanc.data_lancamento, lancamento_extrato_id: lanc.id })
        .eq('id', melhor.id);

      if (!error) {
        usados.add(melhor.id);
        correlacoes++;
      }
    }

    return correlacoes;
  }
}
