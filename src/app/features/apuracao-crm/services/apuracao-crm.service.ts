import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ApuracaoCrm, PedidoApuracao, PreviewApuracao, ResultadoReconciliacao, ProdutoCatalogo } from '../models/apuracao.model';

const ALIQUOTA_FPP      = 0.04;
const ALIQUOTA_LINHA    = 0.37;
const ALIQUOTA_SAZONAL  = 0.275;

@Injectable({ providedIn: 'root' })
export class ApuracaoCrmService {
  private db = inject(SupabaseService).client;

  async listar(): Promise<ApuracaoCrm[]> {
    const { data, error } = await this.db
      .from('apuracoes_crm')
      .select('*')
      .order('ano', { ascending: false })
      .order('mes', { ascending: false })
      .order('quinzena', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async calcularPreview(ano: number, mes: number, quinzena: 1 | 2): Promise<PreviewApuracao> {
    const { inicio, fim } = this.intervalo(ano, mes, quinzena);

    // 1. Pedidos no período com join em tipo_pedido; filtro de elegibilidade é feito client-side
    const { data: pedidos, error: errPedidos } = await this.db
      .from('pedidos')
      .select('id, numero_nf, data_emissao, tipo_pedido:tipos_pedido(incide_royalties, tipo_royalties)')
      .gte('data_emissao', inicio)
      .lte('data_emissao', fim)
      .not('tipo_pedido_id', 'is', null);
    if (errPedidos) throw errPedidos;

    const elegíveis = (pedidos ?? []).filter((p: any) => {
      const tp = Array.isArray(p.tipo_pedido) ? p.tipo_pedido[0] : p.tipo_pedido;
      return tp?.incide_royalties === true;
    });

    if (elegíveis.length === 0) {
      return { pedidos: [], total_linha: 0, total_sazonal: 0, total_venda: 0, fpp: 0, roy_linha: 0, roy_sazonal: 0 };
    }

    // 2. Itens de todos os pedidos elegíveis
    const pedidoIds = elegíveis.map((p: any) => p.id);
    const { data: itensPedido, error: errItens } = await this.db
      .from('itens_pedido')
      .select('pedido_id, ean, quantidade')
      .in('pedido_id', pedidoIds);
    if (errItens) throw errItens;

    // 3. EANs únicos para buscar preço de venda
    const eans = [...new Set(
      (itensPedido ?? []).filter((i: any) => i.ean).map((i: any) => i.ean as string)
    )];

    let precoPorEan: Record<string, number> = {};
    if (eans.length > 0) {
      const { data: produtos, error: errProd } = await this.db
        .from('itens')
        .select('ean, preco_venda')
        .in('ean', eans);
      if (errProd) throw errProd;
      for (const p of (produtos ?? [])) {
        if (p.ean && p.preco_venda != null) {
          precoPorEan[p.ean] = p.preco_venda;
        }
      }
    }

    // 4. Calcular valor_venda por pedido
    const itensPorPedido = new Map<string, { ean: string | null; quantidade: number }[]>();
    for (const item of (itensPedido ?? [])) {
      const lista = itensPorPedido.get(item.pedido_id) ?? [];
      lista.push(item);
      itensPorPedido.set(item.pedido_id, lista);
    }

    const pedidosApuracao: PedidoApuracao[] = [];
    for (const p of elegíveis) {
      const itens = itensPorPedido.get(p.id) ?? [];
      let valorVenda = 0;
      let itensSemEan = 0;
      for (const item of itens) {
        if (item.ean && precoPorEan[item.ean] != null) {
          valorVenda += item.quantidade * precoPorEan[item.ean];
        } else {
          itensSemEan++;
        }
      }
      const tp = Array.isArray(p.tipo_pedido) ? p.tipo_pedido[0] : p.tipo_pedido;
      pedidosApuracao.push({
        pedido_id:    p.id,
        numero_nf:    p.numero_nf,
        data_emissao: p.data_emissao,
        tipo:         tp?.tipo_royalties as 'linha' | 'sazonal',
        valor_venda:  valorVenda,
        itens_sem_ean: itensSemEan,
      });
    }

    // 5. Totais e cálculo
    const total_linha   = pedidosApuracao.filter(p => p.tipo === 'linha').reduce((s, p) => s + p.valor_venda, 0);
    const total_sazonal = pedidosApuracao.filter(p => p.tipo === 'sazonal').reduce((s, p) => s + p.valor_venda, 0);
    const total_venda   = total_linha + total_sazonal;
    const fpp           = total_venda * ALIQUOTA_FPP;
    // FPP deduzido proporcionalmente: base_x = total_x * (1 - ALIQUOTA_FPP)
    const roy_linha   = total_linha   * (1 - ALIQUOTA_FPP) * ALIQUOTA_LINHA;
    const roy_sazonal = total_sazonal * (1 - ALIQUOTA_FPP) * ALIQUOTA_SAZONAL;

    return { pedidos: pedidosApuracao, total_linha, total_sazonal, total_venda, fpp, roy_linha, roy_sazonal };
  }

  async confirmar(preview: PreviewApuracao, ano: number, mes: number, quinzena: 1 | 2): Promise<void> {
    const { inicio, fim } = this.intervalo(ano, mes, quinzena);
    const dataVencimento  = this.vencimento(ano, mes);

    // Grava apuração
    const { data: apuracao, error: errApur } = await this.db
      .from('apuracoes_crm')
      .insert({
        ano, mes, quinzena,
        data_inicio:      inicio,
        data_fim:         fim,
        data_vencimento:  dataVencimento,
        total_venda:      preview.total_venda,
        total_linha:      preview.total_linha,
        total_sazonal:    preview.total_sazonal,
        valor_fpp:        preview.fpp,
        valor_roy_linha:  preview.roy_linha,
        valor_roy_sazonal: preview.roy_sazonal,
        status: 'confirmado',
      })
      .select()
      .single();
    if (errApur) throw errApur;

    const mesLabel = `${String(mes).padStart(2, '0')}/${ano}`;
    const quinzLabel = quinzena === 1 ? '1ª Quinzena' : '2ª Quinzena';
    const titulos = [];

    if (preview.fpp > 0) {
      titulos.push({
        pedido_id: null,
        apuracao_crm_id: apuracao.id,
        codigo: `FPP-${ano}${String(mes).padStart(2, '0')}-Q${quinzena}`,
        descricao: `FPP ${quinzLabel} ${mesLabel}`,
        categoria: 'fpp',
        valor: this.arredondar(preview.fpp),
        data_vencimento: dataVencimento,
        data_pagamento: null,
      });
    }
    if (preview.roy_linha > 0) {
      titulos.push({
        pedido_id: null,
        apuracao_crm_id: apuracao.id,
        codigo: `ROY-LINHA-${ano}${String(mes).padStart(2, '0')}-Q${quinzena}`,
        descricao: `Royalties Linha ${quinzLabel} ${mesLabel}`,
        categoria: 'royalties',
        valor: this.arredondar(preview.roy_linha),
        data_vencimento: dataVencimento,
        data_pagamento: null,
      });
    }
    if (preview.roy_sazonal > 0) {
      titulos.push({
        pedido_id: null,
        apuracao_crm_id: apuracao.id,
        codigo: `ROY-SAZONAL-${ano}${String(mes).padStart(2, '0')}-Q${quinzena}`,
        descricao: `Royalties Sazonais ${quinzLabel} ${mesLabel}`,
        categoria: 'royalties',
        valor: this.arredondar(preview.roy_sazonal),
        data_vencimento: dataVencimento,
        data_pagamento: null,
      });
    }

    if (titulos.length > 0) {
      const { error: errTit } = await this.db.from('titulos').insert(titulos);
      if (errTit) throw errTit;
    }
  }

  async reconciliarEans(): Promise<ResultadoReconciliacao> {
    // 0. Restringir apenas a pedidos CRM (tipo_pedido com incide_royalties = true)
    const pedidosCrmIds = await this.buscarPedidosCrmIds();

    // 1. Itens sem EAN apenas de pedidos CRM
    const { data: semEan, error: e1 } = await this.db
      .from('itens_pedido')
      .select('id, descricao, ean, pedido_id, pedido:pedidos(numero_nf)')
      .is('ean', null)
      .in('pedido_id', pedidosCrmIds);
    if (e1) throw e1;

    // 2. Catálogo de produtos com EAN
    const { data: produtos, error: e2 } = await this.db
      .from('itens')
      .select('ean, descricao')
      .not('ean', 'is', null)
      .not('descricao', 'is', null);
    if (e2) throw e2;

    const jaComEan = ((await this.db.from('itens_pedido').select('id', { count: 'exact', head: true }).not('ean', 'is', null)).count) ?? 0;

    // 3. Índice de busca: normalizado → { ean, descricao }
    const indiceExato    = new Map<string, { ean: string; descricao: string }>();
    const indiceNormal   = new Map<string, { ean: string; descricao: string }>();
    for (const p of (produtos ?? [])) {
      if (!p.ean || !p.descricao) continue;
      indiceExato.set(p.descricao.trim().toUpperCase(), { ean: p.ean, descricao: p.descricao });
      indiceNormal.set(this.normalizar(p.descricao), { ean: p.ean, descricao: p.descricao });
    }

    // 4. Tentar casar cada item
    const reconciliados: import('../models/apuracao.model').ItemReconciliado[] = [];
    const semMatchMap = new Map<string, { ocorrencias: number; pedidosSet: Map<string, string | null> }>();

    for (const item of (semEan ?? [])) {
      const desc = (item.descricao ?? '').trim().toUpperCase();
      const norm = this.normalizar(item.descricao ?? '');

      let match = indiceExato.get(desc) ?? null;
      let estrategia: 'exato' | 'normalizado' = 'exato';

      if (!match) {
        match = indiceNormal.get(norm) ?? null;
        estrategia = 'normalizado';
      }

      if (match) {
        reconciliados.push({
          item_pedido_id:   item.id,
          descricao_pedido: item.descricao,
          descricao_produto: match.descricao,
          ean:              match.ean,
          estrategia,
        });
      } else {
        const entry = semMatchMap.get(desc) ?? { ocorrencias: 0, pedidosSet: new Map() };
        entry.ocorrencias++;
        if (item.pedido_id) {
          const nf = Array.isArray(item.pedido) ? item.pedido[0]?.numero_nf : (item.pedido as any)?.numero_nf;
          entry.pedidosSet.set(item.pedido_id, nf ?? null);
        }
        semMatchMap.set(desc, entry);
      }
    }

    // 5. Atualizar em lotes de 50
    for (let i = 0; i < reconciliados.length; i += 50) {
      const lote = reconciliados.slice(i, i + 50);
      for (const r of lote) {
        const { error } = await this.db
          .from('itens_pedido')
          .update({ ean: r.ean })
          .eq('id', r.item_pedido_id);
        if (error) throw error;
      }
    }

    const semMatch = Array.from(semMatchMap.entries())
      .map(([descricao, { ocorrencias, pedidosSet }]) => ({
        descricao,
        ocorrencias,
        pedidos: Array.from(pedidosSet.entries()).map(([pedido_id, numero_nf]) => ({ pedido_id, numero_nf })),
      }))
      .sort((a, b) => b.ocorrencias - a.ocorrencias);

    return {
      reconciliados,
      semMatch,
      totalItens: (semEan ?? []).length,
      jaComEan: Number(jaComEan),
    };
  }

  async buscarProdutos(): Promise<ProdutoCatalogo[]> {
    const { data, error } = await this.db
      .from('itens')
      .select('ean, descricao, preco_venda')
      .not('ean', 'is', null)
      .not('descricao', 'is', null)
      .order('descricao');
    if (error) throw error;
    return (data ?? []) as ProdutoCatalogo[];
  }

  async aplicarMatchManual(descricao: string, ean: string): Promise<number> {
    const pedidosCrmIds = await this.buscarPedidosCrmIds();
    const { data, error } = await this.db
      .from('itens_pedido')
      .update({ ean })
      .ilike('descricao', descricao)
      .is('ean', null)
      .in('pedido_id', pedidosCrmIds)
      .select('id');
    if (error) throw error;
    return (data ?? []).length;
  }

  private async buscarPedidosCrmIds(): Promise<string[]> {
    const { data, error } = await this.db
      .from('pedidos')
      .select('id, tipo_pedido:tipos_pedido(incide_royalties)')
      .not('tipo_pedido_id', 'is', null);
    if (error) throw error;
    return (data ?? [])
      .filter((p: any) => {
        const tp = Array.isArray(p.tipo_pedido) ? p.tipo_pedido[0] : p.tipo_pedido;
        return tp?.incide_royalties === true;
      })
      .map((p: any) => p.id as string);
  }

  private normalizar(s: string): string {
    return s
      .toUpperCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')   // remove acentos
      .replace(/[^A-Z0-9 ]/g, ' ')       // remove pontuação
      .replace(/\s+/g, ' ')
      .trim();
  }

  private intervalo(ano: number, mes: number, quinzena: 1 | 2) {
    const mesPad = String(mes).padStart(2, '0');
    if (quinzena === 1) {
      return { inicio: `${ano}-${mesPad}-01`, fim: `${ano}-${mesPad}-15` };
    }
    const ultimoDia = new Date(ano, mes, 0).getDate();
    return { inicio: `${ano}-${mesPad}-16`, fim: `${ano}-${mesPad}-${ultimoDia}` };
  }

  private vencimento(ano: number, mes: number): string {
    // Dia 15 do mês seguinte
    const proximo = mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
    return `${proximo.ano}-${String(proximo.mes).padStart(2, '0')}-15`;
  }

  private arredondar(v: number): number {
    return Math.round(v * 100) / 100;
  }
}
