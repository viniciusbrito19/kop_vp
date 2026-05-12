import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { Router } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExtratoService } from '../../services/extrato.service';
import {
  LancamentoExtrato,
  LABELS_TIPO,
  TipoLancamento,
  NaturezaLancamento,
} from '../../models/extrato.model';

interface FiltroExtrato {
  dataInicio: string | null;
  dataFim: string | null;
  natureza: NaturezaLancamento | '' | null;
  tipo: TipoLancamento | '' | null;
  destinatario: string | null;
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
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './lista-extrato.component.html',
  styleUrl: './lista-extrato.component.scss',
})
export class ListaExtratoComponent implements OnInit, OnDestroy {
  private service = inject(ExtratoService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  dataSource = new MatTableDataSource<LancamentoExtrato>([]);
  carregando = signal(false);
  importando = signal(false);
  editandoId = signal<string | null>(null);
  salvando = signal(false);

  colunas = ['data_lancamento', 'natureza', 'tipo', 'destinatario_remetente', 'valor', 'saldo', 'pedido', 'acoes'];
  colunasFiltro = this.colunas.map(c => c + '_filtro');

  readonly tiposLancamento = Object.entries(LABELS_TIPO) as [TipoLancamento, string][];

  filtros = this.fb.group({
    dataInicio: [''],
    dataFim: [''],
    natureza: ['' as NaturezaLancamento | ''],
    tipo: ['' as TipoLancamento | ''],
    destinatario: [''],
  });

  get ctrlDataInicio()   { return this.filtros.controls.dataInicio as FormControl; }
  get ctrlDataFim()      { return this.filtros.controls.dataFim as FormControl; }
  get ctrlNatureza()     { return this.filtros.controls.natureza as FormControl; }
  get ctrlTipo()         { return this.filtros.controls.tipo as FormControl; }
  get ctrlDestinatario() { return this.filtros.controls.destinatario as FormControl; }

  get filtrosAtivos(): boolean {
    const v = this.filtros.value;
    return !!(v.dataInicio || v.dataFim || v.natureza || v.tipo || v.destinatario);
  }

  isEditavel(l: LancamentoExtrato): boolean {
    return l.tipo === 'outros_pagamentos' || l.tipo === 'outros_recebimentos';
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
      return true;
    };
  }

  limparFiltros() {
    this.filtros.reset({ dataInicio: '', dataFim: '', natureza: '', tipo: '', destinatario: '' });
  }

  async carregar() {
    this.carregando.set(true);
    try {
      this.dataSource.data = await this.service.listar();
    } finally {
      this.carregando.set(false);
      setTimeout(() => {
        if (this.paginator) this.dataSource.paginator = this.paginator;
        if (this.sort) this.dataSource.sort = this.sort;
      });
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

  abrirPedido(pedidoId: string) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/pedidos'], { queryParams: { expandir: pedidoId } })
    );
    window.open(url, '_blank');
  }

  formatarData(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }
}
