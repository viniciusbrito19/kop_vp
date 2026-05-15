import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { DespesasService, TituloDespesa } from '../../services/despesas.service';
import { DespesaRecorrente, LABELS_CATEGORIA, CategoriaDespesa } from '../../models/despesa.model';
import { TemplateDespesaDialogComponent } from './template-despesa-dialog.component';
import { GerarMesDialogComponent } from './gerar-mes-dialog.component';

const CAT_COR: Record<CategoriaDespesa, string> = {
  fornecedor:  '#7A1F2B',
  funcionario: '#A03548',
  aluguel:     '#C24655',
  energia:     '#A07A3F',
  agua:        '#3F7AA0',
  royalties:   '#82622F',
  fpp:         '#5A1620',
  outro:       '#967333',
};

const CAT_ICON: Record<CategoriaDespesa, string> = {
  fornecedor:  'local_shipping',
  funcionario: 'group',
  aluguel:     'home',
  energia:     'bolt',
  agua:        'water_drop',
  royalties:   'copyright',
  fpp:         'receipt_long',
  outro:       'more_horiz',
};

@Component({
  selector: 'app-lista-despesas',
  standalone: true,
  imports: [
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatButtonModule, MatIconModule, MatTooltipModule,
    MatSnackBarModule, MatProgressSpinnerModule,
    MatDialogModule, MatMenuModule,
  ],
  template: `
    @if (carregando()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="40"/>
      </div>
    } @else {
      <div style="padding:28px 32px 48px;max-width:1600px">

        <!-- ── Header ────────────────────────────────────────── -->
        <div class="row" style="align-items:flex-end;justify-content:space-between;margin-bottom:22px">
          <div>
            <h1 class="page">Despesas <span class="accent serif">fixas</span></h1>
            <div class="page-sub">O que a loja gasta todo mês para abrir as portas · {{ mesLabel }}</div>
          </div>
          <div class="row gap-2">
            <button class="btn ghost sm" type="button" (click)="toggleTitulos()">
              <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle">receipt_long</mat-icon>
              Títulos
            </button>
            <button class="btn outline" type="button">
              <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle">download</mat-icon>
              Exportar
            </button>
            <button class="btn primary" type="button" (click)="abrirDialogTemplate()">
              <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle">add</mat-icon>
              Nova Despesa
            </button>
          </div>
        </div>

        <!-- ── KPI row ───────────────────────────────────────── -->
        <div style="display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:14px;margin-bottom:22px">

          <!-- KPI principal bordô -->
          <div class="kpi bordo" style="padding:22px">
            <div class="kpi-label">
              <mat-icon style="font-size:14px;width:14px;height:14px">account_balance_wallet</mat-icon>
              CUSTO FIXO MENSAL
            </div>
            <div class="serif" style="font-size:44px;line-height:1.05;margin-top:4px">
              {{ moedaCompact(totalFixo) }}
            </div>
            <div style="font-size:12px;opacity:0.78;margin-top:6px;line-height:1.5">
              É quanto a loja gasta todo mês para abrir as portas.<br>
              <b style="opacity:1">{{ moedaCompact(breakEvenDia) }}/dia</b> é o custo diário da operação.
            </div>
            <div style="margin-top:14px;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.10);display:flex;align-items:center;gap:12px">
              <div style="height:6px;flex:1;background:rgba(255,255,255,0.20);border-radius:999px;overflow:hidden">
                <div [style.width.%]="pctPago" style="height:100%;background:var(--gold);border-radius:999px;transition:width 0.4s ease"></div>
              </div>
              <span style="font-size:12px;font-weight:700;color:var(--gold);white-space:nowrap">
                {{ fmtPct(pctPago) }}% pago
              </span>
            </div>
          </div>

          <!-- KPI Pagas -->
          <div class="kpi">
            <div class="kpi-label">
              <mat-icon style="font-size:14px;width:14px;height:14px">check_circle</mat-icon>
              PAGAS ESTE MÊS
            </div>
            <div class="kpi-value serif">{{ moedaCompact(totalPago) }}</div>
            <div class="kpi-foot">
              <span class="trend up">↑ {{ fmtPct(pctPago) }}%</span>
              <span>{{ paidCount }} de {{ templatesAtivos.length }} categorias</span>
            </div>
          </div>

          <!-- KPI A vencer -->
          <div class="kpi">
            <div class="kpi-label">
              <mat-icon style="font-size:14px;width:14px;height:14px">schedule</mat-icon>
              A VENCER
            </div>
            <div class="kpi-value serif" style="color:var(--bad)">{{ moedaCompact(totalDevido) }}</div>
            <div class="kpi-foot">{{ dueCount }} categorias pendentes</div>
          </div>

          <!-- KPI Break-even -->
          <div class="kpi gold">
            <div class="kpi-label">
              <mat-icon style="font-size:14px;width:14px;height:14px">bolt</mat-icon>
              BREAK-EVEN / DIA
            </div>
            <div class="kpi-value serif">{{ moedaCompact(breakEvenDia) }}</div>
            <div class="kpi-foot">meta diária de faturamento</div>
          </div>

        </div>

        <!-- ── 2-column layout ───────────────────────────────── -->
        <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:22px">

          <!-- ── Left: lista de despesas ──────────────────────── -->
          <div class="card" style="padding:22px">

            <!-- cabeçalho da lista -->
            <div class="row" style="justify-content:space-between;margin-bottom:18px;align-items:flex-start">
              <div>
                <h3 class="serif" style="margin:0;font-size:22px;font-weight:400">Despesas recorrentes</h3>
                <div style="font-size:12px;color:var(--text-3);margin-top:2px">
                  {{ paidCount }} pagas · {{ dueCount }} a vencer · vencimentos em {{ mesLabel }}
                </div>
              </div>
              <div class="row gap-2">
                <div class="seg">
                  @for (opt of filtroOpts; track opt.value) {
                    <button [class.on]="filtroLista() === opt.value"
                            (click)="filtroLista.set(opt.value)">{{ opt.label }}</button>
                  }
                </div>
                <button class="btn icon ghost" type="button" style="width:32px;height:32px"
                        (click)="abrirDialogTemplate()" matTooltip="Novo template">
                  <mat-icon style="font-size:16px;width:16px;height:16px">add</mat-icon>
                </button>
              </div>
            </div>

            <!-- barra de progresso do mês -->
            <div style="margin-bottom:22px;padding:14px 16px;background:var(--surface-2);border-radius:12px">
              <div class="row" style="justify-content:space-between;font-size:12px;margin-bottom:8px">
                <span style="color:var(--text-3)">Progresso do mês</span>
                <span style="font-weight:700">
                  <span style="color:var(--ok)">{{ moedaCompact(totalPago) }}</span>
                  <span style="color:var(--text-3)"> de {{ moedaCompact(totalFixo) }}</span>
                </span>
              </div>
              <div style="height:8px;background:var(--line-2);border-radius:999px;overflow:hidden;position:relative">
                <div [style.width.%]="pctPago"
                     style="position:absolute;inset:0;background:linear-gradient(90deg,var(--bordo) 0%,var(--bordo-2) 100%);border-radius:999px;transition:width 0.4s ease"></div>
              </div>
              <div class="row" style="justify-content:space-between;margin-top:6px;font-size:11px;color:var(--text-3)">
                <span>{{ fmtPct(pctPago) }}% liquidado</span>
                <span style="color:var(--bad);font-weight:600">faltam {{ moedaCompact(totalDevido) }}</span>
              </div>
            </div>

            <!-- linhas de despesa -->
            <div>
              @for (t of templatesFiltrados; track t.id; let i = $index) {
                <div class="row gap-3"
                     style="padding:12px 0;align-items:center"
                     [style.border-top]="i > 0 ? '1px solid var(--line)' : 'none'">

                  <!-- ícone de categoria -->
                  <div [style.background]="catCor(t.categoria) + '1F'"
                       [style.color]="catCor(t.categoria)"
                       style="width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
                    <mat-icon style="font-size:18px;width:18px;height:18px">{{ catIcon(t.categoria) }}</mat-icon>
                  </div>

                  <!-- descrição -->
                  <div style="flex:1;min-width:0">
                    <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      {{ t.descricao }}
                    </div>
                    <div style="font-size:11px;color:var(--text-3);margin-top:2px">
                      vence dia <span class="mono" style="font-weight:700">{{ t.dia_venc }}</span> · mensal recorrente
                    </div>
                  </div>

                  <!-- valor e status -->
                  <div style="text-align:right;flex-shrink:0">
                    <div class="serif" style="font-size:16px;line-height:1.1">{{ moeda(t.valor_estimado) }}</div>
                    <div style="margin-top:5px">
                      @if (isPago(t)) {
                        <span class="pill ok" style="font-size:10px;padding:2px 8px">
                          <mat-icon style="font-size:10px;width:10px;height:10px">check</mat-icon> pago
                        </span>
                      } @else {
                        <span class="pill warn" style="font-size:10px;padding:2px 8px">
                          <mat-icon style="font-size:10px;width:10px;height:10px">schedule</mat-icon> a vencer
                        </span>
                      }
                    </div>
                  </div>

                  <!-- menu kebab -->
                  <button class="btn icon ghost" type="button"
                          style="width:30px;height:30px;flex:0 0 auto;border-radius:8px"
                          [matMenuTriggerFor]="rowMenu"
                          [matMenuTriggerData]="{tpl: t}">
                    <mat-icon style="font-size:16px;width:16px;height:16px">more_vert</mat-icon>
                  </button>
                </div>
              }

              @if (templatesFiltrados.length === 0) {
                <div style="text-align:center;padding:32px;color:var(--text-4);font-size:14px">
                  Nenhuma despesa encontrada.
                </div>
              }
            </div>

            <!-- rodapé total -->
            <div class="row" style="margin-top:14px;padding-top:14px;border-top:2px solid var(--bordo-tint)">
              <div style="flex:1;font-size:13px;color:var(--text-2);font-weight:600">Total mensal recorrente</div>
              <div class="serif" style="font-size:26px;color:var(--bordo)">{{ moeda(totalFixo) }}</div>
            </div>
          </div>

          <!-- ── Right: categorias + próximas ─────────────────── -->
          <div class="col gap-4">

            <!-- Por categoria -->
            <div class="card" style="padding:22px">
              <h3 class="serif" style="margin:0;font-size:20px;font-weight:400">Por categoria</h3>
              <div style="font-size:12px;color:var(--text-3);margin-top:2px;margin-bottom:18px">
                onde o dinheiro vai · {{ mesLabel }}
              </div>

              <!-- Donut SVG -->
              <div style="display:flex;justify-content:center;margin-bottom:20px">
                <div style="position:relative;width:160px;height:160px">
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    @if (categoriasData.length === 0) {
                      <circle cx="80" cy="80" r="56" fill="none"
                              stroke="var(--line-2)" stroke-width="24"/>
                    }
                    <g transform="rotate(-90 80 80)">
                      @for (seg of donutSegments; track $index) {
                        <circle cx="80" cy="80" r="56" fill="none"
                                [attr.stroke]="seg.cor"
                                stroke-width="24"
                                stroke-linecap="butt"
                                [attr.stroke-dasharray]="seg.dashArray"
                                [attr.stroke-dashoffset]="seg.dashOffset"/>
                      }
                    </g>
                  </svg>
                  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none">
                    <div class="serif" style="font-size:20px;line-height:1">{{ moedaCompact(totalFixo) }}</div>
                    <div style="font-size:10px;color:var(--text-3);font-weight:600;letter-spacing:0.06em;text-transform:uppercase;margin-top:2px">TOTAL</div>
                  </div>
                </div>
              </div>

              <!-- lista de categorias -->
              <div class="col gap-2">
                @for (c of categoriasData; track c.label) {
                  <div class="row gap-3" style="align-items:center">
                    <span [style.background]="c.cor"
                          style="width:10px;height:10px;border-radius:3px;flex:0 0 auto"></span>
                    <span style="flex:1;font-size:12px;font-weight:500">{{ c.label }}</span>
                    <span style="font-size:11px;color:var(--text-3);min-width:28px;text-align:right">
                      {{ fmtPct(c.pct) }}%
                    </span>
                    <span class="mono" style="font-size:12px;font-weight:600;min-width:72px;text-align:right">
                      {{ moedaCompact(c.valor) }}
                    </span>
                  </div>
                }
              </div>
            </div>

            <!-- Próximas a vencer -->
            @if (templatesAVencer.length > 0) {
              <div class="card" style="padding:22px">
                <h3 class="serif" style="margin:0;font-size:20px;font-weight:400;margin-bottom:14px">
                  Próximas a vencer
                </h3>

                <div class="col gap-3">
                  @for (t of templatesAVencer; track t.id; let i = $index) {
                    <div class="row gap-3"
                         style="align-items:center;padding:8px 0"
                         [style.border-top]="i > 0 ? '1px dashed var(--line)' : 'none'">

                      <!-- badge de data -->
                      <div style="width:44px;height:44px;border-radius:12px;background:var(--warn-soft);color:var(--warn);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:0 0 auto">
                        <span style="font-size:8px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;opacity:0.7">
                          {{ mesAbrev }}
                        </span>
                        <span class="serif" style="font-size:18px;line-height:1">{{ t.dia_venc }}</span>
                      </div>

                      <div style="flex:1;min-width:0">
                        <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                          {{ t.descricao }}
                        </div>
                        <div style="font-size:11px;color:var(--text-3);margin-top:2px">vence dia {{ t.dia_venc }}</div>
                      </div>

                      <div style="text-align:right;flex-shrink:0">
                        <div class="serif" style="font-size:16px">{{ moeda(t.valor_estimado) }}</div>
                        <button class="btn sm ghost" type="button"
                                style="margin-top:2px;padding:0 8px;height:24px;font-size:11px"
                                (click)="gerarMes(t)">
                          Pagar
                        </button>
                      </div>
                    </div>
                  }
                </div>

                <!-- insight -->
                <div style="margin-top:16px;padding:14px;border-radius:12px;background:linear-gradient(135deg,var(--gold-soft) 0%,var(--bordo-tint) 100%);display:flex;gap:12px;align-items:flex-start">
                  <div style="width:32px;height:32px;border-radius:10px;background:var(--bordo);color:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
                    <mat-icon style="font-size:16px;width:16px;height:16px">bolt</mat-icon>
                  </div>
                  <div>
                    <div style="font-size:12px;font-weight:700;margin-bottom:2px">
                      {{ moedaCompact(totalDevido) }} vencem nos próximos dias
                    </div>
                    <div style="font-size:11px;color:var(--text-2);line-height:1.5">
                      Garanta que o caixa cobre os vencimentos antes das datas.
                    </div>
                  </div>
                </div>
              </div>
            }

          </div>
        </div>

        <!-- ── Seção de títulos (expansível) ─────────────────── -->
        @if (showTitulos) {
          <div class="card" style="margin-top:22px">
            <div class="row" style="padding:16px 20px;border-bottom:1px solid var(--line);align-items:center">
              <h3 class="serif" style="margin:0;font-size:20px;font-weight:400;flex:1">Todos os títulos</h3>
              <button class="btn icon ghost" type="button" style="width:32px;height:32px" (click)="showTitulos = false">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <table mat-table [dataSource]="dsTitulos" matSort class="full-table">

              <ng-container matColumnDef="data_vencimento">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Vencimento</th>
                <td mat-cell *matCellDef="let t">{{ data(t.data_vencimento) }}</td>
              </ng-container>

              <ng-container matColumnDef="codigo">
                <th mat-header-cell *matHeaderCellDef>Código</th>
                <td mat-cell *matCellDef="let t" class="mono-cell">{{ t.codigo }}</td>
              </ng-container>

              <ng-container matColumnDef="descricao">
                <th mat-header-cell *matHeaderCellDef>Descrição</th>
                <td mat-cell *matCellDef="let t">{{ t.descricao ?? '—' }}</td>
              </ng-container>

              <ng-container matColumnDef="fornecedor">
                <th mat-header-cell *matHeaderCellDef>Fornecedor</th>
                <td mat-cell *matCellDef="let t">{{ t.fornecedores?.nome ?? '—' }}</td>
              </ng-container>

              <ng-container matColumnDef="valor">
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="num-header">Valor</th>
                <td mat-cell *matCellDef="let t" class="num-cell">{{ moeda(t.valor) }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let t">
                  <span class="pill" [class.ok]="t.data_pagamento" [class.warn]="!t.data_pagamento">
                    {{ t.data_pagamento ? 'Pago' : 'Pendente' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="data_pagamento">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Pago em</th>
                <td mat-cell *matCellDef="let t">{{ data(t.data_pagamento) }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="colsTitulos"></tr>
              <tr mat-row *matRowDef="let row; columns: colsTitulos;"></tr>
              <tr class="mat-row" *matNoDataRow>
                <td class="mat-cell" [attr.colspan]="colsTitulos.length" class="empty-state">
                  Nenhum título encontrado.
                </td>
              </tr>
            </table>
            <mat-paginator [pageSizeOptions]="[25, 50, 100]" showFirstLastButtons/>
          </div>
        }

      </div>
    }

    <!-- ── Menu kebab por linha ──────────────────────────────── -->
    <mat-menu #rowMenu="matMenu">
      <ng-template matMenuContent let-tpl="tpl">
        <button mat-menu-item (click)="gerarMes(tpl)">
          <mat-icon>calendar_add_on</mat-icon> Gerar título
        </button>
        <button mat-menu-item (click)="abrirDialogTemplate(tpl)">
          <mat-icon>edit</mat-icon> Editar
        </button>
        <button mat-menu-item (click)="toggleAtivo(tpl)">
          <mat-icon>{{ tpl.ativo ? 'toggle_on' : 'toggle_off' }}</mat-icon>
          {{ tpl.ativo ? 'Desativar' : 'Ativar' }}
        </button>
        <button mat-menu-item (click)="excluirTemplate(tpl)" class="menu-danger">
          <mat-icon>delete</mat-icon> Excluir
        </button>
      </ng-template>
    </mat-menu>
  `,
  styles: [`
    .full-table  { width: 100%; }
    .num-header  { text-align: right !important; }
    .num-cell    { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .mono-cell   { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-3); }
    .empty-state { text-align: center; padding: 48px 32px; color: var(--text-4); display: table-cell; }
    .menu-danger { color: var(--bad) !important; }
    .menu-danger mat-icon { color: var(--bad) !important; }
  `],
})
export class ListaDespesasComponent implements OnInit {
  private svc    = inject(DespesasService);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort)      sort?: MatSort;

  carregando  = signal(false);
  filtroLista = signal<'todas' | 'a_vencer' | 'pagas'>('todas');
  showTitulos = false;

  dsTemplates = new MatTableDataSource<DespesaRecorrente>([]);
  dsTitulos   = new MatTableDataSource<TituloDespesa>([]);

  colsTitulos = ['data_vencimento', 'codigo', 'descricao', 'fornecedor', 'valor', 'status', 'data_pagamento'];

  readonly filtroOpts = [
    { value: 'todas'    as const, label: 'Todas'    },
    { value: 'a_vencer' as const, label: 'A vencer' },
    { value: 'pagas'    as const, label: 'Pagas'    },
  ];

  private readonly CIRCUMFERENCE = 2 * Math.PI * 56;

  // ── Mês ─────────────────────────────────────────────────────
  private get _now() { return new Date(); }

  get mesLabel(): string {
    return this._now.toLocaleDateString('pt-BR', { month: 'long', year: '2-digit' });
  }

  get mesAbrev(): string {
    return this._now.toLocaleDateString('pt-BR', { month: 'short' })
      .replace('.', '').toUpperCase();
  }

  private get mesPrefixo(): string {
    const d = this._now;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // ── Dados derivados ─────────────────────────────────────────
  private get titulosMes(): TituloDespesa[] {
    return this.dsTitulos.data.filter(t => t.data_vencimento?.startsWith(this.mesPrefixo));
  }

  get templatesAtivos(): DespesaRecorrente[] {
    return [...this.dsTemplates.data.filter(t => t.ativo)]
      .sort((a, b) => a.dia_venc - b.dia_venc);
  }

  isPago(tpl: DespesaRecorrente): boolean {
    return this.titulosMes.some(t => t.despesa_recorrente_id === tpl.id && !!t.data_pagamento);
  }

  get paidCount(): number   { return this.templatesAtivos.filter(t =>  this.isPago(t)).length; }
  get dueCount(): number    { return this.templatesAtivos.filter(t => !this.isPago(t)).length; }
  get totalFixo(): number   { return this.templatesAtivos.reduce((s, t) => s + t.valor_estimado, 0); }
  get totalPago(): number   { return this.templatesAtivos.filter(t => this.isPago(t)).reduce((s, t) => s + t.valor_estimado, 0); }
  get totalDevido(): number { return this.totalFixo - this.totalPago; }
  get pctPago(): number     { return this.totalFixo > 0 ? (this.totalPago / this.totalFixo) * 100 : 0; }
  get breakEvenDia(): number { return this.totalFixo / 30; }

  get templatesFiltrados(): DespesaRecorrente[] {
    const f = this.filtroLista();
    if (f === 'a_vencer') return this.templatesAtivos.filter(t => !this.isPago(t));
    if (f === 'pagas')    return this.templatesAtivos.filter(t =>  this.isPago(t));
    return this.templatesAtivos;
  }

  get templatesAVencer(): DespesaRecorrente[] {
    return this.templatesAtivos.filter(t => !this.isPago(t));
  }

  get categoriasData(): { label: string; valor: number; cor: string; pct: number }[] {
    const total = this.totalFixo;
    const groups = new Map<string, { valor: number; cor: string }>();
    for (const t of this.templatesAtivos) {
      const label = t.categoria ? LABELS_CATEGORIA[t.categoria] : 'Outro';
      const cor   = t.categoria ? CAT_COR[t.categoria] : '#967333';
      const prev  = groups.get(label);
      groups.set(label, { valor: (prev?.valor ?? 0) + t.valor_estimado, cor });
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[1].valor - a[1].valor)
      .map(([label, { valor, cor }]) => ({
        label, valor, cor,
        pct: total > 0 ? (valor / total) * 100 : 0,
      }));
  }

  get donutSegments(): { cor: string; dashArray: string; dashOffset: string }[] {
    let cumPct = 0;
    return this.categoriasData.map(c => {
      const dash = (c.pct / 100) * this.CIRCUMFERENCE;
      const seg  = {
        cor:        c.cor,
        dashArray:  `${dash} ${this.CIRCUMFERENCE}`,
        dashOffset: `${-(cumPct / 100) * this.CIRCUMFERENCE}`,
      };
      cumPct += c.pct;
      return seg;
    });
  }

  catCor(cat: CategoriaDespesa | null): string  { return cat ? CAT_COR[cat]  : '#967333'; }
  catIcon(cat: CategoriaDespesa | null): string { return cat ? CAT_ICON[cat] : 'more_horiz'; }

  // ── Formatação ──────────────────────────────────────────────
  moeda(v: number): string {
    return v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—';
  }

  moedaCompact(v: number): string {
    return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  }

  fmtPct(v: number): string { return Math.round(v).toString(); }

  data(d: string | null): string {
    if (!d) return '';
    const [a, m, dia] = d.split('-');
    return `${dia}/${m}/${a}`;
  }

  // ── Ações ───────────────────────────────────────────────────
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
    }
  }

  toggleTitulos() {
    this.showTitulos = !this.showTitulos;
    if (this.showTitulos) {
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
}
