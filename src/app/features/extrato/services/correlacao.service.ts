import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';

@Injectable({ providedIn: 'root' })
export class CorrelacaoService {
  private db = inject(SupabaseService).client;

  async executar(): Promise<number> {
    const { data: titulos, error: e1 } = await this.db
      .from('titulos')
      .select('id, valor, data_vencimento, pedidos(data_emissao, fornecedores(fornecedor_chaves_extrato(chave)))')
      .is('data_pagamento', null)
      .is('lancamento_extrato_id', null)
      .not('pedido_id', 'is', null);   // pass 1 only covers NF-e titles
    if (e1) throw e1;

    const { data: lancamentos, error: e2 } = await this.db
      .from('lancamentos_extrato')
      .select('id, data_lancamento, valor, destinatario_remetente')
      .eq('natureza', 'saida')
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

    let correlacoes = 0;
    const usadosTitulos = new Set<string>();
    const usadosLanc    = new Set<string>();

    // ── Pass 1: exact value match (NF-e titles) ───────────────────────────
    if (titulos?.length) {
      type TituloEntry = {
        id: string;
        data_vencimento: string | null;
        data_emissao: string | null;
        chaves: string[];
      };
      const porValor = new Map<number, TituloEntry[]>();
      for (const t of titulos) {
        const key = Math.round(t.valor * 100);
        if (!porValor.has(key)) porValor.set(key, []);
        const pedido = (t as any).pedidos as any;
        const chaves: string[] = (pedido?.fornecedores?.fornecedor_chaves_extrato as { chave: string }[] | null)
          ?.map(k => k.chave.toLowerCase()) ?? [];
        porValor.get(key)!.push({
          id:              t.id,
          data_vencimento: t.data_vencimento,
          data_emissao:    pedido?.data_emissao ?? null,
          chaves,
        });
      }

      for (const lanc of pendentes) {
        const key       = Math.round(Math.abs(lanc.valor) * 100);
        const dataLancMs = new Date(lanc.data_lancamento).getTime();
        const dest      = lanc.destinatario_remetente.toLowerCase();

        const candidatos = (porValor.get(key) ?? []).filter(t => {
          if (usadosTitulos.has(t.id)) return false;
          // Payment must not predate the invoice emission
          if (t.data_emissao && lanc.data_lancamento < t.data_emissao) return false;
          // If supplier keys are configured, destinatário must match at least one
          if (t.chaves.length && !t.chaves.some(k => dest.includes(k))) return false;
          return true;
        });
        if (!candidatos.length) continue;

        // Among same-value titles, pick the one with data_vencimento nearest to data_lancamento
        let melhor = candidatos[0];
        for (const c of candidatos.slice(1)) {
          if (!melhor.data_vencimento) { melhor = c; continue; }
          if (!c.data_vencimento) continue;
          const diffMelhor = Math.abs(new Date(melhor.data_vencimento).getTime() - dataLancMs);
          const diffC      = Math.abs(new Date(c.data_vencimento).getTime() - dataLancMs);
          if (diffC < diffMelhor) melhor = c;
        }

        const { error } = await this.db
          .from('titulos')
          .update({ data_pagamento: lanc.data_lancamento, lancamento_extrato_id: lanc.id })
          .eq('id', melhor.id);

        if (!error) {
          usadosTitulos.add(melhor.id);
          usadosLanc.add(lanc.id);
          correlacoes++;
        }
      }
    }

    // ── Pass 2: recurring expense titles matched by supplier key + month ──
    const { data: titulosRec } = await this.db
      .from('titulos')
      .select('id, valor, data_vencimento, despesas_recorrentes(fornecedor_id, fornecedores(fornecedor_chaves_extrato(chave)))')
      .is('data_pagamento', null)
      .is('lancamento_extrato_id', null)
      .not('despesa_recorrente_id', 'is', null);

    if (titulosRec?.length) {
      const pendentesP2 = pendentes.filter(l => !usadosLanc.has(l.id));

      for (const lanc of pendentesP2) {
        const dest    = lanc.destinatario_remetente.toLowerCase();
        const lancMes = lanc.data_lancamento.slice(0, 7); // YYYY-MM

        const titulo = titulosRec.find(t => {
          if (usadosTitulos.has(t.id)) return false;
          const dr     = (t as any).despesas_recorrentes as any;
          const chaves = dr?.fornecedores?.fornecedor_chaves_extrato as { chave: string }[] | null;
          if (!chaves?.length) return false;
          if (!chaves.some(k => dest.includes(k.chave.toLowerCase()))) return false;
          return t.data_vencimento?.startsWith(lancMes) ?? false;
        });

        if (!titulo) continue;

        const { error } = await this.db
          .from('titulos')
          .update({
            data_pagamento:        lanc.data_lancamento,
            lancamento_extrato_id: lanc.id,
            valor:                 Math.abs(lanc.valor), // update to real paid amount
          })
          .eq('id', titulo.id);

        if (!error) {
          usadosTitulos.add(titulo.id);
          usadosLanc.add(lanc.id);
          correlacoes++;
        }
      }
    }

    return correlacoes;
  }

