import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { DespesasService } from '../../despesas/services/despesas.service';
import {
  AlertaItem, BucketFluxo, CapitalGiro, DespesasPorTipo,
  Granularidade, TipoAlerta, UrgenciaAlerta, VisaoGeralData,
} from '../models/visao-geral.model';

const JANELA_A_VENCER_DIAS = 15;
const MAX_ALERTAS = 8;

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const dow = (r.getDay() + 6) % 7; // segunda = 0
  r.setDate(r.getDate() - dow);
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
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

interface LancamentoRow {
  data_lancamento: string;
  valor: number;
  natureza: 'entrada' | 'saida';
}

interface TituloAbertoRow {
  valor: number;
  data_vencimento: string;
}

interface RecebimentoPrevistoRow {
  valor_liquido: number;
  data_prevista: string;
}

@Injectable({ providedIn: 'root' })
export class VisaoGeralService {
  private db = inject(SupabaseService).client;
  private despesasSvc = inject(DespesasService);

  async carregar(inicio: string, fim: string): Promise<VisaoGeralData> {
    const hoje = toIso(new Date());
    const now  = new Date();
    const ano  = now.getFullYear();
    const mes  = now.getMonth() + 1;
    const fimJanela = toIso(addDays(now, JANELA_A_VENCER_DIAS));

    // A partir de "hoje" ainda não há lançamento bancário real — usamos previsão
    // (títulos em aberto para saídas, recebimentos de cartão previstos para entradas).
    const inicioPrevisto = inicio > hoje ? inicio : hoje;

    const [lancamentosDesdeInicio, titulosAbertosNoPeriodo, recebimentosPrevistos, titulosFixas, templatesFixas, titulosPedidosMes, pendentes, saldoCaixa] = await Promise.all([
      this.db
        .from('lancamentos_extrato')
        .select('data_lancamento, valor, natureza')
        .gte('data_lancamento', inicio)
        .limit(20000),
      this.db
        .from('titulos')
        .select('valor, data_vencimento')
        .is('data_pagamento', null)
        .gte('data_vencimento', inicioPrevisto)
        .lte('data_vencimento', fim)
        .limit(20000),
      this.db
        .from('recebimentos_cartao')
        .select('valor_liquido, data_prevista')
        .gte('data_prevista', inicioPrevisto)
        .lte('data_prevista', fim)
        .limit(20000),
      this.despesasSvc.listarTitulosDespesa(),
      this.despesasSvc.listarTemplates(),
      this.despesasSvc.listarTitulosPedidosMes(ano, mes),
      this.db
        .from('titulos')
        .select(`
          id, codigo, descricao, categoria, valor, data_vencimento, data_pagamento, pedido_id,
          fornecedores(nome),
          pedido:pedidos(codigo, fornecedor:fornecedores(nome), tipo_pedido:tipos_pedido(nome))
        `)
        .is('data_pagamento', null)
        .lte('data_vencimento', fimJanela)
        .order('data_vencimento', { ascending: true })
        .limit(200),
      this.saldoCaixaHoje(),
    ]);

    if (lancamentosDesdeInicio.error) throw lancamentosDesdeInicio.error;
    if (titulosAbertosNoPeriodo.error) throw titulosAbertosNoPeriodo.error;
    if (recebimentosPrevistos.error) throw recebimentosPrevistos.error;

    const todasDesdeInicio = (lancamentosDesdeInicio.data ?? []) as LancamentoRow[];

    // Saldo no início do período = saldo atual "rebobinado", descontando os lançamentos
    // reais ocorridos a partir do início (nunca há lançamento real além de "hoje").
    const netDesdeInicio = todasDesdeInicio.reduce(
      (s, r) => s + (r.natureza === 'entrada' ? r.valor : -Math.abs(r.valor)), 0
    );
    const saldoInicial = saldoCaixa - netDesdeInicio;

    const rowsReaisNoPeriodo = todasDesdeInicio.filter(r => r.data_lancamento.slice(0, 10) < hoje);

    // Templates ativos de despesa fixa (exclui royalties/FPP, que seguem fluxo próprio de apuração).
    // Nem todo template já tem o título do mês gerado — nesse caso projetamos o valor estimado
    // na data do dia de vencimento do template, senão eles ficam de fora do gráfico.
    const templatesFixasAtivos = templatesFixas.filter(tpl =>
      tpl.ativo && !['royalties', 'fpp'].includes(tpl.categoria ?? '')
    );

    const fixasProjetadasSemTitulo: TituloAbertoRow[] = [];
    for (const tpl of templatesFixasAtivos) {
      for (const { ano: anoM, mes: mesM } of enumerarMeses(inicioPrevisto, fim)) {
        const prefixoM = `${anoM}-${String(mesM).padStart(2, '0')}`;
        const jaTemTitulo = titulosFixas.some(t => t.despesa_recorrente_id === tpl.id && t.data_vencimento?.startsWith(prefixoM));
        if (jaTemTitulo) continue;
        const diaMaxM = new Date(anoM, mesM, 0).getDate();
        const dataVenc = `${anoM}-${String(mesM).padStart(2, '0')}-${String(Math.min(tpl.dia_venc, diaMaxM)).padStart(2, '0')}`;
        if (dataVenc >= inicioPrevisto && dataVenc <= fim) {
          fixasProjetadasSemTitulo.push({ valor: tpl.valor_estimado, data_vencimento: dataVenc });
        }
      }
    }

    const granularidade = this.granularidadePara(inicio, fim);
    const buckets = this.montarBuckets(
      inicio, fim, granularidade,
      rowsReaisNoPeriodo,
      [...(titulosAbertosNoPeriodo.data ?? []) as TituloAbertoRow[], ...fixasProjetadasSemTitulo],
      (recebimentosPrevistos.data ?? []) as RecebimentoPrevistoRow[],
      saldoInicial,
    );

    const totalEntradas = buckets.reduce((s, b) => s + b.entradas, 0);
    const totalSaidas   = buckets.reduce((s, b) => s + b.saidas, 0);

    const mesPrefixo = `${ano}-${String(mes).padStart(2, '0')}`;
    const royaltiesFppMes = titulosFixas.filter(t =>
      t.data_vencimento?.startsWith(mesPrefixo) &&
      ['royalties', 'fpp'].includes(t.categoria ?? '')
    );

    const diaMax = new Date(ano, mes, 0).getDate();
    const dataProjetada = (diaVenc: number) =>
      `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(diaVenc, diaMax)).padStart(2, '0')}`;

    const fixasComTitulo = templatesFixasAtivos.map(tpl => ({
      tpl,
      titulo: titulosFixas.find(t => t.despesa_recorrente_id === tpl.id && t.data_vencimento?.startsWith(mesPrefixo)),
    }));

    // Custo fixo mensal (capital de giro) = compromisso total do mês, pago ou não,
    // com base no valor estimado de todos os templates ativos (independe de o título já ter sido gerado).
    const valorFixasMes = templatesFixasAtivos.reduce((s, tpl) => s + tpl.valor_estimado, 0);

    // "Despesas pendentes" = o que ainda falta pagar no mês (título em aberto ou nem gerado ainda).
    const fixasPrevistas = fixasComTitulo.filter(({ titulo }) => !titulo?.data_pagamento);
    const royaltiesFppPrevistas = royaltiesFppMes.filter(t => !t.data_pagamento);
    const pedidosPrevistos = titulosPedidosMes.filter(t => !t.data_pagamento);

    const despesasPorTipo: DespesasPorTipo = {
      fixas: fixasPrevistas.reduce((s, { tpl, titulo }) => s + (titulo?.valor ?? tpl.valor_estimado), 0),
      pedidos: pedidosPrevistos.reduce((s, t) => s + t.valor, 0),
      royaltiesFpp: royaltiesFppPrevistas.reduce((s, t) => s + t.valor, 0),
      itensFixas: fixasPrevistas.map(({ tpl, titulo }) => ({
        id: titulo?.id ?? tpl.id,
        descricao: titulo?.descricao ?? tpl.descricao,
        dataVencimento: titulo?.data_vencimento ?? dataProjetada(tpl.dia_venc),
        valor: titulo?.valor ?? tpl.valor_estimado,
      })).sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento)),
      itensPedidos: pedidosPrevistos.map(t => ({
        id: t.id,
        descricao: [t.pedido?.fornecedor?.nome, t.pedido?.codigo ?? t.codigo].filter(Boolean).join(' · '),
        dataVencimento: t.data_vencimento ?? '',
        valor: t.valor,
      })).sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento)),
      itensRoyaltiesFpp: royaltiesFppPrevistas.map(t => ({
        id: t.id,
        descricao: t.descricao ?? t.codigo,
        dataVencimento: t.data_vencimento ?? '',
        valor: t.valor,
      })).sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento)),
    };

    const capitalGiro: CapitalGiro = {
      saldoCaixa,
      custoFixoMensal: valorFixasMes,
      mesesReserva: valorFixasMes > 0 ? saldoCaixa / valorFixasMes : 0,
    };

    const alertas = this.montarAlertas((pendentes.data ?? []) as any[], hoje);

    return { granularidade, buckets, totalEntradas, totalSaidas, capitalGiro, despesasPorTipo, alertas };
  }

  private async saldoCaixaHoje(): Promise<number> {
    const { data } = await this.db
      .from('lancamentos_extrato')
      .select('saldo')
      .order('data_lancamento', { ascending: false })
      .order('ordem_original', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as any)?.saldo ?? 0;
  }

  private granularidadePara(inicio: string, fim: string): Granularidade {
    const dias = (new Date(fim).getTime() - new Date(inicio).getTime()) / 86400000 + 1;
    if (dias <= 31) return 'dia';
    if (dias <= 120) return 'semana';
    return 'mes';
  }

  private montarBuckets(
    inicio: string, fim: string, granularidade: Granularidade,
    lancamentosReais: LancamentoRow[],
    titulosAbertos: TituloAbertoRow[],
    recebimentosPrevistos: RecebimentoPrevistoRow[],
    saldoInicial: number,
  ): BucketFluxo[] {
    const inicioD = new Date(inicio + 'T00:00:00');
    const fimD    = new Date(fim + 'T00:00:00');
    const somaDia = new Map<string, { entradas: number; saidas: number }>();

    const add = (dia: string, entradas: number, saidas: number) => {
      const acc = somaDia.get(dia) ?? { entradas: 0, saidas: 0 };
      acc.entradas += entradas;
      acc.saidas += saidas;
      somaDia.set(dia, acc);
    };

    // Antes de hoje: única e exclusivamente o extrato bancário real (o que já aconteceu).
    for (const r of lancamentosReais) {
      const dia = r.data_lancamento.slice(0, 10);
      add(dia, r.natureza === 'entrada' ? r.valor : 0, r.natureza === 'saida' ? Math.abs(r.valor) : 0);
    }
    // Hoje em diante: previsão (títulos em aberto = saída prevista; recebimentos de cartão = entrada prevista).
    for (const t of titulosAbertos) {
      add(t.data_vencimento.slice(0, 10), 0, t.valor);
    }
    for (const rc of recebimentosPrevistos) {
      add(rc.data_prevista.slice(0, 10), rc.valor_liquido, 0);
    }

    type Slot = { chave: string; label: string; inicio: Date; fim: Date };
    const slots: Slot[] = [];

    if (granularidade === 'dia') {
      for (let d = new Date(inicioD); d <= fimD; d = addDays(d, 1)) {
        const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        slots.push({ chave: toIso(d), label, inicio: new Date(d), fim: new Date(d) });
      }
    } else if (granularidade === 'semana') {
      let cursor = startOfWeek(inicioD);
      while (cursor <= fimD) {
        const fimSemana = addDays(cursor, 6);
        slots.push({
          chave: toIso(cursor),
          label: cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          inicio: new Date(cursor),
          fim: fimSemana,
        });
        cursor = addDays(cursor, 7);
      }
    } else {
      let cursor = startOfMonth(inicioD);
      while (cursor <= fimD) {
        const fimMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        const label = cursor.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
        slots.push({ chave: toIso(cursor), label, inicio: new Date(cursor), fim: fimMes });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    }

    let saldoAcumulado = saldoInicial;
    return slots.map(slot => {
      let entradas = 0, saidas = 0;
      for (let d = new Date(slot.inicio); d <= slot.fim; d = addDays(d, 1)) {
        const acc = somaDia.get(toIso(d));
        if (acc) { entradas += acc.entradas; saidas += acc.saidas; }
      }
      saldoAcumulado += entradas - saidas;
      return { label: slot.label, entradas, saidas, saldo: saldoAcumulado };
    });
  }

  private montarAlertas(rows: any[], hoje: string): AlertaItem[] {
    const fmtData = (iso: string) => {
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    };

    const alertas: AlertaItem[] = rows.map(t => {
      const venc = t.data_vencimento as string;
      const atrasado = venc < hoje;
      const hojeFlag = venc === hoje;
      const urgencia: UrgenciaAlerta = (atrasado || hojeFlag) ? 'urgente' : 'em_breve';
      const tipo: TipoAlerta = t.pedido_id ? 'pedido' : (['royalties', 'fpp'].includes(t.categoria) ? 'royalties' : 'fixa');

      let titulo: string;
      let subtitulo: string;

      if (tipo === 'pedido') {
        titulo = atrasado ? 'Pedido atrasado' : hojeFlag ? 'Pedido vence hoje' : 'Pedido a vencer';
        const fornecedor = t.pedido?.fornecedor?.nome ?? '—';
        const tipoPedido = t.pedido?.tipo_pedido?.nome ?? t.pedido?.codigo ?? '';
        subtitulo = [fornecedor, tipoPedido, fmtData(venc)].filter(Boolean).join(' · ');
      } else if (tipo === 'royalties') {
        titulo = atrasado ? 'Royalties + FPP atrasado' : hojeFlag ? 'Royalties + FPP vence hoje' : 'Royalties + FPP a vencer';
        subtitulo = [t.descricao, fmtData(venc)].filter(Boolean).join(' · ');
      } else {
        const dia = venc.slice(8, 10);
        titulo = `${t.descricao ?? 'Despesa'} ${atrasado ? 'atrasada' : hojeFlag ? 'vence hoje' : 'a vencer'}`;
        subtitulo = `Despesa fixa · dia ${dia} · ${fmtData(venc)}`;
      }

      return { id: t.id, tipo, titulo, subtitulo, valor: t.valor, dataVencimento: venc, urgencia };
    });

    return alertas
      .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
      .sort((a, b) => (a.urgencia === b.urgencia ? 0 : a.urgencia === 'urgente' ? -1 : 1))
      .slice(0, MAX_ALERTAS);
  }
}
