import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { DespesasService } from '../../despesas/services/despesas.service';

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function enumerarMeses(inicioIso: string, fimIso: string): { ano: number; mes: number }[] {
  const [anoIni, mesIni] = inicioIso.split('-').map(Number);
  const [anoFim, mesFim] = fimIso.split('-').map(Number);
  const meses: { ano: number; mes: number }[] = [];
  let ano = anoIni, mes = mesIni;
  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    meses.push({ ano, mes });
    mes++;
    if (mes > 12) { mes = 1; ano++; }
  }
  return meses;
}

@Injectable({ providedIn: 'root' })
export class ProjecaoCaixaService {
  private db = inject(SupabaseService).client;
  private despesasSvc = inject(DespesasService);

  /**
   * Para cada data informada, calcula o saldo de caixa projetado até aquela data:
   * saldo atual do extrato + recebimentos de cartão previstos - títulos pendentes
   * (despesas, pedidos, royalties/FPP já cadastrados) - despesas recorrentes ativas
   * ainda sem título gerado no mês. Não considera as parcelas da simulação em si —
   * isso é comparado depois, no componente. Mesma lógica de projeção usada na tela
   * Visão Geral (src/app/features/visao-geral/services/visao-geral.service.ts).
   */
  async saldoProjetadoEmDatas(datas: string[]): Promise<Record<string, number>> {
    const hoje = toIso(new Date());
    const datasUnicas = [...new Set(datas.filter(Boolean))];
    if (datasUnicas.length === 0) return {};

    const dataMax = datasUnicas.reduce((max, d) => (d > max ? d : max), hoje);

    const [saldoRes, titulosRes, recebimentosRes, titulosFixas, templatesFixas] = await Promise.all([
      this.db
        .from('lancamentos_extrato')
        .select('saldo')
        .order('data_lancamento', { ascending: false })
        .order('ordem_original', { ascending: false })
        .limit(1)
        .maybeSingle(),
      this.db
        .from('titulos')
        .select('valor, data_vencimento')
        .is('data_pagamento', null)
        .gte('data_vencimento', hoje)
        .lte('data_vencimento', dataMax)
        .limit(20000),
      this.db
        .from('recebimentos_cartao')
        .select('valor_liquido, data_prevista')
        .gte('data_prevista', hoje)
        .lte('data_prevista', dataMax)
        .limit(20000),
      this.despesasSvc.listarTitulosDespesa(),
      this.despesasSvc.listarTemplates(),
    ]);

    if (saldoRes.error) throw saldoRes.error;
    if (titulosRes.error) throw titulosRes.error;
    if (recebimentosRes.error) throw recebimentosRes.error;

    const saldoAtual = (saldoRes.data as { saldo: number } | null)?.saldo ?? 0;

    // Templates ativos de despesa fixa (exclui royalties/FPP, que já entram via `titulos`
    // pendentes acima). Nem todo template já tem o título do mês gerado — projeta pelo
    // valor estimado na data do dia de vencimento quando ainda não existir.
    const templatesFixasAtivos = templatesFixas.filter(tpl =>
      tpl.ativo && !['royalties', 'fpp'].includes(tpl.categoria ?? '')
    );

    const saidasFixasProjetadas: { valor: number; data_vencimento: string }[] = [];
    for (const tpl of templatesFixasAtivos) {
      for (const { ano, mes } of enumerarMeses(hoje, dataMax)) {
        const prefixo = `${ano}-${String(mes).padStart(2, '0')}`;
        const jaTemTitulo = titulosFixas.some(t =>
          t.despesa_recorrente_id === tpl.id && t.data_vencimento?.startsWith(prefixo)
        );
        if (jaTemTitulo) continue;
        const diaMax = new Date(ano, mes, 0).getDate();
        const dataVenc = `${prefixo}-${String(Math.min(tpl.dia_venc, diaMax)).padStart(2, '0')}`;
        if (dataVenc >= hoje && dataVenc <= dataMax) {
          saidasFixasProjetadas.push({ valor: tpl.valor_estimado, data_vencimento: dataVenc });
        }
      }
    }

    const saidas = [
      ...((titulosRes.data ?? []) as { valor: number; data_vencimento: string }[]),
      ...saidasFixasProjetadas,
    ];
    const entradas = (recebimentosRes.data ?? []) as { valor_liquido: number; data_prevista: string }[];

    const resultado: Record<string, number> = {};
    for (const data of datasUnicas) {
      const totalSaidas = saidas
        .filter(s => s.data_vencimento <= data)
        .reduce((s, x) => s + x.valor, 0);
      const totalEntradas = entradas
        .filter(e => e.data_prevista <= data)
        .reduce((s, x) => s + x.valor_liquido, 0);
      resultado[data] = saldoAtual + totalEntradas - totalSaidas;
    }
    return resultado;
  }
}
