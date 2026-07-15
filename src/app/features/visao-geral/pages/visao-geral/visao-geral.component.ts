import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../../core/services/auth.service';
import { PageHeaderService } from '../../../../core/services/page-header.service';
import { DatePickerComponent } from '../../../../shared/components/date-picker.component';
import { VisaoGeralService } from '../../services/visao-geral.service';
import { AlertaItem, BucketFluxo, CapitalGiro, DespesasPorTipo, ItemDespesaTipo } from '../../models/visao-geral.model';

type TipoDespesaChave = 'fixas' | 'pedidos' | 'royaltiesFpp';

const ML = 50, MR = 16, MT = 30, MB = 28, CW = 920, CH = 240;

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

@Component({
  selector: 'app-visao-geral',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, DatePickerComponent],
  template: `
    <div class="page-wrapper">

      @if (tooltip(); as tt) {
        <div class="vg-tooltip" [style.left.px]="tt.x" [style.top.px]="tt.y">{{ tt.text }}</div>
      }

      <!-- ── Header ─────────────────────────────────────────── -->
      <div class="vg-header list-page-heading">
        <div>
          <h1 class="page">Olá, <span class="accent serif">{{ primeiroNome() }}</span></h1>
          <div class="page-sub">{{ dataHojeLabel }} · resumo para planejar o desembolso</div>
        </div>
        <div class="vg-period field">
          <mat-icon style="font-size:15px;width:15px;height:15px;color:var(--text-3)">event</mat-icon>
          <app-date-picker placeholder="De" [value]="inicio()" (valueChange)="onInicioChange($event)" />
          <span class="date-sep">–</span>
          <app-date-picker placeholder="Até" align="right" [value]="fim()" [min]="inicio()" (valueChange)="onFimChange($event)" />
        </div>
      </div>

      @if (carregando()) {
        <div style="display:flex;justify-content:center;padding:80px">
          <mat-spinner diameter="40"/>
        </div>
      } @else {

        <div class="vg-grid">

          <!-- ── Coluna esquerda: gráficos ───────────────────── -->
          <div class="vg-col-main">

            <!-- Entradas x Saídas -->
            <div class="card" style="padding:20px 22px">
              <div class="vg-card-head">
                <h3 class="serif" style="margin:0;font-size:19px;font-weight:400">Entradas × Saídas</h3>
                <div class="vg-legend">
                  <span><span class="dot-legend" style="background:#4A8C6A"></span>Entradas</span>
                  <span><span class="dot-legend" style="background:#7A1F2B"></span>Saídas</span>
                </div>
              </div>

              <svg [attr.viewBox]="'0 0 ' + CW + ' ' + CH" style="width:100%;display:block;overflow:visible;margin-top:8px">
                @for (tick of yTicks(); track $index) {
                  <line [attr.x1]="ML" [attr.y1]="yS(tick)" [attr.x2]="ML + chartW" [attr.y2]="yS(tick)"
                        stroke="var(--line)" stroke-width="1" stroke-dasharray="4 4"/>
                  <text [attr.x]="ML - 8" [attr.y]="yS(tick) + 4" text-anchor="end" font-size="10" fill="var(--text-3)">{{ kFmt(tick) }}</text>
                }
                <line [attr.x1]="ML" [attr.y1]="yS(0)" [attr.x2]="ML + chartW" [attr.y2]="yS(0)" stroke="var(--line-2)" stroke-width="1.5"/>

                @for (b of buckets(); track $index; let i = $index) {
                  <rect [attr.x]="barX(i, 'e')" [attr.y]="yS(b.entradas)" [attr.width]="barW()" [attr.height]="barH(b.entradas)"
                        fill="#4A8C6A" rx="3" ry="3" style="cursor:pointer"
                        (mouseenter)="showTooltip($event, moeda(b.entradas))"
                        (mousemove)="moveTooltip($event)"
                        (mouseleave)="hideTooltip()"/>
                  <rect [attr.x]="barX(i, 's')" [attr.y]="yS(b.saidas)" [attr.width]="barW()" [attr.height]="barH(b.saidas)"
                        fill="#7A1F2B" rx="3" ry="3" style="cursor:pointer"
                        (mouseenter)="showTooltip($event, moeda(b.saidas))"
                        (mousemove)="moveTooltip($event)"
                        (mouseleave)="hideTooltip()"/>
                  @if (b.entradas > 0) {
                    <text [attr.x]="barX(i, 'e') + barW() / 2" [attr.y]="yS(b.entradas) - 6"
                          text-anchor="middle" font-size="9" font-weight="700" fill="#4A8C6A">{{ kFmt(b.entradas) }}</text>
                  }
                  @if (b.saidas > 0) {
                    <text [attr.x]="barX(i, 's') + barW() / 2" [attr.y]="yS(b.saidas) - 6"
                          text-anchor="middle" font-size="9" font-weight="700" fill="#7A1F2B">{{ kFmt(b.saidas) }}</text>
                  }
                  <text [attr.x]="barCenter(i)" [attr.y]="yS(0) + 18" text-anchor="middle" font-size="10" fill="var(--text-2)">{{ b.label }}</text>
                }
              </svg>

              <div class="vg-total-row">
                <span>Total previsto no período</span>
                <span>
                  <b style="color:#4A8C6A">{{ moeda(totalEntradas()) }}</b>
                  ·
                  <b style="color:#7A1F2B">{{ moeda(totalSaidas()) }}</b>
                  · saldo
                  <b [style.color]="totalSaidas() > totalEntradas() ? 'var(--bad)' : 'var(--ok)'">{{ moeda(totalEntradas() - totalSaidas()) }}</b>
                </span>
              </div>
            </div>

            <!-- Saldo projetado -->
            <div class="card" style="padding:20px 22px">
              <h3 class="serif" style="margin:0 0 8px;font-size:19px;font-weight:400">Saldo projetado</h3>
              <div style="font-size:12px;color:var(--text-3);margin:-4px 0 8px">saldo inicial + entradas − saídas</div>

              <svg [attr.viewBox]="'0 0 ' + CW + ' ' + CH" style="width:100%;display:block;overflow:visible">
                @for (tick of yTicksSaldo(); track $index) {
                  <line [attr.x1]="ML" [attr.y1]="yS2(tick)" [attr.x2]="ML + chartW" [attr.y2]="yS2(tick)"
                        stroke="var(--line)" stroke-width="1" stroke-dasharray="4 4"/>
                  <text [attr.x]="ML - 8" [attr.y]="yS2(tick) + 4" text-anchor="end" font-size="10" fill="var(--text-3)">{{ kFmt(tick) }}</text>
                }
                <polyline [attr.points]="saldoPts()" fill="none" stroke="var(--gold)" stroke-width="2.5"
                          stroke-linejoin="round" stroke-linecap="round"/>
                @for (b of buckets(); track $index; let i = $index) {
                  <circle [attr.cx]="barCenter(i)" [attr.cy]="yS2(b.saldo)" r="3.5" fill="white" stroke="var(--gold)" stroke-width="2"/>
                  <circle [attr.cx]="barCenter(i)" [attr.cy]="yS2(b.saldo)" r="10" fill="transparent" style="cursor:pointer"
                          (mouseenter)="showTooltip($event, moeda(b.saldo))"
                          (mousemove)="moveTooltip($event)"
                          (mouseleave)="hideTooltip()"/>
                  <text [attr.x]="barCenter(i)" [attr.y]="yS2(b.saldo) - 10"
                        text-anchor="middle" font-size="9" font-weight="700" fill="var(--gold-2)">{{ kFmt(b.saldo) }}</text>
                  <text [attr.x]="barCenter(i)" [attr.y]="yS2(minSaldo()) + 26" text-anchor="middle" font-size="10" fill="var(--text-2)">{{ b.label }}</text>
                }
              </svg>
            </div>

          </div>

          <!-- ── Coluna direita ───────────────────────────────── -->
          <div class="vg-col-side">

            <!-- Capital de giro -->
            <div class="card vg-capital">
              <div class="kpi-label">CAPITAL DE GIRO</div>
              <div class="serif" style="font-size:34px;line-height:1.1;margin-top:6px">{{ moeda(capitalGiro()?.saldoCaixa ?? 0) }}</div>
              <div style="font-size:12px;color:var(--text-3);margin-top:2px">saldo em caixa hoje</div>

              <div class="vg-progress-track">
                <div class="vg-progress-fill" [style.width.%]="progressoReserva()"></div>
              </div>
              <div class="vg-progress-labels">
                <span><b class="serif" style="font-size:15px">{{ mesesReservaLabel() }}</b> meses de reserva</span>
                <span>ideal 3+</span>
              </div>
              <div class="pill" [class]="reservaPillClass()" style="margin-top:12px;width:100%;justify-content:flex-start">
                {{ reservaStatusLabel() }} — cobre {{ mesesReservaLabel() }}x o custo fixo mensal
              </div>
            </div>

            <!-- Despesas previstas por tipo -->
            <div class="card" style="padding:20px 22px">
              <div class="kpi-label" style="margin-bottom:12px">DESPESAS PENDENTES - MÊS ATUAL</div>

              @for (tipo of tiposDespesa; track tipo.chave) {
                <button type="button" class="vg-tipo-row vg-tipo-btn" (click)="toggleTipo(tipo.chave)">
                  <span class="dot-legend" [style.background]="tipo.cor"></span>
                  <span class="vg-tipo-label">{{ tipo.label }}</span>
                  <span class="vg-tipo-valor">{{ moeda(valorTipo(tipo.chave)) }}</span>
                  <mat-icon class="vg-tipo-chevron" [class.open]="tipoExpandido() === tipo.chave"
                            style="font-size:18px;width:18px;height:18px">chevron_right</mat-icon>
                </button>
                @if (tipoExpandido() === tipo.chave) {
                  <div class="vg-tipo-itens">
                    @if (itensTipo(tipo.chave).length === 0) {
                      <div class="vg-tipo-item-vazio">Nenhuma despesa prevista neste tipo.</div>
                    } @else {
                      @for (item of itensTipo(tipo.chave); track item.id) {
                        <div class="vg-tipo-item">
                          <span class="vg-tipo-item-data">{{ fmtData(item.dataVencimento) }}</span>
                          <span class="vg-tipo-item-desc">{{ item.descricao }}</span>
                          <span class="vg-tipo-item-valor">{{ moeda(item.valor) }}</span>
                        </div>
                      }
                    }
                  </div>
                }
              }
            </div>

          </div>
        </div>

        <!-- ── Alertas e pendências ───────────────────────────── -->
        <div class="vg-alertas-head">
          <h3 class="serif" style="margin:0;font-size:20px;font-weight:400">Alertas e pendências</h3>
          <span style="font-size:12px;color:var(--text-3)">{{ alertas().length }} {{ alertas().length === 1 ? 'item' : 'itens' }}</span>
        </div>

        @if (alertas().length === 0) {
          <div class="card" style="padding:28px;text-align:center;color:var(--text-3);font-size:13px">
            Nenhum alerta no momento.
          </div>
        } @else {
          <div class="col gap-3">
            @for (a of alertas(); track a.id) {
              <div class="card vg-alerta-item">
                <div class="vg-alerta-icon" [class]="a.urgencia">
                  <mat-icon style="font-size:18px;width:18px;height:18px">{{ iconePara(a.tipo) }}</mat-icon>
                </div>
                <div class="vg-alerta-texto">
                  <div class="vg-alerta-titulo">{{ a.titulo }}</div>
                  <div class="vg-alerta-sub">{{ a.subtitulo }}</div>
                </div>
                <div class="vg-alerta-valor">{{ moeda(a.valor) }}</div>
                <span class="pill" [class]="a.urgencia === 'urgente' ? 'bad' : 'warn'">
                  {{ a.urgencia === 'urgente' ? 'URGENTE' : 'EM BREVE' }}
                </span>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 28px 32px 48px; max-width: 1600px; }

    .vg-tooltip {
      position: fixed; z-index: 500; pointer-events: none;
      transform: translate(-50%, calc(-100% - 12px));
      background: var(--text); color: var(--bg);
      font-size: 12px; font-weight: 600; white-space: nowrap;
      padding: 6px 10px; border-radius: var(--r-sm);
      box-shadow: var(--shadow-md);
    }

    .vg-header {
      display: flex; align-items: flex-end; justify-content: space-between;
      gap: 16px; margin-bottom: 22px; flex-wrap: wrap;
    }
    .vg-period { width: auto; gap: 6px; }
    .date-sep { color: var(--text-4); flex-shrink: 0; }

    .vg-grid { display: grid; grid-template-columns: 1.7fr 1fr; gap: 16px; align-items: start; margin-bottom: 26px; }
    .vg-col-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    .vg-col-side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

    .vg-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .vg-legend { display: flex; gap: 14px; font-size: 12px; color: var(--text-2); }
    .dot-legend { width: 9px; height: 9px; border-radius: 2px; display: inline-block; margin-right: 6px; }

    .vg-total-row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--line);
      font-size: 12px; color: var(--text-3); flex-wrap: wrap;
    }

    .vg-capital {
      padding: 22px;
      background: linear-gradient(180deg, var(--gold-soft) 0%, var(--surface-2) 100%);
    }
    .vg-progress-track {
      height: 8px; border-radius: 999px; background: var(--surface-3);
      margin-top: 16px; overflow: hidden;
    }
    .vg-progress-fill { height: 100%; border-radius: 999px; background: var(--gold-2); transition: width 0.3s ease; }
    .vg-progress-labels {
      display: flex; align-items: baseline; justify-content: space-between;
      margin-top: 8px; font-size: 12px; color: var(--text-3);
    }

    .vg-tipo-row {
      display: flex; align-items: center; gap: 8px; padding: 8px 0;
      border-top: 1px solid var(--line);
    }
    .vg-tipo-row:first-of-type { border-top: 0; }
    .vg-tipo-label { flex: 1; font-size: 13px; color: var(--text-2); text-align: left; }
    .vg-tipo-valor { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }

    .vg-tipo-btn {
      width: 100%; border: 0; background: transparent; cursor: pointer;
      font-family: inherit; border-radius: 8px; margin: 0 -8px; padding: 8px;
      transition: background 0.12s ease;
    }
    .vg-tipo-btn:hover { background: var(--surface-2); }
    .vg-tipo-chevron { color: var(--text-4); flex-shrink: 0; transition: transform 0.15s ease; }
    .vg-tipo-chevron.open { transform: rotate(90deg); color: var(--text-2); }

    .vg-tipo-itens {
      display: flex; flex-direction: column; gap: 2px;
      padding: 4px 8px 10px; background: var(--surface-2); border-radius: 8px; margin: 0 0 4px;
    }
    .vg-tipo-item {
      display: flex; align-items: center; gap: 10px; padding: 6px 4px;
      font-size: 12px; border-top: 1px solid var(--line);
    }
    .vg-tipo-item:first-child { border-top: 0; }
    .vg-tipo-item-desc { flex: 1; min-width: 0; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .vg-tipo-item-data { color: var(--text-3); flex-shrink: 0; }
    .vg-tipo-item-valor { font-weight: 700; font-variant-numeric: tabular-nums; flex-shrink: 0; }
    .vg-tipo-item-vazio { padding: 8px 4px; font-size: 12px; color: var(--text-3); }

    .vg-alertas-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px;
    }

    .vg-alerta-item {
      display: flex; align-items: center; gap: 14px; padding: 14px 18px;
    }
    .vg-alerta-icon {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .vg-alerta-icon.urgente  { background: var(--bad-soft);  color: var(--bad); }
    .vg-alerta-icon.em_breve { background: var(--warn-soft); color: var(--warn); }
    .vg-alerta-texto { flex: 1; min-width: 0; }
    .vg-alerta-titulo { font-size: 14px; font-weight: 600; color: var(--text); }
    .vg-alerta-sub { font-size: 12px; color: var(--text-3); margin-top: 2px; }
    .vg-alerta-valor { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; flex-shrink: 0; }

    @media (max-width: 900px) {
      .vg-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .page-wrapper { padding: 16px 16px 32px; }
      .vg-alerta-item { flex-wrap: wrap; }
      .vg-alerta-valor { order: 3; }
    }
  `],
})
export class VisaoGeralComponent implements OnInit {
  private svc    = inject(VisaoGeralService);
  private auth   = inject(AuthService);
  private snack  = inject(MatSnackBar);
  private pageHeader = inject(PageHeaderService);

