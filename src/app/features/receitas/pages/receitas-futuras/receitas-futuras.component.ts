import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReceitasService } from '../../services/receitas.service';
import { RecebimentoCartao, GrupoDia } from '../../models/receita.model';
import { ExtratoService } from '../../../extrato/services/extrato.service';
import { LancamentoExtrato } from '../../../extrato/models/extrato.model';
import { DatePickerComponent } from '../../../../shared/components/date-picker.component';
import { PageHeaderService } from '../../../../core/services/page-header.service';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

@Component({
  selector: 'app-receitas-futuras',
  standalone: true,
  imports: [
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatButtonModule, MatIconModule, MatTooltipModule,
    MatSnackBarModule, MatProgressSpinnerModule,
    DatePickerComponent,
  ],
  template: `
    @if (carregando()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="40"/>
      </div>
    } @else {
      <div class="outer-wrap" style="padding:28px 32px 48px;max-width:1600px">

        <!-- ── Header ─────────────────────────────────────── -->
        <div class="row header-row list-page-heading" style="justify-content:space-between;margin-bottom:22px">
          <div>
            <h1 class="page">Receitas <span class="accent serif">futuras</span></h1>
            <div class="page-sub">O que a loja vai receber nos próximos dias · {{ mesLabel }}</div>
          </div>
          <div class="row gap-2 header-btns">
            <button class="btn ghost sm" type="button" (click)="toggleTitulos()">
              <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle">receipt_long</mat-icon>
              Títulos
            </button>
            <button class="btn outline" type="button" (click)="exportarCsv()">
              <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle">download</mat-icon>
              Exportar
            </button>
            <button class="btn primary" type="button" (click)="fileInput.click()">
              <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle">upload</mat-icon>
              Importar CSV
            </button>
          </div>
        </div>
        <input #fileInput type="file" accept=".csv" style="display:none" (change)="onFileChange($event)">

        <!-- ── KPIs ─────────────────────────────────────────── -->
        <div class="kpi-grid-resp" style="display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:14px;margin-bottom:22px">

          <!-- KPI 1 – Total previsto -->
          <div class="kpi bordo kpi-main" style="padding:22px">
            <div class="kpi-label">
              <mat-icon style="font-size:14px;width:14px;height:14px">account_balance_wallet</mat-icon>
              TOTAL PREVISTO · {{ mesAbrev }}
            </div>
            <div class="serif" style="font-size:44px;line-height:1.05;margin-top:4px">
              {{ moedaCompact(totalMes) }}
            </div>
            <div style="font-size:12px;opacity:0.78;margin-top:6px;line-height:1.5">
              é quanto a loja vai receber no mês.<br>
              <b style="opacity:1">{{ moedaCompact(ticketMedioDia) }}/dia</b> é o ticket médio previsto.
            </div>
            <div style="margin-top:14px;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.10);display:flex;align-items:center;gap:12px">
              <div style="height:6px;flex:1;background:rgba(255,255,255,0.20);border-radius:999px;overflow:hidden">
                <div [style.width.%]="pctRecebido"
                     style="height:100%;background:var(--gold);border-radius:999px;transition:width 0.4s ease"></div>
              </div>
              <span style="font-size:12px;font-weight:700;color:var(--gold);white-space:nowrap">
                {{ fmtPct(pctRecebido) }}% recebido
              </span>
            </div>
            <div style="margin-top:8px;font-size:11px;opacity:0.65">
              {{ countAReceber }} títulos a receber
            </div>
          </div>

          <!-- KPI 2 – Recebidas este mês -->
          <div class="kpi">
            <div class="kpi-label">
              <mat-icon style="font-size:14px;width:14px;height:14px">check_circle</mat-icon>
              RECEBIDAS ESTE MÊS
            </div>
            <div class="kpi-value serif">{{ moedaCompact(totalRecebido) }}</div>
            <div class="kpi-foot">
              @if (totalMesAnterior > 0) {
                <span [class]="variacao >= 0 ? 'trend up' : 'trend down'">
                  {{ variacao >= 0 ? '↑' : '↓' }} {{ fmtPct(absPct(variacao)) }}%
                </span>
                <span>vs {{ mesAnteriorLabel }}</span>
              } @else {
                <span style="color:var(--text-4)">— sem dados anteriores</span>
              }
            </div>
          </div>

          <!-- KPI 3 – A receber -->
          <div class="kpi">
            <div class="kpi-label">
              <mat-icon style="font-size:14px;width:14px;height:14px">schedule</mat-icon>
              A RECEBER
            </div>
            <div class="kpi-value serif">{{ moedaCompact(totalAReceber) }}</div>
            <div class="kpi-foot">{{ moedaCompact(totalProx7Dias) }} · próximos 7 dias</div>
          </div>

          <!-- KPI 4 – Ticket médio -->
          <div class="kpi gold">
            <div class="kpi-label">
              <mat-icon style="font-size:14px;width:14px;height:14px">trending_up</mat-icon>
              TICKET MÉDIO / DIA
            </div>
            <div class="kpi-value serif">{{ moedaCompact(ticketMedioDia) }}</div>
            <div class="kpi-foot">média prevista de entrada diária</div>
          </div>

        </div>

        <!-- ── 2-column layout ──────────────────────────────── -->
        <div class="two-col" style="display:grid;grid-template-columns:1.4fr 1fr;gap:22px">

          <!-- ── Left: lista por dia ──────────────────────────── -->
          <div class="card" style="padding:22px">

            <div class="row receitas-header" style="margin-bottom:18px">
              <div>
                <h3 class="serif" style="margin:0;font-size:22px;font-weight:400">Receitas previstas</h3>
                <div style="font-size:12px;color:var(--text-3);margin-top:2px">
                  {{ countAReceber }} títulos · {{ gruposFuturos.length }} dias com entrada · vencimentos em {{ mesLabel }}
                </div>
              </div>
              <div class="field filter-date-range date-filter-resp">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--text-3)"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>
                <app-date-picker placeholder="De" [min]="_amanhaIso" [value]="dataInicio()" (valueChange)="setDataInicio($event)"/>
                <span style="color:var(--text-4);font-size:13px;flex-shrink:0">–</span>
                <app-date-picker placeholder="Até" [min]="_amanhaIso" [value]="dataFim()" (valueChange)="setDataFim($event)"/>
              </div>
            </div>

            <!-- Resumo do período -->
            @if (gruposFiltrados.length > 0) {
              <div style="margin-bottom:18px;padding:14px 16px;background:var(--surface-2);border-radius:12px">
                <div class="row" style="justify-content:space-between;font-size:12px;color:var(--text-3);margin-bottom:2px">
                  <span>TOTAL NO PERÍODO</span>
                  <span>MAIOR DIA</span>
                </div>
                <div class="row" style="justify-content:space-between;align-items:baseline">
                  <span class="serif resumo-valor" style="color:var(--bordo)">{{ moedaCompact(totalPeriodo) }}</span>
                  <span class="resumo-label" style="font-size:13px;font-weight:600;color:var(--text-2)">{{ maiorDiaLabel }}</span>
                </div>
              </div>
            }

            <!-- Linhas por dia -->
            <div>
              @for (grupo of gruposPagina; track grupo.data; let i = $index) {
                <div class="row gap-3"
                     style="padding:12px 0;align-items:center"
                     [style.border-top]="i > 0 ? '1px solid var(--line)' : 'none'">

                  <div style="width:44px;height:44px;border-radius:12px;background:var(--ok-soft);color:var(--ok);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:0 0 auto">
                    <span style="font-size:8px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;opacity:0.7">
                      {{ grupo.diaSemana }}
                    </span>
                    <span class="serif" style="font-size:18px;line-height:1">{{ grupo.diaNum }}</span>
                  </div>

                  <div style="flex:1;min-width:0">
                    <div style="font-size:14px;font-weight:600">
                      {{ grupo.diaNum }} de {{ grupo.mesAbrev }} · {{ grupo.count }} {{ grupo.count === 1 ? 'recebimento' : 'recebimentos' }}
                    </div>
                    <div style="font-size:11px;color:var(--text-3);margin-top:2px">previsto para essa data</div>
                  </div>

                  <div class="serif" style="font-size:18px;color:var(--ok);flex-shrink:0">{{ moeda(grupo.total) }}</div>
                </div>
              }

              @if (gruposFiltrados.length === 0) {
                <div style="text-align:center;padding:48px 32px;color:var(--text-4);font-size:14px">
                  @if (todos.length === 0) {
                    Nenhum dado importado. Use "Importar CSV" para carregar os recebimentos futuros.
                  } @else {
                    Nenhuma receita encontrada para este filtro.
                  }
                </div>
              }
            </div>

            <!-- Paginação -->
            @if (totalPaginas > 1) {
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)">
                <button class="btn ghost sm" type="button"
                        [disabled]="paginaAtual() === 0 || null"
                        (click)="pagAnterior()">
                  <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle">chevron_left</mat-icon>
                  Anterior
                </button>
                <span style="font-size:12px;color:var(--text-3)">
                  {{ paginaAtual() + 1 }} de {{ totalPaginas }}
                </span>
                <button class="btn ghost sm" type="button"
                        [disabled]="paginaAtual() === totalPaginas - 1 || null"
                        (click)="proxPagina()">
                  Próximo
                  <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle">chevron_right</mat-icon>
                </button>
              </div>
            }

          </div>

          <!-- ── Right: distribuição por dia ─────────────────── -->
          <div class="col gap-4">
            <div class="card" style="padding:22px">
              <h3 class="serif" style="margin:0;font-size:20px;font-weight:400">Por categoria</h3>
              <div style="font-size:12px;color:var(--text-3);margin-top:2px;margin-bottom:18px">
                de onde o dinheiro vem · {{ mesLabel }}
              </div>

              <!-- Donut SVG representando a distribuição temporal -->
              <div class="categoria-inner">
              <div class="donut-wrap" style="display:flex;justify-content:center;margin-bottom:20px">
                <div class="donut-outer" style="position:relative;width:160px;height:160px">
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    @if (donutSegments.length === 0) {
                      <circle cx="80" cy="80" r="56" fill="none" stroke="var(--line-2)" stroke-width="24"/>
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
                    <div class="serif" style="font-size:20px;line-height:1">{{ moedaCompact(totalAReceber) }}</div>
                    <div style="font-size:10px;color:var(--text-3);font-weight:600;letter-spacing:0.06em;text-transform:uppercase;margin-top:2px">A RECEBER</div>
                  </div>
                </div>
              </div>

              <!-- Top dias -->
              <div class="col gap-2 legend-list">
                @for (item of topDias; track item.data) {
                  <div class="row gap-3" style="align-items:center">
                    <span [style.background]="item.cor"
                          style="width:10px;height:10px;border-radius:3px;flex:0 0 auto"></span>
                    <span class="legend-item-label" style="font-size:12px;font-weight:500">
                      {{ item.diaNum }}/{{ item.mesAbrev }}
                    </span>
                    <span style="font-size:11px;color:var(--text-3);min-width:28px;text-align:right">
                      {{ fmtPct(item.pct) }}%
                    </span>
                    <span class="mono" style="font-size:12px;font-weight:600;min-width:72px;text-align:right">
                      {{ moedaCompact(item.total) }}
                    </span>
                  </div>
                }
                @if (topDias.length === 0) {
                  <div style="text-align:center;padding:16px;color:var(--text-4);font-size:13px">
                    Sem dados para o mês atual.
                  </div>
                }
              </div>
              </div><!-- /categoria-inner -->
            </div>

            <!-- Insight -->
            @if (totalAReceber > 0) {
              <div class="card" style="padding:18px">
                <div style="display:flex;gap:12px;align-items:flex-start">
                  <div style="width:36px;height:36px;border-radius:10px;background:var(--bordo);color:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
                    <mat-icon style="font-size:18px;width:18px;height:18px">bolt</mat-icon>
                  </div>
                  <div>
                    <div style="font-size:13px;font-weight:700;margin-bottom:4px">
                      {{ moedaCompact(totalProx7Dias) }} chegam nos próximos 7 dias
                    </div>
                    <div style="font-size:11px;color:var(--text-2);line-height:1.5">
                      {{ countProx7Dias }} parcelas agendadas para liquidação até {{ dataProx7Label }}.
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ── Títulos (expansível) ─────────────────────────── -->
        @if (showTitulos) {
          <div class="card" style="margin-top:22px">
            <div class="row" style="padding:16px 20px;border-bottom:1px solid var(--line);align-items:center">
              <h3 class="serif" style="margin:0;font-size:20px;font-weight:400;flex:1">Todos os recebimentos</h3>
              <button class="btn icon ghost" type="button" style="width:32px;height:32px" (click)="showTitulos = false">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="titulo-scroll">
            <table mat-table [dataSource]="dsTabela" matSort class="full-table">

              <ng-container matColumnDef="data_prevista">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Prev. pagamento</th>
                <td mat-cell *matCellDef="let r">{{ fmtData(r.data_prevista) }}</td>
              </ng-container>

              <ng-container matColumnDef="data_venda">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Data da venda</th>
                <td mat-cell *matCellDef="let r">{{ fmtData(r.data_venda) }}</td>
              </ng-container>

              <ng-container matColumnDef="valor_liquido">
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="num-header">Valor líquido</th>
                <td mat-cell *matCellDef="let r" class="num-cell">{{ moeda(r.valor_liquido) }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols;"></tr>
              <tr class="mat-row" *matNoDataRow>
                <td [attr.colspan]="cols.length" class="empty-state">Nenhum registro encontrado.</td>
              </tr>
            </table>
            </div><!-- /titulo-scroll -->
            <mat-paginator [pageSizeOptions]="[25, 50, 100]" showFirstLastButtons/>
          </div>
        }

      </div>
    }
  `,
  styles: [`
    .full-table  { width: 100%; }
    .num-header  { text-align: right !important; }
    .num-cell    { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .empty-state { text-align: center; padding: 48px 32px; color: var(--text-4); display: table-cell; }

    /* ── Layout helpers ── */
    .header-row      { align-items: flex-end; }
    .receitas-header { justify-content: space-between; align-items: flex-start; }
    .titulo-scroll   { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .titulo-scroll .full-table { min-width: 400px; }

    /* Impede que filhos de grid ultrapassem a célula */
    .two-col > *       { min-width: 0; }
    .kpi-grid-resp > * { min-width: 0; }

    /* Resumo do período */
    .resumo-valor { font-size: 22px; flex-shrink: 0; max-width: 55%; }
    .resumo-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Legenda do donut */
    .legend-item-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ── Tablet (≤ 768px) ── */
    @media (max-width: 768px) {
      .two-col         { grid-template-columns: 1fr !important; }
      .kpi-grid-resp   { grid-template-columns: 1fr 1fr !important; }
      .kpi-main        { grid-column: 1 / -1; }
      .header-row      { flex-direction: column; align-items: flex-start !important; gap: 12px; }
      .receitas-header { flex-direction: column; align-items: flex-start !important; gap: 10px; }
      .date-filter-resp { width: 100% !important; min-width: 0; }
    }

    /* ── Mobile (≤ 640px) ── */
    @media (max-width: 640px) {
      .outer-wrap   { padding: 20px 16px 40px !important; }
      .header-btns  { flex-wrap: wrap; gap: 6px; }
      .resumo-valor { font-size: 16px; }

      /* Donut + legenda lado a lado */
      .categoria-inner { display: flex; gap: 14px; align-items: flex-start; }
      .donut-wrap      { margin-bottom: 0 !important; flex: 0 0 auto; }
      .donut-outer     { width: 120px !important; height: 120px !important; }
      .donut-outer svg { width: 120px !important; height: 120px !important; }
      .legend-list     { flex: 1; min-width: 0; }
    }
  `],
})
export class ReceitasFuturasComponent implements OnInit {
  private svc        = inject(ReceitasService);
  private extratoSvc = inject(ExtratoService);
  private snack      = inject(MatSnackBar);
  private pageHeader = inject(PageHeaderService);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort)      sort?: MatSort;

  carregando  = signal(false);
  dataInicio  = signal('');
  dataFim     = signal('');
  paginaAtual = signal(0);
  showTitulos = false;

  private readonly PAGE_SIZE = 5;
  todos: RecebimentoCartao[] = [];
  extrato: LancamentoExtrato[] = [];

  dsTabela = new MatTableDataSource<RecebimentoCartao>([]);
  cols = ['data_prevista', 'data_venda', 'valor_liquido'];

  private readonly CIRCUMFERENCE = 2 * Math.PI * 56;

  // ── Paleta cíclica para o donut de dias ──────────────────
  private readonly _CORES = [
    '#7A1F2B', '#A07A3F', '#3F7AA0', '#2F7A4F',
    '#82622F', '#A03548', '#967333', '#5A1620',
  ];

  // ── Datas ────────────────────────────────────────────────
  private get _hoje(): Date { return new Date(); }

  private get _hojeIso(): string {
    const d = this._hoje;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  get _amanhaIso(): string {
    const d = new Date(this._hoje);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  private get _mesPrefixo(): string {
    const d = this._hoje;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  private get _mesPrefixoAnterior(): string {
    const d = this._hoje;
    const mes = d.getMonth();
    if (mes === 0) return `${d.getFullYear()-1}-12`;
    return `${d.getFullYear()}-${String(mes).padStart(2,'0')}`;
  }

  get mesLabel(): string {
    return this._hoje.toLocaleDateString('pt-BR', { month: 'long', year: '2-digit' });
  }

  get mesAbrev(): string {
    return MESES_ABREV[this._hoje.getMonth()].toUpperCase();
  }

  get mesAnteriorLabel(): string {
    const prev = new Date(this._hoje.getFullYear(), this._hoje.getMonth()-1, 1);
    return prev.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.','');
  }

  get dataProx7Label(): string {
    const d = new Date(this._hoje);
    d.setDate(d.getDate()+7);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  // ── KPI derivados ────────────────────────────────────────
  private get _registrosMes(): RecebimentoCartao[] {
    return this.todos.filter(r => r.data_prevista.startsWith(this._mesPrefixo));
  }

  get totalRecebido(): number {
    const pref = this._mesPrefixo;
    return this.extrato
      .filter(e => e.natureza === 'entrada' && e.data_lancamento.startsWith(pref))
      .reduce((s, e) => s + e.valor, 0);
  }

  get totalAReceber(): number {
    return this._registrosMes
      .filter(r => r.data_prevista > this._hojeIso)
      .reduce((s, r) => s + r.valor_liquido, 0);
  }

  get totalMes(): number       { return this.totalRecebido + this.totalAReceber; }
  get pctRecebido(): number    { return this.totalMes > 0 ? (this.totalRecebido / this.totalMes) * 100 : 0; }
  get countAReceber(): number  { return this._registrosMes.filter(r => r.data_prevista > this._hojeIso).length; }

  get ticketMedioDia(): number {
    const d = this._hoje;
    const days = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    return days > 0 ? this.totalMes/days : 0;
  }

  private get _em7Iso(): string {
    const d = new Date(this._hoje);
    d.setDate(d.getDate()+7);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  get totalProx7Dias(): number {
    const hoje = this._hojeIso, em7 = this._em7Iso;
    return this._registrosMes
      .filter(r => r.data_prevista > hoje && r.data_prevista <= em7)
      .reduce((s,r) => s+r.valor_liquido, 0);
  }

  get countProx7Dias(): number {
    const hoje = this._hojeIso, em7 = this._em7Iso;
    return this._registrosMes.filter(r => r.data_prevista > hoje && r.data_prevista <= em7).length;
  }

  get totalMesAnterior(): number {
    const pref = this._mesPrefixoAnterior;
    return this.extrato
      .filter(e => e.natureza === 'entrada' && e.data_lancamento.startsWith(pref))
      .reduce((s, e) => s + e.valor, 0);
  }

  get variacao(): number {
    return this.totalMesAnterior > 0
      ? ((this.totalMes - this.totalMesAnterior) / this.totalMesAnterior)*100
      : 0;
  }

  absPct(v: number): number { return Math.abs(v); }

  // ── Grupos por dia ───────────────────────────────────────
  private _agrupar(registros: RecebimentoCartao[]): GrupoDia[] {
    const map = new Map<string, number>();
    for (const r of registros) map.set(r.data_prevista, (map.get(r.data_prevista) ?? 0) + 1);

    const totMap = new Map<string, number>();
    for (const r of registros) totMap.set(r.data_prevista, (totMap.get(r.data_prevista) ?? 0) + r.valor_liquido);

    return Array.from(totMap.keys())
      .sort()
      .map(data => {
        const d = new Date(data + 'T12:00:00');
        return {
          data,
          diaSemana: DIAS_SEMANA[d.getDay()],
          diaNum:    d.getDate(),
          mesAbrev:  MESES_ABREV[d.getMonth()],
          count:     map.get(data) ?? 0,
          total:     totMap.get(data) ?? 0,
        };
      });
  }

  get gruposFuturos(): GrupoDia[] {
    return this._agrupar(this.todos.filter(r => r.data_prevista > this._hojeIso));
  }

  get gruposFiltrados(): GrupoDia[] {
    const ini   = this.dataInicio();
    const fim   = this.dataFim();
    const amanhã = this._amanhaIso;
    const registros = this.todos.filter(r => {
      const ini_ = ini || amanhã;
      if (r.data_prevista < ini_) return false;
      if (fim && r.data_prevista > fim) return false;
      return true;
    });
    return this._agrupar(registros);
  }

  get gruposPagina(): GrupoDia[] {
    const start = this.paginaAtual() * this.PAGE_SIZE;
    return this.gruposFiltrados.slice(start, start + this.PAGE_SIZE);
  }

  get totalPaginas(): number {
    return Math.ceil(this.gruposFiltrados.length / this.PAGE_SIZE);
  }

  proxPagina()  { if (this.paginaAtual() < this.totalPaginas - 1) this.paginaAtual.update(p => p + 1); }
  pagAnterior() { if (this.paginaAtual() > 0) this.paginaAtual.update(p => p - 1); }

  setDataInicio(v: string) { this.dataInicio.set(v); this.paginaAtual.set(0); }
  setDataFim(v: string)    { this.dataFim.set(v);    this.paginaAtual.set(0); }

  get totalPeriodo(): number { return this.gruposFiltrados.reduce((s,g) => s+g.total, 0); }

  get maiorDiaLabel(): string {
    if (!this.gruposFiltrados.length) return '—';
    const maior = this.gruposFiltrados.reduce((mx,g) => g.total > mx.total ? g : mx);
    return `${maior.diaNum}/${maior.mesAbrev} · ${this.moedaCompact(maior.total)}`;
  }

  // ── Donut por dia (top 7 + "outros") ─────────────────────
  get topDias(): { data: string; diaNum: number; mesAbrev: string; total: number; cor: string; pct: number }[] {
    const grupos = this.gruposFiltrados;
    const totalGeral = grupos.reduce((s,g) => s+g.total, 0);
    const sorted = [...grupos].sort((a,b) => b.total - a.total).slice(0, 7);
    return sorted.map((g, i) => ({
      data:    g.data,
      diaNum:  g.diaNum,
      mesAbrev: g.mesAbrev,
      total:   g.total,
      cor:     this._CORES[i % this._CORES.length],
      pct:     totalGeral > 0 ? (g.total/totalGeral)*100 : 0,
    }));
  }

  get donutSegments(): { cor: string; dashArray: string; dashOffset: string }[] {
    let cum = 0;
    return this.topDias.map(d => {
      const dash = (d.pct/100) * this.CIRCUMFERENCE;
      const seg  = {
        cor:        d.cor,
        dashArray:  `${dash} ${this.CIRCUMFERENCE}`,
        dashOffset: `${-(cum/100) * this.CIRCUMFERENCE}`,
      };
      cum += d.pct;
      return seg;
    });
  }

  // ── Formatação ───────────────────────────────────────────
  moeda(v: number): string {
    return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  moedaCompact(v: number): string {
    return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  }

  fmtPct(v: number): string { return Math.round(v).toString(); }

  fmtData(d: string | null): string {
    if (!d) return '';
    const [a,m,dia] = d.split('-');
    return `${dia}/${m}/${a}`;
  }

  // ── Ações ────────────────────────────────────────────────
  async ngOnInit() {
    this.pageHeader.setSubtitle(`O que a loja vai receber nos próximos dias · ${this.mesLabel}`);
    await this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      [this.todos, this.extrato] = await Promise.all([
        this.svc.listar(),
        this.extratoSvc.listarTodos(),
      ]);
      this.dsTabela.data = this.todos;
    } catch {
      this.snack.open('Erro ao carregar dados.', 'OK', { duration: 4000 });
    } finally {
      this.carregando.set(false);
    }
  }

  toggleTitulos() {
    this.showTitulos = !this.showTitulos;
    if (this.showTitulos) {
      setTimeout(() => {
        if (this.paginator) this.dsTabela.paginator = this.paginator;
        if (this.sort)      this.dsTabela.sort      = this.sort;
      });
    }
  }

  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.carregando.set(true);
    try {
      const registros = this.svc.parseCsv(await file.text());
      if (!registros.length) {
        this.snack.open('Nenhum registro válido encontrado no CSV.', 'OK', { duration: 4000 });
        return;
      }
      const inseridos = await this.svc.importar(registros);
      this.snack.open(`${inseridos} registros importados.`, 'OK', { duration: 5000 });
      await this.carregar();
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Erro ao importar CSV.', 'OK', { duration: 5000 });
    } finally {
      this.carregando.set(false);
      input.value = '';
    }
  }

  exportarCsv() {
    const rows = [
      ['Data prevista', 'Data da venda', 'Valor líquido'],
      ...this.todos.map(r => [
        this.fmtData(r.data_prevista),
        this.fmtData(r.data_venda),
        String(r.valor_liquido).replace('.', ','),
      ]),
    ];
    const blob = new Blob(['﻿' + rows.map(r => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `recebimentos_${this._mesPrefixo}.csv` });
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
