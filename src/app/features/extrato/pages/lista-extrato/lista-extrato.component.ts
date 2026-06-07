import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { Router } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePickerComponent } from '../../../../shared/components/date-picker.component';
import { ExtratoService } from '../../services/extrato.service';
import { CorrelacaoService } from '../../services/correlacao.service';
import {
  LancamentoExtrato,
  LABELS_TIPO,
  TipoLancamento,
  NaturezaLancamento,
} from '../../models/extrato.model';
import { DespesasService } from '../../../despesas/services/despesas.service';
import { FornecedoresService } from '../../../fornecedores/services/fornecedores.service';
import { DespesaRecorrente } from '../../../despesas/models/despesa.model';
import { Fornecedor } from '../../../fornecedores/models/fornecedor.model';

interface FiltroExtrato {
  dataInicio: string | null;
  dataFim: string | null;
  natureza: NaturezaLancamento | '' | null;
  tipo: TipoLancamento | '' | null;
  destinatario: string | null;
  vinculado: boolean | null;
}

const TIPOS_SAIDA: TipoLancamento[] = [
  'pix_enviado', 'pagamento_efetuado', 'compra_debito', 'debito_conta', 'outros_pagamentos',
];
const TIPOS_ENTRADA: TipoLancamento[] = [
  'pix_recebido', 'pix_devolvido', 'deposito_boleto',
  'recebimento_cartao', 'transferencia_recebida', 'outros_recebimentos',
];