  readonly ML = ML; readonly CW = CW; readonly CH = CH;

  carregando = signal(true);
  displayName = signal('');

  private hoje = new Date();
  inicio = signal(toIso(startOfWeek(this.hoje)));
  fim    = signal(toIso(new Date(startOfWeek(this.hoje).getTime() + 6 * 86400000)));

  buckets         = signal<BucketFluxo[]>([]);
  totalEntradas   = signal(0);
  totalSaidas     = signal(0);
  capitalGiro     = signal<CapitalGiro | null>(null);
  despesasPorTipo = signal<DespesasPorTipo | null>(null);
  alertas         = signal<AlertaItem[]>([]);

  tipoExpandido = signal<TipoDespesaChave | null>(null);
  readonly tiposDespesa: { chave: TipoDespesaChave; label: string; cor: string }[] = [
    { chave: 'fixas',        label: 'Fixas',             cor: 'var(--bordo)'  },
    { chave: 'pedidos',      label: 'Pedidos',           cor: 'var(--gold)'   },
    { chave: 'royaltiesFpp', label: 'Royalties + FPP',   cor: 'var(--text-4)' },
  ];

  tooltip = signal<{ x: number; y: number; text: string } | null>(null);

  showTooltip(ev: MouseEvent, text: string): void {
    this.tooltip.set({ x: ev.clientX, y: ev.clientY, text });
  }

