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
import { DespesasService, TituloDespesa, TituloPedidoMes } from '../../services/despesas.service';
import { DespesaRecorrente, LABELS_CATEGORIA, CategoriaDespesa } from '../../models/despesa.model';
import { TemplateDespesaDialogComponent } from './template-despesa-dialog.component';
import { GerarMesDialogComponent } from './gerar-mes-dialog.component';

const PEDIDOS_COR = '#2A7A8C';

interface ItemAVencer {
  id: string;
  label: string;
  subLabel: string;
  dia: number;
  valor: number;
  tipo: 'fixa' | 'pedido';
  fixa?: DespesaRecorrente;
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
        <div class="row header-row" style="align-items:flex-end;justify-content:space-between;margin-bottom:22px">
          <div>
            <h1 class="page">Despesas</h1>
            <div class="page-sub">O que a loja gasta todo mês para abrir as portas · {{ mesLabel }}</div>
          </div>
          <div class="row gap-2 header-actions">
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
        <div class="kpi-grid">

          <!-- KPIs bordô empilhados: custo fixo + custo de pedidos -->
          <div class="col kpi-stack kpi-main-stack">

            <div class="kpi bordo kpi-half" style="padding:16px 18px">
              <div class="kpi-label">
                <mat-icon style="font-size:14px;width:14px;height:14px">account_balance_wallet</mat-icon>
                CUSTO FIXO MENSAL
              </div>
              <div class="serif" style="font-size:30px;line-height:1.05;margin-top:4px">
                {{ moedaCompact(totalFixo) }}
              </div>
              <div style="font-size:11px;opacity:0.78;margin-top:4px;line-height:1.4">
                Custo fixo da loja por mês.<br>
                <b style="opacity:1">{{ moedaCompact(breakEvenDia) }}/dia</b> de operação.
              </div>
              <div style="margin-top:10px;padding:6px 10px;border-radius:10px;background:rgba(255,255,255,0.10);display:flex;align-items:center;gap:10px">
                <div style="height:5px;flex:1;background:rgba(255,255,255,0.20);border-radius:999px;overflow:hidden">
                  <div [style.width.%]="pctPago" style="height:100%;background:var(--gold);border-radius:999px;transition:width 0.4s ease"></div>
                </div>
                <span style="font-size:11px;font-weight:700;color:var(--gold);white-space:nowrap">{{ fmtPct(pctPago) }}% pago</span>
              </div>
            </div>

            <div class="kpi bordo kpi-half" style="padding:16px 18px">
              <div class="kpi-label">
                <mat-icon style="font-size:14px;width:14px;height:14px">receipt_long</mat-icon>
                CUSTO DE PEDIDOS DO MÊS
              </div>
              <div class="serif" style="font-size:30px;line-height:1.05;margin-top:4px">
                {{ moedaCompact(totalPedidosFixo) }}
              </div>
              <div style="font-size:11px;opacity:0.78;margin-top:4px;line-height:1.4">
                Total dos títulos de pedidos do mês.<br>
                <b style="opacity:1">{{ paidPedidosCount }} de {{ titulosPedidos().length }}</b> títulos pagos.
              </div>
              <div style="margin-top:10px;padding:6px 10px;border-radius:10px;background:rgba(255,255,255,0.10);display:flex;align-items:center;gap:10px">
                <div style="height:5px;flex:1;background:rgba(255,255,255,0.20);border-radius:999px;overflow:hidden">
                  <div [style.width.%]="pctPedidosPago" style="height:100%;background:var(--gold);border-radius:999px;transition:width 0.4s ease"></div>
                </div>
                <span style="font-size:11px;font-weight:700;color:var(--gold);white-space:nowrap">{{ fmtPct(pctPedidosPago) }}% pago</span>
              </div>
            </div>

          </div>

          <!-- KPI 2×2: fixas pagas / pedidos pagos / fixas a vencer / pedidos a vencer -->
          <div class="col kpi-stack">

            <!-- linha superior: fixas -->
            <div class="kpi-row-pair">
              <div class="kpi kpi-half">
                <div class="kpi-label">
                  <mat-icon style="font-size:14px;width:14px;height:14px">check_circle</mat-icon>
                  FIXAS PAGAS ESTE MÊS
                </div>
                <div class="kpi-value serif">{{ moedaCompact(totalPago) }}</div>
                <div class="kpi-foot">{{ paidCount }} de {{ templatesAtivos.length }} categorias</div>
              </div>