@Component({
  selector: 'app-lista-extrato',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DatePickerComponent,
  ],
  templateUrl: './lista-extrato.component.html',
  styleUrl: './lista-extrato.component.scss',
})
export class ListaExtratoComponent implements OnInit, OnDestroy {
  private service      = inject(ExtratoService);
  private despesasSvc  = inject(DespesasService);
  private fornSvc      = inject(FornecedoresService);
  private correlacaoSvc = inject(CorrelacaoService);
  private snack        = inject(MatSnackBar);
  private fb           = inject(FormBuilder);
  private router       = inject(Router);
  private destroy$     = new Subject<void>();

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort)      sort?: MatSort;

  dataSource = new MatTableDataSource<LancamentoExtrato>([]);
  carregando   = signal(false);
  importando   = signal(false);
  conciliando  = signal(false);
  editandoId  = signal<string | null>(null);
  salvando    = signal(false);
  excluindoId = signal<string | null>(null);

  private _lancamentos = signal<LancamentoExtrato[]>([]);

  totalLancamentos = computed(() => this._lancamentos().length);
  totalEntradas    = computed(() => this._lancamentos().filter(l => l.natureza === 'entrada').reduce((s, l) => s + l.valor, 0));
  totalSaidas      = computed(() => Math.abs(this._lancamentos().filter(l => l.natureza === 'saida').reduce((s, l) => s + l.valor, 0)));
  qtdEntradas      = computed(() => this._lancamentos().filter(l => l.natureza === 'entrada').length);
  qtdSaidas        = computed(() => this._lancamentos().filter(l => l.natureza === 'saida').length);
  saldoAtual       = computed(() => {
    const lista = this._lancamentos();
    return lista.length ? lista[0].saldo : 0;
  });

  // ── Painel lateral ────────────────────────────────────────────────────
  painelAberto          = signal(false);
  lancamentoSelecionado = signal<LancamentoExtrato | null>(null);
  salvandoIdentificacao = signal(false);
  templates             = signal<DespesaRecorrente[]>([]);
  fornecedores          = signal<Fornecedor[]>([]);
  painelForm = this.fb.group({
    modo:          ['recorrente'],
    templateId:    [''],
    fornecedorId:  [''],
    descricao:     [''],
    valor:         [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  get painelInvalido(): boolean {
    const v = this.painelForm.value;
    if (!v.valor || v.valor <= 0) return true;
    if (v.modo === 'recorrente') return !v.templateId;
    return !v.descricao?.trim();
  }

  colunas = ['data_lancamento', 'natureza', 'tipo', 'destinatario_remetente', 'valor', 'saldo', 'pedido', 'acoes'];
  colunasFiltro = this.colunas.map(c => c + '_filtro');

  readonly tiposLancamento = Object.entries(LABELS_TIPO) as [TipoLancamento, string][];

  filtros = this.fb.group({
    dataInicio: [''],
    dataFim: [''],
    natureza: ['' as NaturezaLancamento | ''],
    tipo: ['' as TipoLancamento | ''],
    destinatario: [''],
    vinculado: [false],
  });

  get ctrlDataInicio()   { return this.filtros.controls.dataInicio as FormControl; }
  get ctrlDataFim()      { return this.filtros.controls.dataFim as FormControl; }
  get ctrlNatureza()     { return this.filtros.controls.natureza as FormControl; }
  get ctrlTipo()         { return this.filtros.controls.tipo as FormControl; }
  get ctrlDestinatario() { return this.filtros.controls.destinatario as FormControl; }
  get ctrlVinculado()    { return this.filtros.controls.vinculado as FormControl; }

  toggleVinculado() {
    this.ctrlVinculado.setValue(!this.ctrlVinculado.value, { emitEvent: false });
    this.dataSource.filter = JSON.stringify(this.filtros.value);
    this.dataSource.paginator?.firstPage();
  }

  get filtrosAtivos(): boolean {
    const v = this.filtros.value;
    return !!(v.dataInicio || v.dataFim || v.natureza || v.tipo || v.destinatario || v.vinculado);
  }

  isEditavel(l: LancamentoExtrato): boolean {
    return l.tipo === 'outros_pagamentos' || l.tipo === 'outros_recebimentos';
  }

  isIdentificavel(l: LancamentoExtrato): boolean {
    return l.natureza === 'saida' && !l.pedido && !l.despesa;
  }

  async abrirPainel(l: LancamentoExtrato) {
    this.lancamentoSelecionado.set(l);
    this.painelAberto.set(true);
    this.painelForm.reset({
      modo:         'recorrente',
      templateId:   '',
      fornecedorId: '',
      descricao:    '',
      valor:        Math.abs(l.valor),
    });
    if (!this.templates().length) {
      const [templates, fornecedores] = await Promise.all([
        this.despesasSvc.listarTemplates(),
        this.fornSvc.listar(),
      ]);
      this.templates.set(templates);
      this.fornecedores.set(fornecedores);
    }
  }

  fecharPainel() {
    this.painelAberto.set(false);
    this.lancamentoSelecionado.set(null);
  }

  aoSelecionarFornecedor(_event: Event) {
    // categoria do fornecedor não mapeia diretamente para categoria de despesa
  }

  async salvarIdentificacao() {
    const v    = this.painelForm.value;
    const lanc = this.lancamentoSelecionado();
    if (!lanc || !v.valor) return;

    let fornecedorId: string | null;
    let descricao: string;
    let templateId: string | null;

    if (v.modo === 'recorrente' && v.templateId) {
      const tpl = this.templates().find(t => t.id === v.templateId);
      if (!tpl) return;
      fornecedorId = tpl.fornecedor_id;
      descricao    = tpl.descricao;
      templateId   = tpl.id;
    } else {
      if (!v.descricao) return;
      fornecedorId = v.fornecedorId || null;
      descricao    = v.descricao;
      templateId   = null;
    }

    this.salvandoIdentificacao.set(true);
    try {
      await this.despesasSvc.identificarLancamento({
        lancamentoId:   lanc.id,
        dataLancamento: lanc.data_lancamento,
        valorReal:      v.valor,
        fornecedorId,
        descricao,
        templateId,
      });
      this.fecharPainel();
      await this.carregar();
      this.snack.open('Despesa registrada.', 'OK', { duration: 4000 });
    } catch {
      this.snack.open('Erro ao registrar despesa.', 'OK', { duration: 4000 });
    } finally {
      this.salvandoIdentificacao.set(false);
    }
  }

  tiposParaNatureza(natureza: NaturezaLancamento): [TipoLancamento, string][] {
    const allowed = natureza === 'entrada' ? TIPOS_ENTRADA : TIPOS_SAIDA;
    return this.tiposLancamento.filter(([t]) => allowed.includes(t));
  }

  iniciarEdicao(l: LancamentoExtrato) {
    this.editandoId.set(l.id);
  }

  cancelarEdicao() {
    this.editandoId.set(null);
  }

  async salvarTipo(lancamento: LancamentoExtrato, event: Event) {
    const novoTipo = (event.target as HTMLSelectElement).value as TipoLancamento;
    if (novoTipo === lancamento.tipo) {
      this.cancelarEdicao();
      return;
    }
    this.salvando.set(true);
    try {
      await this.service.atualizarTipo(lancamento.id, novoTipo);
      const novaLista = this.dataSource.data.map(r =>
        r.id === lancamento.id ? { ...r, tipo: novoTipo } : r
      );
      this.dataSource.data = novaLista;
      this.cancelarEdicao();
    } catch {
      this.snack.open('Erro ao salvar. Tente novamente.', 'OK', { duration: 4000 });
    } finally {
      this.salvando.set(false);
    }
  }

  async ngOnInit() {
    this.configurarFilterPredicate();
    await this.carregar();

    this.filtros.valueChanges
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(v => {
        this.dataSource.filter = JSON.stringify(v);
        this.dataSource.paginator?.firstPage();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private configurarFilterPredicate() {
    this.dataSource.filterPredicate = (row: LancamentoExtrato, filterJson: string) => {
      const f: FiltroExtrato = JSON.parse(filterJson);
      if (f.dataInicio && row.data_lancamento < f.dataInicio) return false;
      if (f.dataFim && row.data_lancamento > f.dataFim) return false;
      if (f.natureza && row.natureza !== f.natureza) return false;
      if (f.tipo && row.tipo !== f.tipo) return false;
      if (f.destinatario) {
        if (!row.destinatario_remetente.toLowerCase().includes(f.destinatario.toLowerCase())) {
          return false;
        }
      }
      if (f.vinculado && !row.pedido && !row.despesa) return false;
      return true;
    };
  }

  limparFiltros() {
    this.filtros.reset({ dataInicio: '', dataFim: '', natureza: '', tipo: '', destinatario: '', vinculado: false });
    this.dataSource.filter = '';
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const dados = await this.service.listar();
      this.dataSource.data = dados;
      this._lancamentos.set(dados);
    } finally {
      this.carregando.set(false);
      setTimeout(() => {
        if (this.paginator) this.dataSource.paginator = this.paginator;
        if (this.sort) this.dataSource.sort = this.sort;
      });
    }
  }

  async conciliar() {
    this.conciliando.set(true);
    try {
      // Pass 1: correlaciona títulos de NF-e/pedidos (cobre casos onde o título
      // foi cadastrado após o import do CSV, ou quando executar() falhou silenciosamente)
      const nfe = await this.correlacaoSvc.executar();

      // Pass 2: correlaciona despesas recorrentes
      const { vinculadas, criadas } = await this.correlacaoSvc.conciliarDespesas();

      const total = nfe + vinculadas + criadas;
      if (total === 0) {
        this.snack.open('Nenhum lançamento conciliado.', 'OK', { duration: 4000 });
      } else {
        const partes: string[] = [];
        if (nfe)      partes.push(`${nfe} título${nfe > 1 ? 's' : ''} de pedido`);
        if (vinculadas) partes.push(`${vinculadas} despesa${vinculadas > 1 ? 's' : ''} vinculada${vinculadas > 1 ? 's' : ''}`);
        if (criadas)    partes.push(`${criadas} despesa${criadas > 1 ? 's' : ''} criada${criadas > 1 ? 's' : ''}`);
        this.snack.open(`Conciliação concluída: ${partes.join(', ')}.`, 'OK', { duration: 5000 });
        await this.carregar();
      }
    } catch {
      this.snack.open('Erro durante a conciliação.', 'OK', { duration: 4000 });
    } finally {
      this.conciliando.set(false);
    }
  }

  async onArquivoSelecionado(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) return;

    this.importando.set(true);
    try {
      const resultado = await this.service.importarCsv(input.files[0]);
      let msg: string;
      if (resultado.duplicatas > 0 && resultado.inseridos === 0) {
        msg = 'Arquivo analisado. Itens duplicados não foram inseridos.';
      } else if (resultado.duplicatas > 0) {
        msg = `Arquivo analisado. ${resultado.inseridos} lançamento(s) inserido(s). Itens duplicados não foram inseridos.`;
      } else {
        msg = `${resultado.inseridos} lançamento(s) importado(s) com sucesso.`;
      }
      this.snack.open(msg, 'OK', { duration: 6000 });
      await this.carregar();
    } catch (err) {
      this.snack.open(`Erro na importação: ${(err as Error).message}`, 'OK', { duration: 6000 });
    } finally {
      this.importando.set(false);
      input.value = '';
    }
  }

  labelTipo(tipo: TipoLancamento): string {
    return LABELS_TIPO[tipo] ?? tipo;
  }

  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatarMoedaCurta(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  abrirPedido(pedidoId: string) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/pedidos'], { queryParams: { expandir: pedidoId } })
    );
    window.open(url, '_blank');
  }

  async excluirLancamento(l: LancamentoExtrato) {
    const msg = `Excluir lançamento de ${this.formatarMoeda(l.valor)} em ${this.formatarData(l.data_lancamento)}?`;
    if (!confirm(msg)) return;

    this.excluindoId.set(l.id);
    try {
      await this.service.excluir(l.id);
      this.dataSource.data = this.dataSource.data.filter(r => r.id !== l.id);
      this._lancamentos.set(this._lancamentos().filter(r => r.id !== l.id));
    } catch {
      this.snack.open('Erro ao excluir lançamento.', 'OK', { duration: 4000 });
    } finally {
      this.excluindoId.set(null);
    }
  }

  formatarData(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }
}
