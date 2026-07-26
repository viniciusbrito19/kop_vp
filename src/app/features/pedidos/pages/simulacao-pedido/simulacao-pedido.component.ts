import { Component, OnInit, OnDestroy, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { ProdutosService } from '../../../produtos/services/produtos.service';
import { Item } from '../../../produtos/models/produto.model';
import { ApuracaoCrmService, ALIQUOTA_FPP } from '../../../apuracao-crm/services/apuracao-crm.service';
import { SimulacoesPedidoService } from '../../services/simulacoes-pedido.service';
import { ProjecaoCaixaService } from '../../services/projecao-caixa.service';
import { ItemSimulado, SimulacaoPedidoDados, SimulacaoPedidoResumo } from '../../models/simulacao-pedido.model';
import { SalvarSimulacaoDialogComponent } from './salvar-simulacao-dialog.component';
import { AbrirSimulacaoDialogComponent } from './abrir-simulacao-dialog.component';

interface ItemCalculado {
  custo_total: number;
  preco_venda_total: number;
  fpp: number;
  base_royalties: number;
  royalties: number;
  margem: number;
}

interface Parcela {
  numero: number;
  offsetDias: number;
  valor: number;
  vencimento: string;
}

interface ProjecaoCobranca {
  periodoLabel: string;
  fppValor: number;
  fppOffsetDias: number;
  fppVencimento: string;
  royParcelas: Parcela[];
  compraParcelas: Parcela[];
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Alíquota padrão de Royalties Linha (%). */
const ALIQUOTA_ROYALTIES_PADRAO = 37;
/** Vencimento padrão do FPP Linha: fim da quinzena + 30 dias. */
const OFFSET_FPP_PADRAO = 30;
/** Vencimento padrão da 1ª parcela de Royalties Linha: fim da quinzena + 30 dias. */
const OFFSET_ROYALTIES_INICIAL = 30;
/** Vencimento padrão da 1ª parcela de pagamento aos fornecedores (compra): fim da quinzena + 30 dias. */
const OFFSET_COMPRA_INICIAL = 30;
const INTERVALO_ENTRE_PARCELAS = 15;
const MIN_PARCELAS = 1;
const MAX_PARCELAS = 6;

@Component({
  selector: 'app-simulacao-pedido',
  standalone: true,
  imports: [
    RouterLink, CurrencyPipe, DatePipe, DecimalPipe, FormsModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatDialogModule, MatMenuModule, MatIconModule,
  ],
  templateUrl: './simulacao-pedido.component.html',
  styleUrl: './simulacao-pedido.component.scss',
})
export class SimulacaoPedidoComponent implements OnInit, OnDestroy {
  private produtosService = inject(ProdutosService);
  private apuracaoService = inject(ApuracaoCrmService);
  private simulacoesService = inject(SimulacoesPedidoService);
  private projecaoCaixaService = inject(ProjecaoCaixaService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  itens = signal<ItemSimulado[]>([]);
  aliquotaRoyalties = signal<number | null>(ALIQUOTA_ROYALTIES_PADRAO);
  dataEmissao = signal<string>(new Date().toISOString().slice(0, 10));
  /** Dias após o fim da quinzena para vencimento do FPP. Editável pelo usuário. */
  fppOffsetDias = signal<number>(OFFSET_FPP_PADRAO);
  /** Dias após o fim da quinzena para vencimento de cada parcela de Royalties. Editável pelo usuário. */
  offsetsRoyalties = signal<number[]>([OFFSET_ROYALTIES_INICIAL, OFFSET_ROYALTIES_INICIAL + INTERVALO_ENTRE_PARCELAS]);
  /** Dias após o fim da quinzena para vencimento de cada parcela de pagamento da compra (fábrica). Editável pelo usuário. */
  offsetsCompra = signal<number[]>([OFFSET_COMPRA_INICIAL, OFFSET_COMPRA_INICIAL + INTERVALO_ENTRE_PARCELAS]);
  codigoBusca = signal('');
  buscando = signal(false);

  hintAliquotaAberto = signal(false);
  hintDataEmissaoAberto = signal(false);

  catalogo = signal<Item[]>([]);
  descricaoBusca = signal('');
  sugestoesAbertas = signal(false);

  editandoCompraCodigo = signal<string | null>(null);
  compraEditando = signal('');

  simulacaoId = signal<string | null>(null);
  simulacaoNome = signal<string | null>(null);
  carregandoSimulacao = signal(false);
  salvandoSimulacao = signal(false);
  simulacoesSalvas = signal<SimulacaoPedidoResumo[]>([]);
  private routeSub?: Subscription;

  verificandoCaixa = signal(false);
  /** Saldo de caixa projetado por data (sem considerar as parcelas simuladas), preenchido sob demanda. */
  resultadoCaixa = signal<Record<string, number> | null>(null);

  constructor() {
    // Qualquer mudança na projeção (itens, alíquota, datas, parcelas) invalida
    // uma checagem de caixa anterior — o usuário precisa solicitar de novo.
    effect(() => {
      this.projecaoCobranca();
      this.resultadoCaixa.set(null);
    });
  }

  totais = computed(() => {
    const soma = this.itens().reduce((acc, item) => {
      const c = this.calcularItem(item);
      acc.custo_total       += c.custo_total;
      acc.preco_venda_total += c.preco_venda_total;
      acc.fpp                += c.fpp;
      acc.royalties           += c.royalties;
      acc.margem               += c.margem;
      return acc;
    }, { custo_total: 0, preco_venda_total: 0, fpp: 0, royalties: 0, margem: 0 });

    const total_a_pagar = soma.custo_total + soma.fpp + soma.royalties;
    const percentual_margem = soma.preco_venda_total > 0 ? (soma.margem / soma.preco_venda_total) * 100 : 0;
    return { ...soma, total_a_pagar, percentual_margem };
  });

  temItemComRoyaltiesSemAliquota = computed(() =>
    this.aliquotaRoyalties() == null && this.itens().some(i => i.cobra_royalties)
  );

  /**
   * Projeção de cobrança de FPP, Royalties e pagamento da compra à fábrica,
   * seguindo as regras padrão de pedidos Linha definidas na Apuração CRM (tela
   * "Royalties e FPP"): quinzena determinada pela data de emissão. FPP, Royalties
   * e Compra são todos contados independentemente a partir do fim da quinzena
   * apurada (FPP padrão: 30 dias; Royalties e Compra padrão: 30 e 45 dias em 2
   * parcelas), cada um com seus próprios dias editáveis pelo usuário — alterar os
   * dias de um não afeta os demais. Não contempla regras de Sazonal nem créditos
   * apurados no consolidado do período (Devolução Garantida etc.), que dependem
   * do conjunto de pedidos do período, não deste pedido isolado.
   */
  projecaoCobranca = computed<ProjecaoCobranca | null>(() => {
    const data = this.dataEmissao();
    const partes = data ? data.split('-').map(Number) : [];
    const [ano, mes, dia] = partes;
    if (!ano || !mes || !dia) return null;

    const quinzena: 1 | 2 = dia <= 15 ? 1 : 2;
    const { fim } = this.apuracaoService.intervalo(ano, mes, quinzena);
    const fppOffsetDias = this.fppOffsetDias();
    const fppVencimento = this.apuracaoService.somarDias(fim, fppOffsetDias);

    const royParcelas = this.calcularParcelas(this.offsetsRoyalties(), this.totais().royalties, fim);
    const compraParcelas = this.calcularParcelas(this.offsetsCompra(), this.totais().custo_total, fim);

    return {
      periodoLabel: `${quinzena}ª quinzena de ${MESES[mes - 1]}/${ano}`,
      fppValor: this.totais().fpp,
      fppOffsetDias,
      fppVencimento,
      royParcelas,
      compraParcelas,
    };
  });

  /** Aceita vírgula como separador decimal (padrão brasileiro). */
  atualizarAliquota(valor: string) {
    const v = valor.trim().replace(',', '.');
    if (v === '') {
      this.aliquotaRoyalties.set(null);
      return;
    }
    const num = parseFloat(v);
    if (isNaN(num)) return;
    this.aliquotaRoyalties.set(Math.min(100, Math.max(0, num)));
  }

  /** Altera os dias (após o fim da quinzena) para vencimento do FPP. */
  atualizarFppOffset(valor: string) {
    const dias = Math.max(0, Math.round(parseFloat(valor.replace(',', '.'))));
    if (isNaN(dias)) return;
    this.fppOffsetDias.set(dias);
  }

  /**
   * Cruza as parcelas simuladas (FPP, Royalties e Compra) com o saldo atual do
   * extrato, as despesas recorrentes previstas e as receitas futuras cadastradas,
   * para saber se haverá saldo em caixa suficiente para pagar cada parcela na sua
   * data, considerando também as parcelas anteriores da própria simulação.
   */
  async verificarDisponibilidadeCaixa() {
    const proj = this.projecaoCobranca();
    if (!proj) return;

    const datas = [proj.fppVencimento, ...proj.royParcelas.map(p => p.vencimento), ...proj.compraParcelas.map(p => p.vencimento)];

    this.verificandoCaixa.set(true);
    try {
      this.resultadoCaixa.set(await this.projecaoCaixaService.saldoProjetadoEmDatas(datas));
    } catch {
      this.snack.open('Erro ao verificar disponibilidade de caixa.', 'OK', { duration: 4000 });
    } finally {
      this.verificandoCaixa.set(false);
    }
  }

  /** Soma o valor de todas as parcelas simuladas (FPP + Royalties + Compra) com vencimento até a data informada. */
  cumulativoSimuladoAte(vencimento: string): number {
    const proj = this.projecaoCobranca();
    if (!proj) return 0;
    let total = 0;
    if (proj.fppVencimento <= vencimento) total += proj.fppValor;
    for (const p of proj.royParcelas) if (p.vencimento <= vencimento) total += p.valor;
    for (const p of proj.compraParcelas) if (p.vencimento <= vencimento) total += p.valor;
    return total;
  }

  private calcularParcelas(offsets: number[], total: number, dataBase: string): Parcela[] {
    const valores = this.dividirEmParcelas(total, offsets.length);
    return offsets.map((offsetDias, i) => ({
      numero: i + 1,
      offsetDias,
      valor: valores[i],
      vencimento: this.apuracaoService.somarDias(dataBase, offsetDias),
    }));
  }

  /** Divide um total em N parcelas iguais (centavos); a última absorve o resto do arredondamento. */
  private dividirEmParcelas(total: number, n: number): number[] {
    const valores: number[] = [];
    let soma = 0;
    for (let i = 0; i < n - 1; i++) {
      const v = Math.round((total / n) * 100) / 100;
      valores.push(v);
      soma += v;
    }
    valores.push(Math.round((total - soma) * 100) / 100);
    return valores;
  }

  private adicionarParcela(offsetsSignal: WritableSignal<number[]>, offsetInicial: number) {
    offsetsSignal.update(offsets => {
      if (offsets.length >= MAX_PARCELAS) return offsets;
      const ultimo = offsets[offsets.length - 1] ?? (offsetInicial - INTERVALO_ENTRE_PARCELAS);
      return [...offsets, ultimo + INTERVALO_ENTRE_PARCELAS];
    });
  }

  private removerParcela(offsetsSignal: WritableSignal<number[]>) {
    offsetsSignal.update(offsets =>
      offsets.length > MIN_PARCELAS ? offsets.slice(0, -1) : offsets
    );
  }

  /** Permite ao usuário sobrescrever manualmente os dias de vencimento de uma parcela específica. */
  private atualizarOffset(offsetsSignal: WritableSignal<number[]>, index: number, valor: string) {
    const dias = Math.max(0, Math.round(parseFloat(valor.replace(',', '.'))));
    if (isNaN(dias)) return;
    offsetsSignal.update(offsets => offsets.map((o, i) => i === index ? dias : o));
  }

  adicionarParcelaRoyalties() { this.adicionarParcela(this.offsetsRoyalties, OFFSET_ROYALTIES_INICIAL); }
  removerParcelaRoyalties() { this.removerParcela(this.offsetsRoyalties); }
  atualizarOffsetParcela(index: number, valor: string) { this.atualizarOffset(this.offsetsRoyalties, index, valor); }

  adicionarParcelaCompra() { this.adicionarParcela(this.offsetsCompra, OFFSET_COMPRA_INICIAL); }
  removerParcelaCompra() { this.removerParcela(this.offsetsCompra); }
  atualizarOffsetParcelaCompra(index: number, valor: string) { this.atualizarOffset(this.offsetsCompra, index, valor); }

  sugestoesDescricao = computed(() => {
    const q = this.descricaoBusca().trim().toLowerCase();
    if (q.length < 2) return [];
    return this.catalogo()
      .filter(p => !!p.codigo_sap
        && ((p.cobra_fpp ?? true) || (p.cobra_royalties ?? true))
        && (
          p.descricao.toLowerCase().includes(q) ||
          p.codigo_sap.toLowerCase().includes(q)
        ))
      .slice(0, 8);
  });

  async ngOnInit() {
    try {
      this.catalogo.set(await this.produtosService.listar());
    } catch {
      // autocomplete por descrição fica indisponível; busca por SAP continua funcionando
    }

    this.carregarSimulacoesSalvas();

    this.routeSub = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        if (id !== this.simulacaoId()) this.carregarSimulacao(id);
      } else if (this.simulacaoId() !== null) {
        this.novaSimulacao(false);
      }
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  async carregarSimulacoesSalvas() {
    try {
      this.simulacoesSalvas.set(await this.simulacoesService.listar());
    } catch {
      // lista de simulações salvas fica indisponível; não impede o uso da tela
    }
  }

  async carregarSimulacao(id: string) {
    this.carregandoSimulacao.set(true);
    try {
      const simulacao = await this.simulacoesService.buscarPorId(id);
      const d = simulacao.dados;
      this.itens.set(d.itens ?? []);
      this.aliquotaRoyalties.set(d.aliquotaRoyalties ?? ALIQUOTA_ROYALTIES_PADRAO);
      this.dataEmissao.set(d.dataEmissao ?? new Date().toISOString().slice(0, 10));
      this.fppOffsetDias.set(d.fppOffsetDias ?? OFFSET_FPP_PADRAO);
      this.offsetsRoyalties.set(d.offsetsRoyalties?.length ? d.offsetsRoyalties : [OFFSET_ROYALTIES_INICIAL, OFFSET_ROYALTIES_INICIAL + INTERVALO_ENTRE_PARCELAS]);
      this.offsetsCompra.set(d.offsetsCompra?.length ? d.offsetsCompra : [OFFSET_COMPRA_INICIAL, OFFSET_COMPRA_INICIAL + INTERVALO_ENTRE_PARCELAS]);
      this.simulacaoId.set(simulacao.id);
      this.simulacaoNome.set(simulacao.nome);
    } catch {
      this.snack.open('Erro ao carregar simulação salva.', 'OK', { duration: 4000 });
      this.router.navigate(['/pedidos/simular']);
    } finally {
      this.carregandoSimulacao.set(false);
    }
  }

  private montarDadosParaSalvar(): SimulacaoPedidoDados {
    return {
      itens: this.itens(),
      aliquotaRoyalties: this.aliquotaRoyalties(),
      dataEmissao: this.dataEmissao(),
      fppOffsetDias: this.fppOffsetDias(),
      offsetsRoyalties: this.offsetsRoyalties(),
      offsetsCompra: this.offsetsCompra(),
    };
  }

  async salvarSimulacao() {
    if (this.itens().length === 0) {
      this.snack.open('Adicione ao menos um item antes de salvar.', 'OK', { duration: 3500 });
      return;
    }

    const idAtual = this.simulacaoId();
    if (idAtual) {
      this.salvandoSimulacao.set(true);
      try {
        await this.simulacoesService.atualizar(idAtual, this.simulacaoNome()!, this.montarDadosParaSalvar());
        this.snack.open('Simulação atualizada.', 'OK', { duration: 3000 });
        this.carregarSimulacoesSalvas();
      } catch {
        this.snack.open('Erro ao atualizar simulação.', 'OK', { duration: 4000 });
      } finally {
        this.salvandoSimulacao.set(false);
      }
      return;
    }

    const ref = this.dialog.open(SalvarSimulacaoDialogComponent, { width: '420px', data: { nomeAtual: null } });
    const nome = await new Promise<string | null>(resolve => {
      ref.afterClosed().subscribe(resolve);
    });
    if (!nome) return;

    this.salvandoSimulacao.set(true);
    try {
      const resumo = await this.simulacoesService.salvar(nome, this.montarDadosParaSalvar());
      this.simulacaoId.set(resumo.id);
      this.simulacaoNome.set(resumo.nome);
      this.router.navigate(['/pedidos/simular', resumo.id], { replaceUrl: true });
      this.snack.open('Simulação salva com sucesso.', 'OK', { duration: 3000 });
      this.carregarSimulacoesSalvas();
    } catch {
      this.snack.open('Erro ao salvar simulação.', 'OK', { duration: 4000 });
    } finally {
      this.salvandoSimulacao.set(false);
    }
  }

  async renomearSimulacao() {
    const ref = this.dialog.open(SalvarSimulacaoDialogComponent, { width: '420px', data: { nomeAtual: this.simulacaoNome() } });
    const nome = await new Promise<string | null>(resolve => {
      ref.afterClosed().subscribe(resolve);
    });
    if (!nome || !this.simulacaoId()) return;

    try {
      await this.simulacoesService.atualizar(this.simulacaoId()!, nome, this.montarDadosParaSalvar());
      this.simulacaoNome.set(nome);
      this.snack.open('Simulação renomeada.', 'OK', { duration: 3000 });
      this.carregarSimulacoesSalvas();
    } catch {
      this.snack.open('Erro ao renomear simulação.', 'OK', { duration: 4000 });
    }
  }

  async abrirDialogSimulacoes() {
    const ref = this.dialog.open(AbrirSimulacaoDialogComponent, {
      width: '460px',
      data: { simulacoes: this.simulacoesSalvas(), simulacaoIdAtual: this.simulacaoId() },
    });
    const idEscolhido = await new Promise<string | undefined>(resolve => {
      ref.afterClosed().subscribe(resolve);
    });

    await this.carregarSimulacoesSalvas();

    if (idEscolhido) {
      if (idEscolhido !== this.simulacaoId()) this.router.navigate(['/pedidos/simular', idEscolhido]);
    } else if (this.simulacaoId() && !this.simulacoesSalvas().some(s => s.id === this.simulacaoId())) {
      // A simulação atualmente aberta foi excluída de dentro do diálogo.
      this.novaSimulacao();
    }
  }

  async excluirSimulacaoSalva(id: string, event: MouseEvent) {
    event.stopPropagation();
    if (!confirm('Excluir esta simulação salva? Esta ação não pode ser desfeita.')) return;
    try {
      await this.simulacoesService.excluir(id);
      this.simulacoesSalvas.update(list => list.filter(s => s.id !== id));
      if (this.simulacaoId() === id) this.novaSimulacao();
      this.snack.open('Simulação excluída.', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao excluir simulação.', 'OK', { duration: 4000 });
    }
  }

  novaSimulacao(navegar = true) {
    this.limpar();
    this.simulacaoId.set(null);
    this.simulacaoNome.set(null);
    if (navegar) this.router.navigate(['/pedidos/simular']);
  }

  calcularItem(item: ItemSimulado): ItemCalculado {
    const aliquota = (this.aliquotaRoyalties() ?? 0) / 100;
    const custoTotal = (item.preco_compra ?? 0) * item.quantidade;
    const precoVendaTotal = (item.preco_venda ?? 0) * item.quantidade;
    const fpp = item.cobra_fpp ? precoVendaTotal * ALIQUOTA_FPP : 0;
    const baseRoyalties = item.cobra_royalties ? precoVendaTotal - fpp : 0;
    const royalties = item.cobra_royalties ? baseRoyalties * aliquota : 0;
    const margem = precoVendaTotal - custoTotal - fpp - royalties;
    return { custo_total: custoTotal, preco_venda_total: precoVendaTotal, fpp, base_royalties: baseRoyalties, royalties, margem };
  }

  async adicionarItem() {
    const codigo = this.codigoBusca().trim();
    if (!codigo) return;

    if (this.incluirSeJaExistir(codigo)) {
      this.codigoBusca.set('');
      return;
    }

    this.buscando.set(true);
    try {
      const produto = await this.produtosService.buscarPorCodigoSap(codigo);
      if (!produto) {
        this.snack.open(`Nenhum produto encontrado para o código SAP "${codigo}".`, 'OK', { duration: 4000 });
        return;
      }
      this.incluirProduto(produto, codigo);
      this.codigoBusca.set('');
    } catch {
      this.snack.open('Erro ao buscar produto.', 'OK', { duration: 4000 });
    } finally {
      this.buscando.set(false);
    }
  }

  onDescricaoInput(valor: string) {
    this.descricaoBusca.set(valor);
    this.sugestoesAbertas.set(true);
  }

  selecionarSugestao(produto: Item) {
    if (!produto.codigo_sap) return;
    if (!this.incluirSeJaExistir(produto.codigo_sap)) {
      this.incluirProduto(produto, produto.codigo_sap);
    }
    this.descricaoBusca.set('');
    this.sugestoesAbertas.set(false);
  }

  fecharSugestoesComAtraso() {
    setTimeout(() => this.sugestoesAbertas.set(false), 150);
  }

  /** Se o código SAP já estiver na lista, soma +1 na quantidade e retorna true. */
  private incluirSeJaExistir(codigoSap: string): boolean {
    const existente = this.itens().find(i => i.codigo_sap === codigoSap);
    if (!existente) return false;
    this.itens.update(list =>
      list.map(i => i.codigo_sap === codigoSap ? { ...i, quantidade: i.quantidade + 1 } : i)
    );
    return true;
  }

  private incluirProduto(produto: Item, codigoFallback: string) {
    this.itens.update(list => [...list, {
      codigo_sap: produto.codigo_sap ?? codigoFallback,
      descricao: produto.descricao,
      preco_compra: produto.preco_compra,
      preco_venda: produto.preco_venda,
      cobra_fpp: produto.cobra_fpp ?? true,
      cobra_royalties: produto.cobra_royalties ?? true,
      quantidade: 1,
    }]);
  }

  atualizarQuantidade(codigoSap: string, valor: string) {
    const qtd = Math.max(1, parseFloat(valor.replace(',', '.')) || 1);
    this.itens.update(list =>
      list.map(i => i.codigo_sap === codigoSap ? { ...i, quantidade: qtd } : i)
    );
  }

  removerItem(codigoSap: string) {
    this.itens.update(list => list.filter(i => i.codigo_sap !== codigoSap));
  }

  iniciarEdicaoCompra(item: ItemSimulado) {
    this.compraEditando.set(item.preco_compra != null ? String(item.preco_compra) : '');
    this.editandoCompraCodigo.set(item.codigo_sap);
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('.compra-input');
      input?.focus();
      input?.select();
    }, 0);
  }

  cancelarEdicaoCompra() {
    this.editandoCompraCodigo.set(null);
  }

  confirmarEdicaoCompra(item: ItemSimulado) {
    if (this.editandoCompraCodigo() !== item.codigo_sap) return;
    this.editandoCompraCodigo.set(null);

    const valorStr = this.compraEditando().trim().replace(',', '.');
    const novoValor = valorStr === '' ? null : parseFloat(valorStr);

    if (novoValor === item.preco_compra) return;
    if (valorStr !== '' && (isNaN(novoValor!) || novoValor! < 0)) {
      this.snack.open('Preço de compra inválido.', 'OK', { duration: 3000 });
      return;
    }

    this.itens.update(list =>
      list.map(i => i.codigo_sap === item.codigo_sap ? { ...i, preco_compra: novoValor } : i)
    );
  }

  limpar() {
    this.itens.set([]);
    this.aliquotaRoyalties.set(ALIQUOTA_ROYALTIES_PADRAO);
    this.fppOffsetDias.set(OFFSET_FPP_PADRAO);
    this.offsetsRoyalties.set([OFFSET_ROYALTIES_INICIAL, OFFSET_ROYALTIES_INICIAL + INTERVALO_ENTRE_PARCELAS]);
    this.offsetsCompra.set([OFFSET_COMPRA_INICIAL, OFFSET_COMPRA_INICIAL + INTERVALO_ENTRE_PARCELAS]);
  }
}