              <div class="kpi kpi-half">
                <div class="kpi-label">
                  <mat-icon style="font-size:14px;width:14px;height:14px">schedule</mat-icon>
                  FIXAS A VENCER
                </div>
                <div class="kpi-value serif" style="color:var(--bad)">{{ moedaCompact(totalDevido) }}</div>
                <div class="kpi-foot">{{ dueCount }} categorias pendentes</div>
              </div>
            </div>

            <!-- linha inferior: pedidos -->
            <div class="kpi-row-pair">
              <div class="kpi kpi-half">
                <div class="kpi-label">
                  <mat-icon style="font-size:14px;width:14px;height:14px">check_circle</mat-icon>
                  PEDIDOS PAGOS ESTE MÊS
                </div>
                <div class="kpi-value serif">{{ moedaCompact(totalPedidosPago) }}</div>
                <div class="kpi-foot">{{ paidPedidosCount }} de {{ titulosPedidos().length }} títulos</div>
              </div>

              <div class="kpi kpi-half">
                <div class="kpi-label">
                  <mat-icon style="font-size:14px;width:14px;height:14px">schedule</mat-icon>
                  PEDIDOS A VENCER
                </div>
                <div class="kpi-value serif" style="color:var(--bad)">{{ moedaCompact(totalPedidosDevido) }}</div>
                <div class="kpi-foot">{{ duePedidosCount }} títulos pendentes</div>
              </div>
            </div>

          </div>

          <!-- KPI Break-even empilhado: fixo + pedidos -->
          <div class="col kpi-stack">

            <div class="kpi gold kpi-half">
              <div class="kpi-label">
                <mat-icon style="font-size:14px;width:14px;height:14px">bolt</mat-icon>
                BREAK-EVEN / DIA
              </div>
              <div class="kpi-value serif">{{ moedaCompact(breakEvenDia) }}</div>
              <div class="kpi-foot">meta diária · custos fixos</div>
            </div>

            <div class="kpi gold kpi-half">
              <div class="kpi-label">
                <mat-icon style="font-size:14px;width:14px;height:14px">bolt</mat-icon>
                BREAK-EVEN PEDIDOS / DIA
              </div>
              <div class="kpi-value serif">{{ moedaCompact(breakEvenPedidosDia) }}</div>
              <div class="kpi-foot">meta diária · custos de pedidos</div>
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

          <!-- Por categoria -->
          <div class="card" style="padding:22px">
            <h3 class="serif" style="margin:0;font-size:20px;font-weight:400">Por categoria</h3>
            <div style="font-size:12px;color:var(--text-3);margin-top:2px;margin-bottom:18px">
              onde o dinheiro vai · {{ mesLabel }}
            </div>

