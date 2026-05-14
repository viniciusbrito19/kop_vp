import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { DespesasService, TituloDespesa } from '../../services/despesas.service';
import { DespesaRecorrente } from '../../models/despesa.model';
import { TemplateDespesaDialogComponent } from './template-despesa-dialog.component';
import { GerarMesDialogComponent } from './gerar-mes-dialog.component';

@Component({
  selector: 'app-lista-despesas',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatChipsModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Despesas</h1>
      </div>

      @if (carregando()) {
        <div class="loading"><mat-spinner diameter="40" /></div>
      } @else {
        <mat-tab-group animationDuration="150ms">

          <!-- ── Tab: Templates ─────────────────────────────── -->
          <mat-tab label="Templates recorrentes">
            <div class="tab-content">
              <div class="tab-actions">
                <button mat-flat-button color="primary" (click)="abrirDialogTemplate()">
                  <mat-icon>add</mat-icon> Novo template
                </button>
              </div>

              <mat-card>
                <table mat-table [dataSource]="dsTemplates" matSort class="full-table">

                  <ng-container matColumnDef="descricao">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Descrição</th>
                    <td mat-cell *matCellDef="let t">{{ t.descricao }}</td>
                  </ng-container>

                  <ng-container matColumnDef="categoria">
                    <th mat-header-cell *matHeaderCellDef>Categoria</th>
                    <td mat-cell *matCellDef="let t">
                      @if (t.fornecedor?.categoria_fornecedor?.nome) {
                        <span class="chip-cat">{{ t.fornecedor.categoria_fornecedor.nome }}</span>
                      } @else {
                        <span class="vazio">—</span>
                      }
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="fornecedor">
                    <th mat-header-cell *matHeaderCellDef>Fornecedor</th>
                    <td mat-cell *matCellDef="let t">{{ t.fornecedor?.nome ?? '—' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="valor_estimado">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header class="num-header">Valor estimado</th>
                    <td mat-cell *matCellDef="let t" class="num-cell">{{ moeda(t.valor_estimado) }}</td>
                  </ng-container>

                  <ng-container matColumnDef="dia_venc">
                    <th mat-header-cell *matHeaderCellDef class="num-header">Dia venc.</th>
                    <td mat-cell *matCellDef="let t" class="num-cell">{{ t.dia_venc }}</td>
                  </ng-container>

                  <ng-container matColumnDef="ativo">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let t">
                      <span class="badge" [class.badge-ativo]="t.ativo" [class.badge-inativo]="!t.ativo">
                        {{ t.ativo ? 'Ativo' : 'Inativo' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="acoes">
                    <th mat-header-cell *matHeaderCellDef class="acoes-header"></th>
                    <td mat-cell *matCellDef="let t" class="acoes-cell">
                      <button mat-icon-button color="primary"
                              (click)="gerarMes(t)" matTooltip="Gerar título para um mês" type="button">
                        <mat-icon>calendar_add_on</mat-icon>
                      </button>
                      <button mat-icon-button (click)="abrirDialogTemplate(t)"
                              matTooltip="Editar" type="button">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button (click)="toggleAtivo(t)"
                              [matTooltip]="t.ativo ? 'Desativar' : 'Ativar'" type="button">
                        <mat-icon>{{ t.ativo ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                      </button>
                      <button mat-icon-button color="warn"
                              (click)="excluirTemplate(t)" matTooltip="Excluir" type="button">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="colsTemplates"></tr>
                  <tr mat-row *matRowDef="let row; columns: colsTemplates;"
                      [class.inativo]="!row.ativo"></tr>
                  <tr class="mat-row" *matNoDataRow>
                    <td class="mat-cell empty-state" [attr.colspan]="colsTemplates.length">
                      Nenhum template cadastrado.
                    </td>
                  </tr>
                </table>
              </mat-card>
            </div>
          </mat-tab>

          <!-- ── Tab: Títulos ───────────────────────────────── -->
          <mat-tab label="Títulos">
            <div class="tab-content">
              <mat-card>
                <table mat-table [dataSource]="dsTitulos" matSort class="full-table">

                  <ng-container matColumnDef="data_vencimento">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Vencimento</th>
                    <td mat-cell *matCellDef="let t" class="data-cell">{{ data(t.data_vencimento) }}</td>
                  </ng-container>

                  <ng-container matColumnDef="categoria">
                    <th mat-header-cell *matHeaderCellDef>Categoria</th>
                    <td mat-cell *matCellDef="let t">
                      @if (t.fornecedores?.categoria_fornecedor?.nome) {
                        <span class="chip-cat">{{ t.fornecedores.categoria_fornecedor.nome }}</span>
                      } @else {
                        <span class="vazio">—</span>
                      }
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="descricao">
                    <th mat-header-cell *matHeaderCellDef>Descrição</th>
                    <td mat-cell *matCellDef="let t">{{ t.descricao }}</td>
                  </ng-container>

                  <ng-container matColumnDef="valor">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header class="num-header">Valor</th>
                    <td mat-cell *matCellDef="let t" class="num-cell">{{ moeda(t.valor) }}</td>
                  </ng-container>

                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let t">
                      <span class="badge" [class.badge-pago]="t.data_pagamento" [class.badge-pendente]="!t.data_pagamento">
                        {{ t.data_pagamento ? 'Pago' : 'Pendente' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="data_pagamento">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Pago em</th>
                    <td mat-cell *matCellDef="let t" class="data-cell">{{ data(t.data_pagamento) }}</td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="colsTitulos"></tr>
                  <tr mat-row *matRowDef="let row; columns: colsTitulos;"></tr>
                  <tr class="mat-row" *matNoDataRow>
                    <td class="mat-cell empty-state" [attr.colspan]="colsTitulos.length">
                      Nenhum título de despesa encontrado.
                    </td>
                  </tr>
                </table>
                <mat-paginator [pageSizeOptions]="[25, 50, 100]" showFirstLastButtons />
              </mat-card>
            </div>
          </mat-tab>

        </mat-tab-group>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 32px; }
    .page-header    { margin-bottom: 24px; }
    .page-header h1 { margin: 0; font-size: 24px; font-weight: 600; color: #90282a; }
    .loading        { display: flex; justify-content: center; padding: 48px; }
    .tab-content    { padding-top: 20px; }
    .tab-actions    { margin-bottom: 16px; }
    .full-table     { width: 100%; }
    .num-header     { text-align: right !important; }
    .num-cell       { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .data-cell      { white-space: nowrap; width: 110px; }
    .acoes-header,
    .acoes-cell     { width: 160px; padding-left: 4px !important; padding-right: 4px !important; }
    .empty-state    { text-align: center; padding: 48px 32px; color: #999; }
    .inativo        { opacity: 0.5; }
    .vazio          { color: #bbb; }
    .chave          { background: #f3f4f6; border-radius: 4px; padding: 2px 6px; font-size: 12px; }

    .chip-cat {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      background: #f0e6ff;
      color: #5b21b6;
    }

    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-ativo    { background: #e6f4ea; color: #1a7a37; }
    .badge-inativo  { background: #f3f4f6; color: #6b7280; }
    .badge-pago     { background: #e6f4ea; color: #1a7a37; }
    .badge-pendente { background: #fef3c7; color: #92400e; }
  `],
})
export class ListaDespesasComponent implements OnInit {
  private svc   = inject(DespesasService);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort)      sort?: MatSort;

  carregando  = signal(false);
  dsTemplates = new MatTableDataSource<DespesaRecorrente>([]);
  dsTitulos   = new MatTableDataSource<TituloDespesa>([]);

  colsTemplates = ['descricao', 'categoria', 'fornecedor', 'valor_estimado', 'dia_venc', 'ativo', 'acoes'];
  colsTitulos   = ['data_vencimento', 'categoria', 'descricao', 'valor', 'status', 'data_pagamento'];

  async ngOnInit() { await this.carregar(); }

  async carregar() {
    this.carregando.set(true);
    try {
      const [templates, titulos] = await Promise.all([
        this.svc.listarTemplates(),
        this.svc.listarTitulosDespesa(),
      ]);
      this.dsTemplates.data = templates;
      this.dsTitulos.data   = titulos;
    } finally {
      this.carregando.set(false);
      setTimeout(() => {
        if (this.paginator) this.dsTitulos.paginator = this.paginator;
        if (this.sort)      this.dsTitulos.sort      = this.sort;
      });
    }
  }

  abrirDialogTemplate(t?: DespesaRecorrente) {
    this.dialog.open(TemplateDespesaDialogComponent, { data: t ?? null, width: '520px' })
      .afterClosed().subscribe(ok => { if (ok) this.carregar(); });
  }

  gerarMes(t: DespesaRecorrente) {
    this.dialog.open(GerarMesDialogComponent, { data: t, width: '320px' })
      .afterClosed().subscribe(ok => { if (ok) this.carregar(); });
  }

  async toggleAtivo(t: DespesaRecorrente) {
    try {
      await this.svc.atualizarTemplate(t.id, { ativo: !t.ativo });
      await this.carregar();
    } catch {
      this.snack.open('Erro ao atualizar.', 'OK', { duration: 4000 });
    }
  }

  async excluirTemplate(t: DespesaRecorrente) {
    if (!confirm(`Excluir o template "${t.descricao}"?`)) return;
    try {
      await this.svc.excluirTemplate(t.id);
      await this.carregar();
    } catch {
      this.snack.open('Erro ao excluir.', 'OK', { duration: 4000 });
    }
  }

  moeda(v: number): string {
    return v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '';
  }

  data(d: string | null): string {
    if (!d) return '';
    const [a, m, dia] = d.split('-');
    return `${dia}/${m}/${a}`;
  }
}