  /**
   * Concilia saídas não identificadas do extrato com despesas recorrentes ativas.
   * Cobre todos os tipos de transação (pix, débito, pagamento, etc.).
   * Se já existe título pendente para o mês → vincula.
   * Se não existe → cria o título e vincula.
   */
  async conciliarDespesas(): Promise<{ vinculadas: number; criadas: number }> {
    // 1. Todas as saídas ainda não vinculadas a nenhum título
    const { data: todasSaidas, error: eSaidas } = await this.db
      .from('lancamentos_extrato')
      .select('id, data_lancamento, valor, destinatario_remetente')
      .eq('natureza', 'saida');
    if (eSaidas) throw eSaidas;

    const { data: jaVinculados } = await this.db
      .from('titulos')
      .select('lancamento_extrato_id')
      .not('lancamento_extrato_id', 'is', null);

    const idsOcupados = new Set(
      (jaVinculados ?? []).map(t => t.lancamento_extrato_id as string)
    );
    const pendentes = (todasSaidas ?? []).filter(l => !idsOcupados.has(l.id));
    if (!pendentes.length) return { vinculadas: 0, criadas: 0 };

    // 2. Templates ativos com chaves do fornecedor
    const { data: templates, error: eTemplates } = await this.db
      .from('despesas_recorrentes')
      .select('id, descricao, valor_estimado, dia_venc, fornecedor_id, fornecedores(fornecedor_chaves_extrato(chave))')
      .eq('ativo', true);
    if (eTemplates) throw eTemplates;
    if (!templates?.length) return { vinculadas: 0, criadas: 0 };

    // 3. Títulos pendentes já gerados para esses templates
    const { data: titulosPendentes } = await this.db
      .from('titulos')
      .select('id, data_vencimento, despesa_recorrente_id')
      .is('data_pagamento', null)
      .is('lancamento_extrato_id', null)
      .not('despesa_recorrente_id', 'is', null);

    let vinculadas = 0;
    let criadas    = 0;
    const usadosLanc    = new Set<string>();
    const usadosTitulos = new Set<string>();

    for (const lanc of pendentes) {
      if (usadosLanc.has(lanc.id)) continue;
      const dest    = lanc.destinatario_remetente.toLowerCase();
      const lancMes = lanc.data_lancamento.slice(0, 7); // YYYY-MM

      const template = (templates as any[]).find(t => {
        const chaves = t.fornecedores?.fornecedor_chaves_extrato as { chave: string }[] | null;
        return chaves?.some(k => dest.includes(k.chave.toLowerCase()));
      });
      if (!template) continue;

      // Título pré-gerado para o mesmo template + mês?
      const tituloExistente = (titulosPendentes ?? []).find(t =>
        t.despesa_recorrente_id === template.id &&
        !usadosTitulos.has(t.id) &&
        t.data_vencimento?.startsWith(lancMes)
      );

      if (tituloExistente) {
        const { error } = await this.db
          .from('titulos')
          .update({
            data_pagamento:        lanc.data_lancamento,
            lancamento_extrato_id: lanc.id,
            valor:                 Math.abs(lanc.valor),
          })
          .eq('id', tituloExistente.id);

        if (!error) {
          usadosTitulos.add(tituloExistente.id);
          usadosLanc.add(lanc.id);
          vinculadas++;
        }
      } else {
        // Gera título para o mês e já vincula ao lançamento
        const [anoStr, mesStr] = lancMes.split('-');
        const ano = parseInt(anoStr);
        const mes = parseInt(mesStr);
        const diaMax  = new Date(ano, mes, 0).getDate();
        const dia     = String(Math.min(template.dia_venc, diaMax)).padStart(2, '0');
        const dataVenc = `${lancMes}-${dia}`;
        const codigo   = `DR-${template.id.slice(0, 8).toUpperCase()}-${anoStr}${mesStr}`;

        const { error } = await this.db.from('titulos').insert({
          pedido_id:             null,
          codigo,
          categoria:             null,
          descricao:             template.descricao,
          fornecedor_id:         template.fornecedor_id,
          despesa_recorrente_id: template.id,
          valor:                 Math.abs(lanc.valor),
          data_vencimento:       dataVenc,
          data_pagamento:        lanc.data_lancamento,
          lancamento_extrato_id: lanc.id,
        });

        if (!error) {
          usadosLanc.add(lanc.id);
          criadas++;
        }
      }
    }

    return { vinculadas, criadas };
  }
}