            <!-- Donut SVG -->
            <div style="display:flex;justify-content:center;margin-bottom:20px">
              <div class="donut-wrap" style="position:relative;width:160px;height:160px">
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
                  <div class="serif" style="font-size:20px;line-height:1">{{ moedaCompact(totalGeralDespesas) }}</div>
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
                      @if (t.data_pagamento) {
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
                  Próximas a vencer
                </h3>

                <div class="col gap-3">
                  @for (item of itensAvencerPaginados; track item.id; let i = $index) {
                    <div class="row gap-3"
                         style="align-items:center;padding:8px 0"
                         [style.border-top]="i > 0 ? '1px dashed var(--line)' : 'none'">

                      <!-- badge de data -->
                      <div style="width:44px;height:44px;border-radius:12px;background:var(--warn-soft);color:var(--warn);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:0 0 auto">
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
                      {{ moedaCompact(totalDevidoGeral) }} vencem nos próximos dias
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
    :host { display: block; }

    /* ── Layout base ─────────────────────────────────────── */
    .page-wrap  { padding: 28px 32px 48px; max-width: 1600px; }
    .kpi-grid      { display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 14px; margin-bottom: 22px; }
    .main-grid     { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
    .kpi-stack     { display: flex; flex-direction: column; gap: 14px; }
    .kpi-main-stack { display: flex; flex-direction: column; gap: 14px; }
    .kpi-row-pair  { display: flex; gap: 14px; flex: 1; }
    .kpi-half      { flex: 1; min-width: 0; }

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
      .page-wrap { padding: 14px 14px 28px; }

      /* Header: empilha título e botões */
      .header-row {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 10px;
        margin-bottom: 16px !important;
      }
      .header-row h1.page { font-size: 22px !important; }

      /* Oculta botões secundários; mantém só Nova Despesa */
      .header-actions .btn.ghost,
      .header-actions .btn.outline { display: none !important; }

      /* KPIs: bloco bordô ocupa linha inteira, demais em 2 colunas */
      .kpi-grid { grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
      .kpi-main-stack { grid-column: 1 / -1; flex-direction: row; }
      .kpi-stack    { gap: 10px; }
      .kpi-row-pair { gap: 10px; }

      /* KPI principal: reduz fonte do valor */
      .kpi-main .serif[style*="font-size:44px"] { font-size: 32px !important; }

      /* Layout principal: coluna única */
      .main-grid { grid-template-columns: 1fr; gap: 14px; }

      /* Donut: reduz tamanho no mobile */
      .donut-wrap { width: 130px !important; height: 130px !important; }
      .donut-wrap svg { width: 130px !important; height: 130px !important; }

      /* Segmented control menor */
      .seg button { padding: 4px 8px !important; font-size: 11px !important; }

      /* Rodapé da lista */
      .main-grid .serif[style*="font-size:26px"] { font-size: 20px !important; }
    }
  `],
})
export class ListaDespesasComponent implements OnInit {
  private svc    = inject(DespesasService);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort)      sort?: MatSort;

  carregando         = signal(false);
  filtroLista        = signal<'todas' | 'a_vencer' | 'pagas'>('todas');
  filtroListaPedidos = signal<'todas' | 'a_vencer' | 'pagas'>('todas');
  paginaFixas        = signal(0);
  paginaPedidos      = signal(0);
  paginaAvencer      = signal(0);
  readonly PAGE_FIXAS   = 5;
  readonly PAGE_PEDIDOS = 6;
  readonly PAGE_AVENCER = 5;
  showTitulos        = false;
  titulosPedidos     = signal<TituloPedidoMes[]>([]);

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
  get breakEvenDia(): number        { return this.totalFixo / 30; }
  get breakEvenPedidosDia(): number { return this.totalPedidosFixo / 30; }

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

  get totalGeralDespesas(): number { return this.totalFixo + this.totalPedidosFixo; }
  get totalDevidoGeral(): number   { return this.totalDevido + this.totalPedidosDevido; }

  get itensAVencer(): ItemAVencer[] {
    const fixas: ItemAVencer[] = this.templatesAVencer.map(t => ({
      id: t.id, label: t.descricao, subLabel: `vence dia ${t.dia_venc}`,
      dia: t.dia_venc, valor: t.valor_estimado, tipo: 'fixa', fixa: t,
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

  get categoriasData(): { label: string; valor: number; cor: string; pct: number }[] {
    const groups = new Map<string, { valor: number; cor: string }>();
    for (const t of this.templatesAtivos) {
      const label = t.categoria ? LABELS_CATEGORIA[t.categoria] : 'Outro';
      const cor   = t.categoria ? CAT_COR[t.categoria] : '#967333';
      const prev  = groups.get(label);
      groups.set(label, { valor: (prev?.valor ?? 0) + t.valor_estimado, cor });
    }
    if (this.totalPedidosFixo > 0) {
      groups.set('Pedidos', { valor: this.totalPedidosFixo, cor: PEDIDOS_COR });
    }
    const total = this.totalGeralDespesas;
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
      const now = this._now;
      const [templates, titulos, titulosPedidos] = await Promise.all([
        this.svc.listarTemplates(),
        this.svc.listarTitulosDespesa(),
        this.svc.listarTitulosPedidosMes(now.getFullYear(), now.getMonth() + 1),
      ]);
      this.dsTemplates.data = templates;
      this.dsTitulos.data   = titulos;
      this.titulosPedidos.set(titulosPedidos);
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
