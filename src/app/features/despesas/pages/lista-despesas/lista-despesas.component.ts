import { Component, OnInit, ViewChild, inject, signal, effect } from '@angular/core';
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
import { DespesasService, TituloDespesa, TituloPedidoMes, TituloRoyaltiesMes } from '../../services/despesas.service';
import { DespesaRecorrente, CategoriaDespesa } from '../../models/despesa.model';
import { TemplateDespesaDialogComponent } from './template-despesa-dialog.component';
import { GerarMesDialogComponent } from './gerar-mes-dialog.component';
import { PageHeaderService } from '../../../../core/services/page-header.service';

interface ItemAVencer {
  id: string;
  label: string;
  subLabel: string;
  dia: number;
  valor: number;
  tipo: 'fixa' | 'pedido';
  fixa?: DespesaRecorrente;
  atrasado: boolean;
}

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
      <div class="page-wrap">

        <!-- ── Header ────────────────────────────────────────── -->
        <div class="row header-row list-page-heading" style="align-items:flex-end;justify-content:space-between;margin-bottom:22px">
          <div class="header-title">
            <h1 class="page">Despesas <em style="color:var(--bordo);font-style:italic">mensais</em></h1>
            <div class="page-sub">O que a loja gasta todo mês para abrir as portas · {{ mesLabel }}</div>
          </div>
          <div class="row gap-2 header-actions">
            <div class="row gap-1 mes-nav">
              <button class="btn icon ghost pag-btn" type="button" (click)="mesAnterior()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span class="mes-nav-label">{{ mesLabel }}</span>
              <button class="btn icon ghost pag-btn" type="button" (click)="proximoMes()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              @if (!isMesAtual) {
                <button class="btn ghost sm" type="button" style="font-size:11px;padding:2px 8px;height:24px"
                        (click)="irParaHoje()">
                  Hoje
                </button>
              }
            </div>
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

        <!-- ── Break-even diário ─────────────────────────────── -->
        <div class="be-bar">
          <div class="be-icon">
            <mat-icon style="font-size:20px;width:20px;height:20px">track_changes</mat-icon>
          </div>
          <div class="be-main">
            <div class="be-label">BREAK-EVEN DIÁRIO</div>
            <div class="serif be-value">{{ moedaCompact(breakEvenGeralDia) }}</div>
          </div>
          <div class="be-progress">
            <div class="be-track">
              <div class="be-fill" [style.width.%]="pctPagoGeral"></div>
            </div>
          </div>
          <div class="be-total">
            <div class="be-total-pct">{{ fmtPct(pctPagoGeral) }}% pago</div>
            <div class="serif be-total-value">{{ moedaCompact(totalPrevistoGeral) }}</div>
            <div class="be-total-label">total previsto no mês</div>
          </div>
        </div>

        <!-- ── KPI cards: Fixas / Pedidos / Royalties+FPP ────── -->
        <div class="kpi3-grid">

          <div class="card kpi3-card">
            <div class="kpi3-head">
              <div class="kpi3-icon"><mat-icon style="font-size:18px;width:18px;height:18px">home</mat-icon></div>
              <div>
                <div class="kpi3-title">Despesas Fixas</div>
                <div class="kpi3-sub">{{ templatesFixasPuras.length }} contas · mensal</div>
              </div>
            </div>
            <div class="serif kpi3-value">{{ moeda(totalFixoPuro) }}</div>
            <div class="kpi3-bar">
              <div class="kpi3-seg ok" [style.width.%]="pctFixoPuroPago"></div>
              <div class="kpi3-seg gold" [style.width.%]="100 - pctFixoPuroPago"></div>
            </div>
            <div class="kpi3-legend">
              <span><i class="dot ok"></i>Pago <b>{{ moeda(totalFixoPuroPago) }}</b></span>
              <span><i class="dot gold"></i>Pendente <b>{{ moeda(totalFixoPuroDevido) }}</b></span>
            </div>
          </div>

          <div class="card kpi3-card">
            <div class="kpi3-head">
              <div class="kpi3-icon"><mat-icon style="font-size:18px;width:18px;height:18px">description</mat-icon></div>
              <div>
                <div class="kpi3-title">Pedidos</div>
                <div class="kpi3-sub">{{ titulosPedidos().length }} notas · fornecedores</div>
              </div>
            </div>
            <div class="serif kpi3-value">{{ moeda(totalPedidosFixo) }}</div>
            <div class="kpi3-bar">
              <div class="kpi3-seg ok" [style.width.%]="pctPedidosPago"></div>
              <div class="kpi3-seg gold" [style.width.%]="100 - pctPedidosPago"></div>
            </div>
            <div class="kpi3-legend">
              <span><i class="dot ok"></i>Pago <b>{{ moeda(totalPedidosPago) }}</b></span>
              <span><i class="dot gold"></i>Pendente <b>{{ moeda(totalPedidosDevido) }}</b></span>
            </div>
          </div>

          <div class="card kpi3-card">
            <div class="kpi3-head">
              <div class="kpi3-icon"><mat-icon style="font-size:18px;width:18px;height:18px">copyright</mat-icon></div>
              <div>
                <div class="kpi3-title">Royalties + FPP</div>
                <div class="kpi3-sub">quinzenal · franquia</div>
              </div>
            </div>
            <div class="serif kpi3-value">{{ moeda(totalRoyalties) }}</div>
            <div class="kpi3-bar">
              <div class="kpi3-seg ok" [style.width.%]="pctRoyaltiesPago"></div>
              <div class="kpi3-seg gold" [style.width.%]="100 - pctRoyaltiesPago"></div>
            </div>
            <div class="kpi3-legend">
              <span><i class="dot ok"></i>Pago <b>{{ moeda(totalRoyaltiesPago) }}</b></span>
              <span><i class="dot gold"></i>Pendente <b>{{ moeda(totalRoyaltiesDevido) }}</b></span>
            </div>
          </div>

        </div>

        <!-- ── 2-column layout ───────────────────────────────── -->
        <div class="main-grid">

          <!-- ── Left: lista de despesas + por categoria ────────── -->
          <div class="col gap-4">
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
                            (click)="filtroLista.set(opt.value); paginaFixas.set(0)">{{ opt.label }}</button>
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
              @for (t of templatesPaginados; track t.id; let i = $index) {
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
                      @if (statusFixa(t) === 'pago') {
                        <span class="pill ok" style="font-size:10px;padding:2px 8px">
                          <mat-icon style="font-size:10px;width:10px;height:10px">check</mat-icon> pago
                        </span>
                      } @else if (statusFixa(t) === 'atrasado') {
                        <span class="pill bad" style="font-size:10px;padding:2px 8px">
                          <mat-icon style="font-size:10px;width:10px;height:10px">warning</mat-icon> atrasado
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

            <!-- paginação -->
            @if (totalPaginasFixas > 1) {
              <div class="pag-bar">
                <button class="btn icon ghost pag-btn" type="button"
                        [disabled]="paginaFixas() === 0"
                        (click)="paginaFixas.set(paginaFixas() - 1)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span class="pag-info">{{ paginaFixas() + 1 }} / {{ totalPaginasFixas }}</span>
                <button class="btn icon ghost pag-btn" type="button"
                        [disabled]="paginaFixas() >= totalPaginasFixas - 1"
                        (click)="paginaFixas.set(paginaFixas() + 1)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            }

            <!-- rodapé total -->
            <div class="row" style="margin-top:14px;padding-top:14px;border-top:2px solid var(--bordo-tint)">
              <div style="flex:1;font-size:13px;color:var(--text-2);font-weight:600">Total mensal recorrente</div>
              <div class="serif" style="font-size:26px;color:var(--bordo)">{{ moeda(totalFixo) }}</div>
            </div>
          </div>

          <!-- Royalties e FPP -->
          <div class="card" style="padding:22px">

            <!-- cabeçalho -->
            <div class="row" style="justify-content:space-between;margin-bottom:18px;align-items:flex-start">
              <div>
                <h3 class="serif" style="margin:0;font-size:22px;font-weight:400">Royalties e FPP</h3>
                <div style="font-size:12px;color:var(--text-3);margin-top:2px">
                  {{ paidRoyaltiesCount }} pagos · {{ dueRoyaltiesCount }} a vencer · vencimentos em {{ mesLabel }}
                </div>
              </div>
              <div class="seg">
                @for (opt of filtroOpts; track opt.value) {
                  <button [class.on]="filtroListaRoyalties() === opt.value"
                          (click)="filtroListaRoyalties.set(opt.value); paginaRoyalties.set(0)">{{ opt.label }}</button>
                }
              </div>
            </div>

            <!-- barra de progresso -->
            <div style="margin-bottom:22px;padding:14px 16px;background:var(--surface-2);border-radius:12px">
              <div class="row" style="justify-content:space-between;font-size:12px;margin-bottom:8px">
                <span style="color:var(--text-3)">Progresso do mês</span>
                <span style="font-weight:700">
                  <span style="color:var(--ok)">{{ moedaCompact(totalRoyaltiesPago) }}</span>
                  <span style="color:var(--text-3)"> de {{ moedaCompact(totalRoyalties) }}</span>
                </span>
              </div>
              <div style="height:8px;background:var(--line-2);border-radius:999px;overflow:hidden;position:relative">
                <div [style.width.%]="pctRoyaltiesPago"
                     style="position:absolute;inset:0;background:linear-gradient(90deg,var(--bordo) 0%,var(--bordo-2) 100%);border-radius:999px;transition:width 0.4s ease"></div>
              </div>
              <div class="row" style="justify-content:space-between;margin-top:6px;font-size:11px;color:var(--text-3)">
                <span>{{ fmtPct(pctRoyaltiesPago) }}% liquidado</span>
                <span style="color:var(--bad);font-weight:600">faltam {{ moedaCompact(totalRoyaltiesDevido) }}</span>
              </div>
            </div>

            <!-- linhas de título de royalties/fpp -->
            <div>
              @for (t of titulosRoyaltiesPaginados; track t.id; let i = $index) {
                <div class="row gap-3"
                     style="padding:12px 0;align-items:center"
                     [style.border-top]="i > 0 ? '1px solid var(--line)' : 'none'">

                  <!-- ícone -->
                  <div style="width:40px;height:40px;border-radius:11px;background:var(--surface-2);color:var(--text-3);display:flex;align-items:center;justify-content:center;flex:0 0 auto">
                    <mat-icon style="font-size:18px;width:18px;height:18px">copyright</mat-icon>
                  </div>

                  <!-- info -->
                  <div style="flex:1;min-width:0">
                    <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      {{ t.descricao ?? t.codigo }}
                    </div>
                    <div style="font-size:11px;color:var(--text-3);margin-top:2px">
                      vence {{ data(t.data_vencimento) }} · {{ labelRoyalty(t.categoria) }}
                    </div>
                  </div>

                  <!-- valor e status -->
                  <div style="text-align:right;flex-shrink:0">
                    <div class="serif" style="font-size:16px;line-height:1.1">{{ moeda(t.valor) }}</div>
                    <div style="margin-top:5px">
                      @if (statusTitulo(t) === 'pago') {
                        <span class="pill ok" style="font-size:10px;padding:2px 8px">
                          <mat-icon style="font-size:10px;width:10px;height:10px">check</mat-icon> pago
                        </span>
                      } @else if (statusTitulo(t) === 'atrasado') {
                        <span class="pill bad" style="font-size:10px;padding:2px 8px">
                          <mat-icon style="font-size:10px;width:10px;height:10px">warning</mat-icon> atrasado
                        </span>
                      } @else {
                        <span class="pill warn" style="font-size:10px;padding:2px 8px">
                          <mat-icon style="font-size:10px;width:10px;height:10px">schedule</mat-icon> a vencer
                        </span>
                      }
                    </div>
                  </div>
                </div>
              }

              @if (titulosRoyaltiesFiltrados.length === 0) {
                <div style="text-align:center;padding:32px;color:var(--text-4);font-size:14px">
                  Nenhum pagamento encontrado.
                </div>
              }
            </div>

            <!-- paginação royalties -->
            @if (totalPaginasRoyalties > 1) {
              <div class="pag-bar">
                <button class="btn icon ghost pag-btn" type="button"
                        [disabled]="paginaRoyalties() === 0"
                        (click)="paginaRoyalties.set(paginaRoyalties() - 1)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span class="pag-info">{{ paginaRoyalties() + 1 }} / {{ totalPaginasRoyalties }}</span>
                <button class="btn icon ghost pag-btn" type="button"
                        [disabled]="paginaRoyalties() >= totalPaginasRoyalties - 1"
                        (click)="paginaRoyalties.set(paginaRoyalties() + 1)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            }

            <!-- rodapé total -->
            <div class="row" style="margin-top:14px;padding-top:14px;border-top:2px solid var(--bordo-tint)">
              <div style="flex:1;font-size:13px;color:var(--text-2);font-weight:600">Total de royalties e FPP no mês</div>
              <div class="serif" style="font-size:26px;color:var(--bordo)">{{ moeda(totalRoyalties) }}</div>
            </div>
          </div>

          </div><!-- fim col left -->

          <!-- ── Right: pagamentos de pedidos + próximas a vencer ── -->
          <div class="col gap-4">
          <div class="card" style="padding:22px">

            <!-- cabeçalho -->
            <div class="row" style="justify-content:space-between;margin-bottom:18px;align-items:flex-start">
              <div>
                <h3 class="serif" style="margin:0;font-size:22px;font-weight:400">Pagamentos de pedidos</h3>
                <div style="font-size:12px;color:var(--text-3);margin-top:2px">
                  {{ paidPedidosCount }} pagos · {{ duePedidosCount }} a vencer · vencimentos em {{ mesLabel }}
                </div>
              </div>
              <div class="seg">
                @for (opt of filtroOpts; track opt.value) {
                  <button [class.on]="filtroListaPedidos() === opt.value"
                          (click)="filtroListaPedidos.set(opt.value); paginaPedidos.set(0)">{{ opt.label }}</button>
                }
              </div>
            </div>

            <!-- barra de progresso -->
            <div style="margin-bottom:22px;padding:14px 16px;background:var(--surface-2);border-radius:12px">
              <div class="row" style="justify-content:space-between;font-size:12px;margin-bottom:8px">
                <span style="color:var(--text-3)">Progresso do mês</span>
                <span style="font-weight:700">
                  <span style="color:var(--ok)">{{ moedaCompact(totalPedidosPago) }}</span>
                  <span style="color:var(--text-3)"> de {{ moedaCompact(totalPedidosFixo) }}</span>
                </span>
              </div>
              <div style="height:8px;background:var(--line-2);border-radius:999px;overflow:hidden;position:relative">
                <div [style.width.%]="pctPedidosPago"
                     style="position:absolute;inset:0;background:linear-gradient(90deg,var(--bordo) 0%,var(--bordo-2) 100%);border-radius:999px;transition:width 0.4s ease"></div>
              </div>
              <div class="row" style="justify-content:space-between;margin-top:6px;font-size:11px;color:var(--text-3)">
                <span>{{ fmtPct(pctPedidosPago) }}% liquidado</span>
                <span style="color:var(--bad);font-weight:600">faltam {{ moedaCompact(totalPedidosDevido) }}</span>
              </div>
            </div>

            <!-- linhas de título de pedido -->
            <div>
              @for (t of titulosPedidosPaginados; track t.id; let i = $index) {
                <div class="row gap-3"
                     style="padding:12px 0;align-items:center"
                     [style.border-top]="i > 0 ? '1px solid var(--line)' : 'none'">

                  <!-- ícone -->
                  <div style="width:40px;height:40px;border-radius:11px;background:var(--surface-2);color:var(--text-3);display:flex;align-items:center;justify-content:center;flex:0 0 auto">
                    <mat-icon style="font-size:18px;width:18px;height:18px">receipt_long</mat-icon>
                  </div>

                  <!-- info -->
                  <div style="flex:1;min-width:0">
                    <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      {{ t.pedido?.fornecedor?.nome ?? t.pedido?.codigo ?? t.codigo }}
                    </div>
                    <div style="font-size:11px;color:var(--text-3);margin-top:2px">
                      vence {{ data(t.data_vencimento) }} · {{ t.pedido?.codigo ?? t.codigo }}
                    </div>
                  </div>

                  <!-- valor e status -->
                  <div style="text-align:right;flex-shrink:0">
                    <div class="serif" style="font-size:16px;line-height:1.1">{{ moeda(t.valor) }}</div>
                    <div style="margin-top:5px">
                      @if (statusTitulo(t) === 'pago') {
                        <span class="pill ok" style="font-size:10px;padding:2px 8px">
                          <mat-icon style="font-size:10px;width:10px;height:10px">check</mat-icon> pago
                        </span>
                      } @else if (statusTitulo(t) === 'atrasado') {
                        <span class="pill bad" style="font-size:10px;padding:2px 8px">
                          <mat-icon style="font-size:10px;width:10px;height:10px">warning</mat-icon> atrasado
                        </span>
                      } @else {
                        <span class="pill warn" style="font-size:10px;padding:2px 8px">
                          <mat-icon style="font-size:10px;width:10px;height:10px">schedule</mat-icon> a vencer
                        </span>
                      }
                    </div>
                  </div>
                </div>
              }

              @if (titulosPedidosFiltrados.length === 0) {
                <div style="text-align:center;padding:32px;color:var(--text-4);font-size:14px">
                  Nenhum pagamento encontrado.
                </div>
              }
            </div>

            <!-- paginação pedidos -->
            @if (totalPaginasPedidos > 1) {
              <div class="pag-bar">
                <button class="btn icon ghost pag-btn" type="button"
                        [disabled]="paginaPedidos() === 0"
                        (click)="paginaPedidos.set(paginaPedidos() - 1)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span class="pag-info">{{ paginaPedidos() + 1 }} / {{ totalPaginasPedidos }}</span>
                <button class="btn icon ghost pag-btn" type="button"
                        [disabled]="paginaPedidos() >= totalPaginasPedidos - 1"
                        (click)="paginaPedidos.set(paginaPedidos() + 1)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            }

            <!-- rodapé total -->
            <div class="row" style="margin-top:14px;padding-top:14px;border-top:2px solid var(--bordo-tint)">
              <div style="flex:1;font-size:13px;color:var(--text-2);font-weight:600">Total de pedidos no mês</div>
              <div class="serif" style="font-size:26px;color:var(--bordo)">{{ moeda(totalPedidosFixo) }}</div>
            </div>
          </div>

            <!-- Próximas a vencer -->
            @if (itensAVencer.length > 0) {
              <div class="card" style="padding:22px">
                <h3 class="serif" style="margin:0;font-size:20px;font-weight:400;margin-bottom:14px">
                  Vencidas e a vencer
                </h3>

                <div class="col gap-3">
                  @for (item of itensAvencerPaginados; track item.id; let i = $index) {
                    <div class="row gap-3"
                         style="align-items:center;padding:8px 0"
                         [style.border-top]="i > 0 ? '1px dashed var(--line)' : 'none'">

                      <!-- badge de data -->
                      <div [style.background]="item.atrasado ? 'var(--bad-soft)' : 'var(--warn-soft)'"
                           [style.color]="item.atrasado ? 'var(--bad)' : 'var(--warn)'"
                           style="width:44px;height:44px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:0 0 auto">
                        <span style="font-size:8px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;opacity:0.7">
                          {{ mesAbrev }}
                        </span>
                        <span class="serif" style="font-size:18px;line-height:1">{{ item.dia }}</span>
                      </div>

                      <div style="flex:1;min-width:0">
                        <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                          {{ item.label }}
                        </div>
                      </div>

                      <div style="text-align:right;flex-shrink:0">
                        <div class="serif" style="font-size:16px">{{ moeda(item.valor) }}</div>
                      </div>
                    </div>
                  }
                </div>

                <!-- paginação -->
                @if (totalPaginasAvencer > 1) {
                  <div class="pag-bar">
                    <button class="btn icon ghost pag-btn" type="button"
                            [disabled]="paginaAvencer() === 0"
                            (click)="paginaAvencer.set(paginaAvencer() - 1)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <span class="pag-info">{{ paginaAvencer() + 1 }} / {{ totalPaginasAvencer }}</span>
                    <button class="btn icon ghost pag-btn" type="button"
                            [disabled]="paginaAvencer() >= totalPaginasAvencer - 1"
                            (click)="paginaAvencer.set(paginaAvencer() + 1)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  </div>
                }

                <!-- insight -->
                <div style="margin-top:16px;padding:14px;border-radius:12px;background:linear-gradient(135deg,var(--gold-soft) 0%,var(--bordo-tint) 100%);display:flex;gap:12px;align-items:flex-start">
                  <div style="width:32px;height:32px;border-radius:10px;background:var(--bordo);color:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
                    <mat-icon style="font-size:16px;width:16px;height:16px">bolt</mat-icon>
                  </div>
                  <div>
                    <div style="font-size:12px;font-weight:700;margin-bottom:2px">
                      {{ moedaCompact(totalVencendo7Dias) }} vencem nos próximos 7 dias
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
                  <span class="pill"
                        [class.ok]="statusTitulo(t) === 'pago'"
                        [class.bad]="statusTitulo(t) === 'atrasado'"
                        [class.warn]="statusTitulo(t) === 'a_vencer'">
                    {{ statusTitulo(t) === 'pago' ? 'Pago' : statusTitulo(t) === 'atrasado' ? 'Atrasado' : 'Pendente' }}
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
    :host { display: block; overflow-x: clip; }

    /* ── Layout base ─────────────────────────────────────── */
    .page-wrap  { padding: 28px 32px 48px; max-width: 1600px; box-sizing: border-box; width: 100%; }
    .main-grid     { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 22px; }

    /* ── Break-even bar ───────────────────────────────────── */
    .be-bar        { display: flex; align-items: center; gap: 24px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 16px; padding: 18px 24px; margin-bottom: 18px; }
    .be-icon       { width: 44px; height: 44px; border-radius: 50%; background: var(--gold-tint); color: var(--gold-2); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
    .be-main       { flex: 0 0 auto; }
    .be-label      { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: var(--text-3); }
    .be-value      { font-size: 28px; line-height: 1.1; margin-top: 2px; }
    .be-progress   { flex: 1; min-width: 0; }
    .be-track      { height: 10px; background: var(--line-2); border-radius: 999px; overflow: hidden; }
    .be-fill       { height: 100%; background: linear-gradient(90deg, var(--bordo) 0%, var(--bordo-2) 100%); border-radius: 999px; transition: width 0.4s ease; }
    .be-total      { text-align: right; flex: 0 0 auto; }
    .be-total-pct  { font-size: 11px; font-weight: 700; color: var(--text-3); margin-bottom: 2px; }
    .be-total-value { font-size: 22px; line-height: 1.1; }
    .be-total-label { font-size: 11px; color: var(--text-3); margin-top: 2px; }

    /* ── KPI cards (Fixas / Pedidos / Royalties+FPP) ──────── */
    .kpi3-grid     { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 22px; }
    .kpi3-card     { padding: 20px 22px; min-width: 0; }
    .kpi3-head     { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .kpi3-icon     { width: 38px; height: 38px; border-radius: 11px; background: var(--gold-tint); color: var(--gold-2); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
    .kpi3-title    { font-size: 14px; font-weight: 600; }
    .kpi3-sub      { font-size: 11px; color: var(--text-3); margin-top: 1px; }
    .kpi3-value    { font-size: 28px; line-height: 1.1; margin-bottom: 12px; }
    .kpi3-bar      { height: 7px; border-radius: 999px; overflow: hidden; display: flex; background: var(--line-2); margin-bottom: 10px; }
    .kpi3-seg.ok   { background: var(--ok); }
    .kpi3-seg.gold { background: var(--gold-2); }
    .kpi3-legend   { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-3); }
    .kpi3-legend b { color: var(--text); font-weight: 700; }
    .kpi3-legend .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; margin-right: 5px; }
    .kpi3-legend .dot.ok   { background: var(--ok); }
    .kpi3-legend .dot.gold { background: var(--gold-2); }

    /* ── Nav de mês ─────────────────────────────────────── */
    .mes-nav       { align-items: center; background: var(--surface-2); border-radius: 10px; padding: 3px 6px; gap: 4px; }
    .mes-nav-label { font-size: 13px; font-weight: 600; min-width: 80px; text-align: center; text-transform: capitalize; }

    /* ── Paginação ──────────────────────────────────────── */
    .pag-bar  { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 0 4px; }
    .pag-btn  { width: 28px; height: 28px; border-radius: 8px; }
    .pag-info { font-size: 12px; color: var(--text-3); min-width: 40px; text-align: center; font-variant-numeric: tabular-nums; }

    /* ── Tabela de títulos ───────────────────────────────── */
    .full-table  { width: 100%; }
    .num-header  { text-align: right !important; }
    .num-cell    { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .mono-cell   { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-3); }
    .empty-state { text-align: center; padding: 48px 32px; color: var(--text-4); display: table-cell; }
    .menu-danger { color: var(--bad) !important; }
    .menu-danger mat-icon { color: var(--bad) !important; }

    /* ── Responsividade mobile ───────────────────────────── */
    @media (max-width: 680px) {
      .page-wrap { padding: 12px 14px 80px; }

      /* Header: título em cima, ações embaixo */
      .header-row {
        flex-direction: column;
        align-items: flex-start !important;
        gap: 8px;
        margin-bottom: 14px !important;
      }
      .header-title { width: 100%; }
      .header-title h1.page { font-size: 20px !important; text-align: left !important; }
      .header-title .page-sub { text-align: left !important; }
      .page-sub { font-size: 11px !important; }

      /* Ações: ocupa largura toda; oculta botões secundários (filhos diretos ghost/outline) */
      .header-actions { width: 100%; justify-content: space-between; flex-wrap: wrap; }
      .header-actions > .btn.ghost,
      .header-actions > .btn.outline { display: none !important; }
      .mes-nav-label { min-width: 60px !important; font-size: 12px; }

      /* Break-even bar: empilha em coluna no mobile */
      .be-bar         { flex-wrap: wrap; gap: 12px; padding: 14px 16px; margin-bottom: 10px; }
      .be-progress    { order: 3; flex-basis: 100%; }
      .be-total       { text-align: left; }

      /* KPI cards: coluna única — minmax(0) evita overflow do conteúdo */
      .kpi3-grid      { grid-template-columns: minmax(0,1fr); gap: 10px; margin-bottom: 14px; }

      /* Layout principal: coluna única */
      .main-grid { grid-template-columns: minmax(0,1fr); gap: 14px; }

      /* Cards da lista: limita largura */
      .card { overflow: hidden; }

      /* Segmented control compacto */
      .seg button { padding: 4px 8px !important; font-size: 11px !important; }

      /* Rodapé totais */
      .main-grid .serif[style*="font-size:26px"] { font-size: 18px !important; }
    }
  `],
})
export class ListaDespesasComponent implements OnInit {
  private svc    = inject(DespesasService);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);
  private pageHeader = inject(PageHeaderService);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort)      sort?: MatSort;

  constructor() {
    effect(() => {
      this.refAno();
      this.refMes();
      this.pageHeader.setSubtitle(`O que a loja gasta todo mês para abrir as portas · ${this.mesLabel}`);
    });
  }

  carregando         = signal(false);
  filtroLista          = signal<'todas' | 'a_vencer' | 'pagas'>('todas');
  filtroListaPedidos   = signal<'todas' | 'a_vencer' | 'pagas'>('todas');
  filtroListaRoyalties = signal<'todas' | 'a_vencer' | 'pagas'>('todas');
  paginaFixas        = signal(0);
  paginaPedidos      = signal(0);
  paginaRoyalties    = signal(0);
  paginaAvencer      = signal(0);
  readonly PAGE_FIXAS     = 5;
  readonly PAGE_PEDIDOS   = 6;
  readonly PAGE_ROYALTIES = 6;
  readonly PAGE_AVENCER   = 5;
  showTitulos        = false;
  titulosPedidos     = signal<TituloPedidoMes[]>([]);
  titulosRoyalties   = signal<TituloRoyaltiesMes[]>([]);
  refAno             = signal(new Date().getFullYear());
  refMes             = signal(new Date().getMonth() + 1);
  private readonly _hoje = new Date();

  dsTemplates = new MatTableDataSource<DespesaRecorrente>([]);
  dsTitulos   = new MatTableDataSource<TituloDespesa>([]);

  colsTitulos = ['data_vencimento', 'codigo', 'descricao', 'fornecedor', 'valor', 'status', 'data_pagamento'];

  readonly filtroOpts = [
    { value: 'todas'    as const, label: 'Todas'    },
    { value: 'a_vencer' as const, label: 'A vencer' },
    { value: 'pagas'    as const, label: 'Pagas'    },
  ];

  // ── Mês ─────────────────────────────────────────────────────
  private get _now() { return new Date(this.refAno(), this.refMes() - 1, 1); }

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

  private tituloDoTemplate(tpl: DespesaRecorrente): TituloDespesa | undefined {
    return this.titulosMes.find(t => t.despesa_recorrente_id === tpl.id);
  }

  statusFixa(tpl: DespesaRecorrente): 'pago' | 'a_vencer' | 'atrasado' {
    const titulo = this.tituloDoTemplate(tpl);
    if (titulo?.data_pagamento) return 'pago';
    const vencimento = titulo?.data_vencimento
      ? new Date(titulo.data_vencimento + 'T00:00:00')
      : new Date(this.refAno(), this.refMes() - 1, tpl.dia_venc);
    return vencimento < this._inicioHoje ? 'atrasado' : 'a_vencer';
  }

  statusTitulo(t: { data_pagamento: string | null; data_vencimento: string | null }): 'pago' | 'a_vencer' | 'atrasado' {
    if (t.data_pagamento) return 'pago';
    if (!t.data_vencimento) return 'a_vencer';
    return new Date(t.data_vencimento + 'T00:00:00') < this._inicioHoje ? 'atrasado' : 'a_vencer';
  }

  private get _inicioHoje(): Date {
    const h = this._hoje;
    return new Date(h.getFullYear(), h.getMonth(), h.getDate());
  }

  get paidCount(): number   { return this.templatesAtivos.filter(t =>  this.isPago(t)).length; }
  get dueCount(): number    { return this.templatesAtivos.filter(t => !this.isPago(t)).length; }
  get totalFixo(): number   { return this.templatesAtivos.reduce((s, t) => s + t.valor_estimado, 0); }
  get totalPago(): number   { return this.templatesAtivos.filter(t => this.isPago(t)).reduce((s, t) => s + t.valor_estimado, 0); }
  get totalDevido(): number { return this.totalFixo - this.totalPago; }
  get pctPago(): number     { return this.totalFixo > 0 ? (this.totalPago / this.totalFixo) * 100 : 0; }

  private isRoyaltyCat(t: DespesaRecorrente): boolean {
    return t.categoria === 'royalties' || t.categoria === 'fpp';
  }

  get templatesFixasPuras(): DespesaRecorrente[] { return this.templatesAtivos.filter(t => !this.isRoyaltyCat(t)); }

  get totalFixoPuro(): number       { return this.templatesFixasPuras.reduce((s, t) => s + t.valor_estimado, 0); }
  get totalFixoPuroPago(): number   { return this.templatesFixasPuras.filter(t => this.isPago(t)).reduce((s, t) => s + t.valor_estimado, 0); }
  get totalFixoPuroDevido(): number { return this.totalFixoPuro - this.totalFixoPuroPago; }
  get pctFixoPuroPago(): number     { return this.totalFixoPuro > 0 ? (this.totalFixoPuroPago / this.totalFixoPuro) * 100 : 0; }

  get totalRoyalties(): number       { return this.titulosRoyalties().reduce((s, t) => s + t.valor, 0); }
  get totalRoyaltiesPago(): number   { return this.titulosRoyalties().filter(t => !!t.data_pagamento).reduce((s, t) => s + t.valor, 0); }
  get totalRoyaltiesDevido(): number { return this.totalRoyalties - this.totalRoyaltiesPago; }
  get pctRoyaltiesPago(): number     { return this.totalRoyalties > 0 ? (this.totalRoyaltiesPago / this.totalRoyalties) * 100 : 0; }

  get totalPrevistoGeral(): number { return this.totalFixoPuro + this.totalPedidosFixo + this.totalRoyalties; }
  get totalPagoGeral(): number     { return this.totalFixoPuroPago + this.totalPedidosPago + this.totalRoyaltiesPago; }
  get pctPagoGeral(): number       { return this.totalPrevistoGeral > 0 ? (this.totalPagoGeral / this.totalPrevistoGeral) * 100 : 0; }
  get breakEvenGeralDia(): number  { return this.totalPrevistoGeral / 30; }

  get templatesFiltrados(): DespesaRecorrente[] {
    const f = this.filtroLista();
    if (f === 'a_vencer') return this.templatesAtivos.filter(t => !this.isPago(t));
    if (f === 'pagas')    return this.templatesAtivos.filter(t =>  this.isPago(t));
    return this.templatesAtivos;
  }

  get totalPaginasFixas(): number {
    return Math.ceil(this.templatesFiltrados.length / this.PAGE_FIXAS);
  }

  get templatesPaginados(): DespesaRecorrente[] {
    const inicio = this.paginaFixas() * this.PAGE_FIXAS;
    return this.templatesFiltrados.slice(inicio, inicio + this.PAGE_FIXAS);
  }

  get titulosPedidosFiltrados(): TituloPedidoMes[] {
    const f = this.filtroListaPedidos();
    if (f === 'a_vencer') return this.titulosPedidos().filter(t => !t.data_pagamento);
    if (f === 'pagas')    return this.titulosPedidos().filter(t => !!t.data_pagamento);
    return this.titulosPedidos();
  }

  get totalPaginasPedidos(): number {
    return Math.ceil(this.titulosPedidosFiltrados.length / this.PAGE_PEDIDOS);
  }

  get titulosPedidosPaginados(): TituloPedidoMes[] {
    const inicio = this.paginaPedidos() * this.PAGE_PEDIDOS;
    return this.titulosPedidosFiltrados.slice(inicio, inicio + this.PAGE_PEDIDOS);
  }

  get totalPedidosFixo(): number    { return this.titulosPedidos().reduce((s, t) => s + t.valor, 0); }
  get totalPedidosPago(): number    { return this.titulosPedidos().filter(t => !!t.data_pagamento).reduce((s, t) => s + t.valor, 0); }
  get totalPedidosDevido(): number  { return this.totalPedidosFixo - this.totalPedidosPago; }
  get pctPedidosPago(): number      { return this.totalPedidosFixo > 0 ? (this.totalPedidosPago / this.totalPedidosFixo) * 100 : 0; }
  get paidPedidosCount(): number    { return this.titulosPedidos().filter(t => !!t.data_pagamento).length; }
  get duePedidosCount(): number     { return this.titulosPedidos().filter(t => !t.data_pagamento).length; }

  get titulosRoyaltiesFiltrados(): TituloRoyaltiesMes[] {
    const f = this.filtroListaRoyalties();
    if (f === 'a_vencer') return this.titulosRoyalties().filter(t => !t.data_pagamento);
    if (f === 'pagas')    return this.titulosRoyalties().filter(t => !!t.data_pagamento);
    return this.titulosRoyalties();
  }

  get totalPaginasRoyalties(): number {
    return Math.ceil(this.titulosRoyaltiesFiltrados.length / this.PAGE_ROYALTIES);
  }

  get titulosRoyaltiesPaginados(): TituloRoyaltiesMes[] {
    const inicio = this.paginaRoyalties() * this.PAGE_ROYALTIES;
    return this.titulosRoyaltiesFiltrados.slice(inicio, inicio + this.PAGE_ROYALTIES);
  }

  get paidRoyaltiesCount(): number { return this.titulosRoyalties().filter(t => !!t.data_pagamento).length; }
  get dueRoyaltiesCount(): number  { return this.titulosRoyalties().filter(t => !t.data_pagamento).length; }

  labelRoyalty(cat: string | null): string {
    return cat === 'fpp' ? 'FPP' : cat === 'royalties' ? 'Royalties' : '—';
  }

  get totalVencendo7Dias(): number {
    const hoje     = this._hoje;
    const hojeOnly = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const em7      = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 7);
    return this.itensAVencer.reduce((soma, item) => {
      const dataItem = new Date(hoje.getFullYear(), hoje.getMonth(), item.dia);
      return (dataItem >= hojeOnly && dataItem <= em7) ? soma + item.valor : soma;
    }, 0);
  }

  get itensAVencer(): ItemAVencer[] {
    const fixas: ItemAVencer[] = this.templatesAVencer.map(t => ({
      id: t.id, label: t.descricao, subLabel: `vence dia ${t.dia_venc}`,
      dia: t.dia_venc, valor: t.valor_estimado, tipo: 'fixa', fixa: t,
      atrasado: this.statusFixa(t) === 'atrasado',
    }));
    const pedidos: ItemAVencer[] = this.titulosPedidos()
      .filter(t => !t.data_pagamento)
      .map(t => {
        const dia = t.data_vencimento ? parseInt(t.data_vencimento.split('-')[2], 10) : 99;
        return {
          id: t.id,
          label: t.pedido?.fornecedor?.nome ?? t.pedido?.codigo ?? t.codigo,
          subLabel: `vence dia ${dia} · pedido`,
          dia, valor: t.valor, tipo: 'pedido' as const,
          atrasado: this.statusTitulo(t) === 'atrasado',
        };
      });
    return [...fixas, ...pedidos].sort((a, b) => a.dia - b.dia);
  }

  get totalPaginasAvencer(): number {
    return Math.ceil(this.itensAVencer.length / this.PAGE_AVENCER);
  }

  get itensAvencerPaginados(): ItemAVencer[] {
    const inicio = this.paginaAvencer() * this.PAGE_AVENCER;
    return this.itensAVencer.slice(inicio, inicio + this.PAGE_AVENCER);
  }

  get templatesAVencer(): DespesaRecorrente[] {
    return this.templatesAtivos.filter(t => !this.isPago(t));
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

  get isMesAtual(): boolean {
    const h = this._hoje;
    return this.refAno() === h.getFullYear() && this.refMes() === h.getMonth() + 1;
  }

  mesAnterior() {
    if (this.refMes() === 1) { this.refMes.set(12); this.refAno.set(this.refAno() - 1); }
    else { this.refMes.set(this.refMes() - 1); }
    this.paginaFixas.set(0); this.paginaPedidos.set(0); this.paginaRoyalties.set(0); this.paginaAvencer.set(0);
    this.carregar();
  }

  proximoMes() {
    if (this.refMes() === 12) { this.refMes.set(1); this.refAno.set(this.refAno() + 1); }
    else { this.refMes.set(this.refMes() + 1); }
    this.paginaFixas.set(0); this.paginaPedidos.set(0); this.paginaRoyalties.set(0); this.paginaAvencer.set(0);
    this.carregar();
  }

  irParaHoje() {
    this.refAno.set(this._hoje.getFullYear());
    this.refMes.set(this._hoje.getMonth() + 1);
    this.paginaFixas.set(0); this.paginaPedidos.set(0); this.paginaRoyalties.set(0); this.paginaAvencer.set(0);
    this.carregar();
  }

  // ── Ações ───────────────────────────────────────────────────
  async ngOnInit() { await this.carregar(); }

  async carregar() {
    this.carregando.set(true);
    try {
      const [templates, titulos, titulosPedidos, titulosRoyalties] = await Promise.all([
        this.svc.listarTemplates(),
        this.svc.listarTitulosDespesa(),
        this.svc.listarTitulosPedidosMes(this.refAno(), this.refMes()),
        this.svc.listarTitulosRoyaltiesMes(this.refAno(), this.refMes()),
      ]);
      this.dsTemplates.data = templates;
      this.dsTitulos.data   = titulos;
      this.titulosPedidos.set(titulosPedidos);
      this.titulosRoyalties.set(titulosRoyalties);
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