  moveTooltip(ev: MouseEvent): void {
    this.tooltip.update(t => t ? { ...t, x: ev.clientX, y: ev.clientY } : t);
  }

  hideTooltip(): void {
    this.tooltip.set(null);
  }

  get dataHojeLabel(): string {
    return this.hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase());
  }

  primeiroNome(): string {
    return (this.displayName().split(/\s+/)[0]) || 'Usuário';
  }

  async ngOnInit() {
    this.pageHeader.setSubtitle('Resumo dos principais indicadores para planejar o desembolso');
    const user = await this.auth.getUser();
    this.displayName.set(user?.user_metadata?.['display_name'] ?? user?.email ?? '');
    await this.carregar();
  }

  onInicioChange(v: string) {
    if (!v) return;
    this.inicio.set(v);
    if (this.fim() < v) this.fim.set(v);
    this.carregar();
  }

  onFimChange(v: string) {
    if (!v) return;
    this.fim.set(v);
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const data = await this.svc.carregar(this.inicio(), this.fim());
      this.buckets.set(data.buckets);
      this.totalEntradas.set(data.totalEntradas);
      this.totalSaidas.set(data.totalSaidas);
      this.capitalGiro.set(data.capitalGiro);
      this.despesasPorTipo.set(data.despesasPorTipo);
      this.alertas.set(data.alertas);
    } catch {
      this.snack.open('Erro ao carregar dados.', 'OK', { duration: 4000 });
    } finally {
      this.carregando.set(false);
    }
  }

  moeda(v: number): string { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); }
  kFmt(v: number): string {
    if (v === 0) return '0';
    if (Math.abs(v) < 1000) return Math.round(v).toString();
    const casas = Math.abs(v) < 10000 ? 1 : 0;
    return (v / 1000).toFixed(casas).replace('.', ',') + 'k';
  }

  mesesReservaLabel(): string { return (this.capitalGiro()?.mesesReserva ?? 0).toFixed(1); }

  progressoReserva(): number {
    const m = this.capitalGiro()?.mesesReserva ?? 0;
    return Math.max(4, Math.min(100, (m / 3) * 100));
  }

  reservaStatusLabel(): string {
    const m = this.capitalGiro()?.mesesReserva ?? 0;
    if (m >= 3) return 'Saudável';
    if (m >= 1.5) return 'Atenção';
    return 'Crítico';
  }

  reservaPillClass(): string {
    const m = this.capitalGiro()?.mesesReserva ?? 0;
    return m >= 3 ? 'ok' : m >= 1.5 ? 'warn' : 'bad';
  }

  iconePara(tipo: AlertaItem['tipo']): string {
    if (tipo === 'pedido') return 'warning';
    if (tipo === 'royalties') return 'account_balance_wallet';
    return 'receipt_long';
  }

  toggleTipo(chave: TipoDespesaChave): void {
    this.tipoExpandido.update(atual => atual === chave ? null : chave);
  }

  valorTipo(chave: TipoDespesaChave): number {
    return this.despesasPorTipo()?.[chave] ?? 0;
  }

  itensTipo(chave: TipoDespesaChave): ItemDespesaTipo[] {
    const dados = this.despesasPorTipo();
    if (!dados) return [];
    if (chave === 'fixas') return dados.itensFixas;
    if (chave === 'pedidos') return dados.itensPedidos;
    return dados.itensRoyaltiesFpp;
  }

  fmtData(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  // ── Chart: Entradas x Saídas ──────────────────────────────
  get chartW(): number { return CW - ML - MR; }
  get chartH(): number { return CH - MT - MB; }

  yMax(): number {
    const all = this.buckets();
    if (!all.length) return 10000;
    const max = Math.max(...all.flatMap(b => [b.entradas, b.saidas]));
    if (max <= 0) return 10000;
    if (max <= 20000) return Math.ceil(max / 5000) * 5000;
    if (max <= 100000) return Math.ceil(max / 10000) * 10000;
    return Math.ceil(max / 50000) * 50000;
  }

  yTicks(): number[] {
    const max = this.yMax();
    return [0, 1, 2, 3, 4].map(i => Math.round(i / 4 * max));
  }

  yS(v: number): number { return MT + this.chartH - (Math.max(0, v) / this.yMax()) * this.chartH; }
  barH(v: number): number { return (Math.max(0, v) / this.yMax()) * this.chartH; }

  groupW(): number {
    const n = this.buckets().length;
    return n > 0 ? this.chartW / n : 0;
  }

  barW(): number { return Math.max(6, Math.floor(this.groupW() * 0.32)); }

  barCenter(i: number): number { return ML + i * this.groupW() + this.groupW() / 2; }

  barX(i: number, side: 'e' | 's'): number {
    const center = this.barCenter(i);
    const gap = 3;
    return side === 'e' ? center - this.barW() - gap / 2 : center + gap / 2;
  }

  // ── Chart: Saldo projetado ─────────────────────────────────
  // Padroniza o range vertical em torno dos valores reais (com folga de 10%),
  // só incluindo 0 no eixo quando o saldo realmente cruza zero — caso contrário
  // uma linha praticamente constante ficaria espremida contra a borda do gráfico.
  private saldoRange(): { min: number; max: number } {
    const valores = this.buckets().map(b => b.saldo);
    if (!valores.length) return { min: 0, max: 10000 };

    let min = Math.min(...valores);
    let max = Math.max(...valores);
    if (min > 0) min = 0; // sempre mostra a base zero quando o saldo é positivo

    const folga = Math.max((max - min) * 0.1, 1);
    return { min: min - (min < 0 ? folga : 0), max: max + folga };
  }

  minSaldo(): number { return this.saldoRange().min; }
  maxSaldo(): number { return this.saldoRange().max; }

  yS2(v: number): number {
    const min = this.minSaldo(), max = this.maxSaldo();
    const span = max - min || 1;
    return MT + this.chartH - ((v - min) / span) * this.chartH;
  }

  yTicksSaldo(): number[] {
    const min = this.minSaldo(), max = this.maxSaldo();
    return [0, 1, 2, 3, 4].map(i => Math.round(min + (i / 4) * (max - min)));
  }

  saldoPts(): string {
    return this.buckets().map((b, i) => `${this.barCenter(i)},${this.yS2(b.saldo)}`).join(' ');
  }
}
