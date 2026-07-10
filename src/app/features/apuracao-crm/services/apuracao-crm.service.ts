import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ApuracaoCrm, PedidoApuracao, PreviewApuracao, ResultadoReconciliacao, ProdutoCatalogo, ItemApuracao, ItemEanSemCatalogo, TituloApuracao } from '../models/apuracao.model';

const ALIQUOTA_FPP      = 0.0385;
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
      .select('id, codigo, numero_nf, data_emissao, percentual_royalties, tipo_pedido:tipos_pedido(incide_royalties, tipo_royalties, percentual_royalties)')
      .gte('data_emissao', inicio)
      .lte('data_emissao', fim)
      .not('tipo_pedido_id', 'is', null);
    if (errPedidos) throw errPedidos;

    const elegíveis = (pedidos ?? []).filter((p: any) => {
      const tp = Array.isArray(p.tipo_pedido) ? p.tipo_pedido[0] : p.tipo_pedido;
      return tp?.incide_royalties === true;
    });

    if (elegíveis.length === 0) {
      return { pedidos: [], total_linha: 0, total_sazonal: 0, total_venda: 0, fpp: 0, fpp_linha: 0, fpp_sazonal: 0, roy_linha: 0, roy_sazonal: 0, credito_devolucao_garantida: 0, valor_produtos_sem_imposto_linha: 0 };
    }

    // 2. Itens de todos os pedidos elegíveis
    const pedidoIds = elegíveis.map((p: any) => p.id);
    const { data: itensPedido, error: errItens } = await this.db
      .from('itens_pedido')
      .select('pedido_id, ean, quantidade, descricao, valor_unitario, valor_total, venda_unitario')
      .in('pedido_id', pedidoIds);
    if (errItens) throw errItens;

    // 3. EANs únicos para buscar preço de venda
    const eans = [...new Set(
      (itensPedido ?? []).filter((i: any) => i.ean).map((i: any) => i.ean as string)
    )];

    let precoPorEan:  Record<string, number>                              = {};
    let flagsPorEan:  Record<string, { cobra_fpp: boolean; cobra_royalties: boolean }> = {};
    if (eans.length > 0) {
      const { data: produtos, error: errProd } = await this.db
        .from('itens')
        .select('ean, preco_venda, cobra_fpp, cobra_royalties')
        .in('ean', eans);
      if (errProd) throw errProd;
      for (const p of (produtos ?? [])) {
        if (p.ean && p.preco_venda != null) {
          precoPorEan[p.ean] = p.preco_venda;
        }
        if (p.ean) {
          flagsPorEan[p.ean] = {
            cobra_fpp:       p.cobra_fpp       ?? true,
            cobra_royalties: p.cobra_royalties ?? true,
          };
        }
      }
    }

    // 4. Calcular valor_venda e itens por pedido
    type RawItem = { pedido_id: string; ean: string | null; quantidade: number; descricao: string | null; valor_unitario: number | null; valor_total: number | null; venda_unitario: number | null };
    const itensPorPedido = new Map<string, RawItem[]>();
    for (const item of (itensPedido ?? []) as RawItem[]) {
      const lista = itensPorPedido.get(item.pedido_id) ?? [];
      lista.push(item);
      itensPorPedido.set(item.pedido_id, lista);
    }

    const pedidosApuracao: PedidoApuracao[] = [];
    for (const p of elegíveis) {
      const itens = itensPorPedido.get(p.id) ?? [];
      const tp = Array.isArray(p.tipo_pedido) ? p.tipo_pedido[0] : p.tipo_pedido;
      const tipoRoy = tp?.tipo_royalties as 'linha' | 'sazonal';
      const aliquotaPadrao = tipoRoy === 'linha' ? ALIQUOTA_LINHA : ALIQUOTA_SAZONAL;
      const pct = (p as any).percentual_royalties ?? tp?.percentual_royalties;
      const aliquota = pct != null ? pct / 100 : aliquotaPadrao;

      let valorVenda = 0;
      let itensSemEan = 0;
      const itensApuracao: ItemApuracao[] = [];

      for (const item of itens) {
        const temEan = !!(item.ean && (item.venda_unitario != null || precoPorEan[item.ean] != null));
        const precoVenda = temEan
          ? (item.venda_unitario ?? precoPorEan[item.ean!])
          : 0;
        const precoTotalVenda = precoVenda * item.quantidade;

        const flags = temEan
          ? (flagsPorEan[item.ean!] ?? { cobra_fpp: true, cobra_royalties: true })
          : { cobra_fpp: false, cobra_royalties: false };

        const fppItem = flags.cobra_fpp ? precoTotalVenda * ALIQUOTA_FPP : 0;
        const baseRoy = flags.cobra_royalties ? precoTotalVenda - fppItem : 0;
        const royItem = flags.cobra_royalties ? baseRoy * aliquota : 0;

        if (temEan) valorVenda += precoTotalVenda;
        else itensSemEan++;

        const custoTotal = item.valor_total ?? (item.valor_unitario != null ? item.valor_unitario * item.quantidade : null);

        itensApuracao.push({
          descricao: item.descricao ?? '',
          quantidade: item.quantidade,
          custo_unitario: item.valor_unitario ?? null,
          custo_total: custoTotal,
          preco_total_venda: precoTotalVenda,
          cobra_fpp:       flags.cobra_fpp,
          cobra_royalties: flags.cobra_royalties,
          fpp: fppItem,
          base_royalties: baseRoy,
          royalties: royItem,
          sem_ean: !temEan,
        });
      }

      pedidosApuracao.push({
        pedido_id:          p.id,
        codigo:             p.codigo,
        numero_nf:          p.numero_nf,
        data_emissao:       p.data_emissao,
        tipo:               tipoRoy,
        aliquota_royalties: aliquota,
        valor_venda:        valorVenda,
        itens_sem_ean:      itensSemEan,
        itens:              itensApuracao,
      });
    }

    // 5. Totais — fpp e royalties agregados dos itens para respeitar flags cobra_fpp/cobra_royalties
    const pedidosLinha   = pedidosApuracao.filter(p => p.tipo === 'linha');
    const pedidosSazonal = pedidosApuracao.filter(p => p.tipo === 'sazonal');
    const total_linha   = pedidosLinha.reduce((s, p) => s + p.valor_venda, 0);
    const total_sazonal = pedidosSazonal.reduce((s, p) => s + p.valor_venda, 0);
    const total_venda   = total_linha + total_sazonal;
    const fpp_linha   = pedidosLinha.reduce((s, p) => s + p.itens.reduce((si, i) => si + i.fpp, 0), 0);
    const fpp_sazonal = pedidosSazonal.reduce((s, p) => s + p.itens.reduce((si, i) => si + i.fpp, 0), 0);
    const fpp         = fpp_linha + fpp_sazonal;
    const roy_linha   = pedidosLinha.reduce((s, p) => s + p.itens.reduce((si, i) => si + i.royalties, 0), 0);
    const roy_sazonal = pedidosSazonal.reduce((s, p) => s + p.itens.reduce((si, i) => si + i.royalties, 0), 0);

    // Crédito de Devolução Garantida: concedido pela franqueadora apenas sobre pedidos de Linha.
    // Fórmula: (Σ valor dos produtos sem imposto (vProd/NF) dos pedidos de Linha + royalties bruto Linha) × 5%
    const valorProdutosSemImpostoLinha = pedidosLinha.reduce(
      (s, p) => s + p.itens.reduce((si, i) => si + (i.custo_total ?? 0), 0), 0);
    const credito_devolucao_garantida = (valorProdutosSemImpostoLinha + roy_linha) * 0.05;

    return { pedidos: pedidosApuracao, total_linha, total_sazonal, total_venda, fpp, fpp_linha, fpp_sazonal, roy_linha, roy_sazonal, credito_devolucao_garantida, valor_produtos_sem_imposto_linha: valorProdutosSemImpostoLinha };
  }

  /** Salva a apuração sem gerar títulos. Retorna o registro criado. */
  async confirmar(preview: PreviewApuracao, ano: number, mes: number, quinzena: 1 | 2): Promise<ApuracaoCrm> {
    const { inicio, fim } = this.intervalo(ano, mes, quinzena);
    const dataVencimento  = this.vencimentoFpp(fim);

    const { data: apuracao, error } = await this.db
      .from('apuracoes_crm')
      .insert({
        ano, mes, quinzena,
        data_inicio:       inicio,
        data_fim:          fim,
        data_vencimento:   dataVencimento,
        total_venda:       preview.total_venda,
        total_linha:       preview.total_linha,
        total_sazonal:     preview.total_sazonal,
        valor_fpp:         preview.fpp,
        valor_roy_linha:   preview.roy_linha,
        valor_roy_sazonal: preview.roy_sazonal,
        status:            'confirmado',
        fpp_emitido:       false,
        royalties_emitidos: false,
      })
      .select()
      .single();
    if (error) throw error;
    return apuracao as ApuracaoCrm;
  }

  /** Cria os títulos FPP (linha e/ou sazonal) para uma apuração confirmada. */
  async emitirFpp(
    apuracaoId: string,
    itens: Array<{ subtipo: 'linha' | 'sazonal'; valor: number; dataVencimento: string }>,
    ano: number, mes: number, quinzena: 1 | 2,
  ): Promise<void> {
    const mesPad     = String(mes).padStart(2, '0');
    const mesLabel   = `${mesPad}/${ano}`;
    const quinzLabel = quinzena === 1 ? '1ª Quinzena' : '2ª Quinzena';

    const registros = itens.map(({ subtipo, valor, dataVencimento }) => ({
      pedido_id:       null,
      apuracao_crm_id: apuracaoId,
      codigo:          `FPP-${subtipo === 'linha' ? 'LIN' : 'SAZ'}-${ano}${mesPad}-Q${quinzena}`,
      descricao:       `FPP ${subtipo === 'linha' ? 'Linha' : 'Sazonal'} ${quinzLabel} ${mesLabel}`,
      categoria:       'fpp',
      valor:           this.arredondar(valor),
      data_vencimento: dataVencimento,
      data_pagamento:  null,
    }));

    const { error: errTit } = await this.db.from('titulos').insert(registros);
    if (errTit) throw errTit;

    const { error: errUpd } = await this.db
      .from('apuracoes_crm')
      .update({ fpp_emitido: true })
      .eq('id', apuracaoId);
    if (errUpd) throw errUpd;
  }

  /**
   * Cria os títulos de Royalties (Linha e/ou Sazonal, valor líquido após créditos) para uma apuração confirmada.
   * Royalties Linha é cobrado em 2 parcelas (30 e 45 dias do fechamento); Sazonal em parcela única.
   */
  async emitirRoyalties(
    apuracaoId: string,
    itens: Array<{
      subtipo: 'linha' | 'sazonal';
      valorBruto: number;
      valorLiquido: number;
      parcelas: Array<{ valor: number; dataVencimento: string }>;
      devolucaoGarantida: number;
      devolucoesProduto: number;
      outros: number;
    }>,
    ano: number, mes: number, quinzena: 1 | 2,
  ): Promise<void> {
    const mesPad     = String(mes).padStart(2, '0');
    const mesLabel   = `${mesPad}/${ano}`;
    const quinzLabel = quinzena === 1 ? '1ª Quinzena' : '2ª Quinzena';

    const registros = itens.flatMap(({ subtipo, parcelas }) => {
      const prefixo = subtipo === 'linha' ? 'LIN' : 'SAZ';
      const nome    = subtipo === 'linha' ? 'Linha' : 'Sazonal';
      return parcelas.map((parcela, idx) => ({
        pedido_id:       null,
        apuracao_crm_id: apuracaoId,
        codigo:          parcelas.length > 1
          ? `ROY-${prefixo}-P${idx + 1}-${ano}${mesPad}-Q${quinzena}`
          : `ROY-${prefixo}-${ano}${mesPad}-Q${quinzena}`,
        descricao:       parcelas.length > 1
          ? `Royalties ${nome} — Parcela ${idx + 1}/${parcelas.length} ${quinzLabel} ${mesLabel}`
          : `Royalties ${nome} ${quinzLabel} ${mesLabel}`,
        categoria:       'royalties',
        valor:           this.arredondar(parcela.valor),
        data_vencimento: parcela.dataVencimento,
        data_pagamento:  null,
      }));
    });

    const { error: errTit } = await this.db.from('titulos').insert(registros);
    if (errTit) throw errTit;

    const itemLinha   = itens.find(i => i.subtipo === 'linha');
    const itemSazonal = itens.find(i => i.subtipo === 'sazonal');

    const { error: errUpd } = await this.db
      .from('apuracoes_crm')
      .update({
        royalties_emitidos:                 true,
        ...(itemLinha   ? { valor_roy_linha:   this.arredondar(itemLinha.valorBruto) }   : {}),
        ...(itemSazonal ? { valor_roy_sazonal: this.arredondar(itemSazonal.valorBruto) } : {}),
        credito_devolucao_garantida:        this.arredondar(itemLinha?.devolucaoGarantida ?? 0),
        credito_devolucoes_produto_linha:   this.arredondar(itemLinha?.devolucoesProduto ?? 0),
        credito_devolucoes_produto_sazonal: this.arredondar(itemSazonal?.devolucoesProduto ?? 0),
        credito_outros_linha:               this.arredondar(itemLinha?.outros ?? 0),
        credito_outros_sazonal:             this.arredondar(itemSazonal?.outros ?? 0),
        valor_roy_liquido_linha:            itemLinha   ? this.arredondar(itemLinha.valorLiquido)   : null,
        valor_roy_liquido_sazonal:          itemSazonal ? this.arredondar(itemSazonal.valorLiquido) : null,
      })
      .eq('id', apuracaoId);
    if (errUpd) throw errUpd;
  }

  /** Busca os títulos vinculados a uma apuração CRM. */
  async buscarTitulos(apuracaoId: string): Promise<TituloApuracao[]> {
    const { data, error } = await this.db
      .from('titulos')
      .select('id, codigo, descricao, categoria, valor, data_vencimento, data_pagamento, lancamento_extrato_id')
      .eq('apuracao_crm_id', apuracaoId)
      .order('created_at');
    if (error) throw error;
    return (data ?? []) as TituloApuracao[];
  }

  /** Busca lançamentos NIBS ainda não vinculados a nenhum título. */
  async buscarLancamentosNibs(): Promise<{ id: string; valor: number; data_lancamento: string }[]> {
    const { data, error } = await this.db
      .from('lancamentos_extrato')
      .select('id, valor, data_lancamento, titulos(id)')
      .ilike('destinatario_remetente', '%NIBS%')
      .eq('natureza', 'saida');
    if (error) throw error;
    return (data ?? [])
      .filter((l: any) => !l.titulos || (l.titulos as any[]).length === 0)
      .map((l: any) => ({ id: l.id, valor: Math.abs(l.valor), data_lancamento: l.data_lancamento }));
  }

  /** Confirma a conciliação: grava data_pagamento e lancamento_extrato_id no título. */
  async conciliarTitulo(tituloId: string, lancamentoId: string, dataPagamento: string): Promise<void> {
    const { error } = await this.db
      .from('titulos')
      .update({ data_pagamento: dataPagamento, lancamento_extrato_id: lancamentoId })
      .eq('id', tituloId);
    if (error) throw error;
  }

  async reconciliarEans(): Promise<ResultadoReconciliacao> {
    // 0. IDs dos pedidos CRM
    const pedidosCrmIds = await this.buscarPedidosCrmIds();
    if (pedidosCrmIds.length === 0) {
      return { reconciliados: [], multiMatch: [], semMatch: [], eanSemCatalogo: [], totalItens: 0, jaComEan: 0 };
    }

    // 1. Catálogo: EAN, descricao, codigo_sap, preco_venda
    const { data: produtos, error: e1 } = await this.db
      .from('itens')
      .select('ean, descricao, codigo_sap, preco_venda')
      .not('ean', 'is', null)
      .not('descricao', 'is', null);
    if (e1) throw e1;

    // EANs válidos = em catálogo com preço (elegíveis para apuração)
    const eanComPreco = new Set<string>(
      (produtos ?? []).filter((p: any) => p.preco_venda != null).map((p: any) => p.ean as string)
    );

    // 2. Todos os itens de pedidos CRM (incluindo c_prod e quantidade)
    const { data: todosItens, error: e2 } = await this.db
      .from('itens_pedido')
      .select('id, descricao, ean, c_prod, pedido_id, quantidade, pedido:pedidos(numero_nf)')
      .in('pedido_id', pedidosCrmIds);
    if (e2) throw e2;

    const itens = (todosItens ?? []) as any[];

    // Separar: já tem EAN válido vs. precisa reconciliar
    const jaValidos      = itens.filter(i => i.ean && eanComPreco.has(i.ean));
    const precisamRecon  = itens.filter(i => !i.ean || !eanComPreco.has(i.ean));

    if (precisamRecon.length === 0) {
      return { reconciliados: [], multiMatch: [], semMatch: [], eanSemCatalogo: [], totalItens: 0, jaComEan: jaValidos.length };
    }

    // 3. Índice do catálogo por codigo_sap e por EAN (para lookup de preço de tabela)
    const precoPorEanCatalogo = new Map<string, number>();
    const indiceSap = new Map<string, Array<{ ean: string; descricao: string; codigo_sap: string }>>();
    for (const p of (produtos ?? []) as any[]) {
      if (!p.ean || p.preco_venda == null || !p.codigo_sap) continue;
      precoPorEanCatalogo.set(p.ean, p.preco_venda);
      const sapNorm = this.stripLeadingZeros(String(p.codigo_sap));
      const lista = indiceSap.get(sapNorm) ?? [];
      lista.push({ ean: p.ean, descricao: p.descricao, codigo_sap: p.codigo_sap });
      indiceSap.set(sapNorm, lista);
    }

    // 4. Tentar casar por cProd → codigo_sap
    const qtdPorItemId = new Map<string, number>(precisamRecon.map((i: any) => [i.id, i.quantidade ?? 0]));
    const reconciliados: import('../models/apuracao.model').ItemReconciliado[] = [];
    const multiMatch:    import('../models/apuracao.model').ItemMultiMatch[]   = [];
    // semMatchMap: agrupado por chave (cProd normalizado ou descrição quando sem cProd)
    const semMatchMap = new Map<string, {
      descricao: string;
      c_prod: string | null;
      ocorrencias: number;
      pedidosSet: Map<string, string | null>;
    }>();

    for (const item of precisamRecon) {
      const nf = Array.isArray(item.pedido)
        ? item.pedido[0]?.numero_nf
        : (item.pedido as any)?.numero_nf;

      const cProdRaw: string | null  = item.c_prod ?? null;
      const cProdNorm = cProdRaw ? this.stripLeadingZeros(cProdRaw) : null;

      if (cProdNorm) {
        const candidatos = indiceSap.get(cProdNorm) ?? [];

        if (candidatos.length === 1) {
          // Correspondência única → reconciliar automaticamente
          reconciliados.push({
            item_pedido_id:    item.id,
            descricao_pedido:  item.descricao ?? '',
            descricao_produto: candidatos[0].descricao,
            ean:               candidatos[0].ean,
            estrategia:        'c_prod',
          });
        } else if (candidatos.length > 1) {
          // Múltiplos candidatos → usuário escolhe
          multiMatch.push({
            item_pedido_id:  item.id,
            descricao_pedido: item.descricao ?? null,
            c_prod:           cProdRaw!,
            candidatos,
            pedido_id:        item.pedido_id,
            numero_nf:        nf ?? null,
          });
        } else {
          // cProd sem correspondência no catálogo
          const key = cProdNorm;
          const entry = semMatchMap.get(key) ?? { descricao: item.descricao ?? '', c_prod: cProdRaw, ocorrencias: 0, pedidosSet: new Map() };
          entry.ocorrencias++;
          if (item.pedido_id) entry.pedidosSet.set(item.pedido_id, nf ?? null);
          semMatchMap.set(key, entry);
        }
      } else {
        // Sem c_prod e sem EAN válido: agrupa por descrição
        const key = (item.descricao ?? '').trim().toUpperCase() || item.id;
        const entry = semMatchMap.get(key) ?? { descricao: item.descricao ?? '', c_prod: null, ocorrencias: 0, pedidosSet: new Map() };
        entry.ocorrencias++;
        if (item.pedido_id) entry.pedidosSet.set(item.pedido_id, nf ?? null);
        semMatchMap.set(key, entry);
      }
    }

    // 5. Aplicar reconciliações automáticas (um UPDATE por item)
    for (const r of reconciliados) {
      const vu  = precoPorEanCatalogo.get(r.ean) ?? null;
      const qtd = qtdPorItemId.get(r.item_pedido_id) ?? 0;
      const { error } = await this.db
        .from('itens_pedido')
        .update({ ean: r.ean, venda_unitario: vu, venda_total: vu != null ? vu * qtd : null })
        .eq('id', r.item_pedido_id);
      if (error) throw error;
    }

    const semMatch = Array.from(semMatchMap.values())
      .map(({ descricao, c_prod, ocorrencias, pedidosSet }) => ({
        descricao,
        c_prod,
        ocorrencias,
        pedidos: Array.from(pedidosSet.entries()).map(([pedido_id, numero_nf]) => ({ pedido_id, numero_nf })),
      }))
      .sort((a, b) => b.ocorrencias - a.ocorrencias);

    return {
      reconciliados,
      multiMatch,
      semMatch,
      eanSemCatalogo: [],  // subsumed no fluxo de cProd acima
      totalItens: precisamRecon.length,
      jaComEan: jaValidos.length,
    };
  }

  /** Aplica manualmente o EAN escolhido pelo usuário para um item específico (multi-match). */
  async aplicarMatchById(itemPedidoId: string, ean: string): Promise<void> {
    const [vu, { data: itemData }] = await Promise.all([
      this.buscarPrecoVenda(ean),
      this.db.from('itens_pedido').select('quantidade').eq('id', itemPedidoId).single(),
    ]);
    const qtd = (itemData as any)?.quantidade ?? 0;
    const { error } = await this.db
      .from('itens_pedido')
      .update({ ean, venda_unitario: vu, venda_total: vu != null ? vu * qtd : null })
      .eq('id', itemPedidoId);
    if (error) throw error;
  }

  async buscarProdutos(): Promise<ProdutoCatalogo[]> {
    const { data, error } = await this.db
      .from('itens')
      .select('ean, descricao, codigo_sap, preco_venda')
      .not('ean', 'is', null)
      .not('descricao', 'is', null)
      .order('descricao');
    if (error) throw error;
    return (data ?? []) as ProdutoCatalogo[];
  }

  async aplicarMatchManual(descricao: string, ean: string, c_prod?: string | null): Promise<number> {
    const [pedidosCrmIds, preco] = await Promise.all([
      this.buscarPedidosCrmIds(),
      this.buscarPrecoVenda(ean),
    ]);
    const payload = { ean, venda_unitario: preco };
    // Itens em semMatch podem ter ean != null (EAN existe mas não está no catálogo com preço),
    // portanto não filtramos por is('ean', null) — o c_prod/descrição + pedidos CRM já é específico o suficiente.
    // venda_total não é atualizado aqui pois quantidades variam por item; o usuário pode corrigir no pedido.
    const filtro = c_prod
      ? this.db.from('itens_pedido').update(payload).eq('c_prod', c_prod).in('pedido_id', pedidosCrmIds)
      : this.db.from('itens_pedido').update(payload).ilike('descricao', descricao).in('pedido_id', pedidosCrmIds);
    const { data, error } = await filtro.select('id');
    if (error) throw error;
    return (data ?? []).length;
  }

  async corrigirEan(eanAtual: string, eanNovo: string): Promise<number> {
    const [pedidosCrmIds, preco] = await Promise.all([
      this.buscarPedidosCrmIds(),
      this.buscarPrecoVenda(eanNovo),
    ]);
    const { data, error } = await this.db
      .from('itens_pedido')
      .update({ ean: eanNovo, venda_unitario: preco })
      .eq('ean', eanAtual)
      .in('pedido_id', pedidosCrmIds)
      .select('id');
    if (error) throw error;
    return (data ?? []).length;
  }

  private async buscarPrecoVenda(ean: string): Promise<number | null> {
    const { data } = await this.db.from('itens').select('preco_venda').eq('ean', ean).maybeSingle();
    return (data as any)?.preco_venda ?? null;
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

  /** Remove zeros à esquerda de um código para comparação normalizada. */
  private stripLeadingZeros(s: string): string {
    const trimmed = s.trim().replace(/^0+/, '');
    return trimmed || '0';
  }

  intervalo(ano: number, mes: number, quinzena: 1 | 2) {
    const mesPad = String(mes).padStart(2, '0');
    if (quinzena === 1) {
      return { inicio: `${ano}-${mesPad}-01`, fim: `${ano}-${mesPad}-15` };
    }
    const ultimoDia = new Date(ano, mes, 0).getDate();
    return { inicio: `${ano}-${mesPad}-16`, fim: `${ano}-${mesPad}-${ultimoDia}` };
  }

  /** Vencimento padrão do FPP Linha: data_fim + 30 dias. */
  vencimentoFpp(dataFim: string): string {
    return this.somarDias(dataFim, 30);
  }

  /** Vencimento da 2ª parcela dos Royalties Linha: data_fim + 45 dias (1ª parcela usa vencimentoFpp, +30 dias). */
  vencimentoRoyaltiesLinhaParcela2(dataFim: string): string {
    return this.somarDias(dataFim, 45);
  }

  /** Vencimento do FPP Sazonal: data_fim + 3 meses. */
  vencimentoFppSazonal(dataFim: string): string {
    const [ano, mes, dia] = dataFim.split('-').map(Number);
    const d = new Date(ano, mes - 1 + 3, dia);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private somarDias(data: string, dias: number): string {
    const [ano, mes, dia] = data.split('-').map(Number);
    const d = new Date(ano, mes - 1, dia + dias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private arredondar(v: number): number {
    return Math.round(v * 100) / 100;
  }
}
