import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FluxoCaixaService, ResumoMes, MesResumo } from '../../services/fluxo-caixa.service';

// SVG chart constants
const ML = 58;   // left margin (y-axis labels)
const MR = 20;   // right margin
const MT = 20;   // top margin
const MB = 44;   // bottom margin (x-axis labels)
const CW = 960;  // total viewBox width
const CH = 300;  // total viewBox height

@Component({
  selector: 'app-fluxo-caixa',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    @if (carregando()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="40"/>
      </div>
    } @else {
      <div style="padding:28px 32px 48px;max-width:1600px">

        <!-- ── Header ─────────────────────────────────────────── -->
        <div class="row" style="align-items:flex-end;justify-content:space-between;margin-bottom:22px">
          <div>
            <h1 class="page">Fluxo de <span class="accent serif">caixa</span></h1>
            <div class="page-sub">Quanto sua loja custa por mês · o que entra e o que sai · onde você estará daqui a 3 meses</div>
          </div>
          <div class="row gap-2">
            <div class="seg">
              @for (opt of periodoOpts; track opt.value) {
                <button [class.on]="periodo() === opt.value" (click)="periodo.set(opt.value)">{{ opt.label }}</button>
              }
            </div>
            <button class="btn outline" type="button">
              <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle">download</mat-icon>
              Exportar
            </button>
          </div>
        </div>

        <!-- ── KPI row ─────────────────────────────────────────── -->
        <div style="display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:14px;margin-bottom:22px">

          <!-- Saldo do mês (bordô) -->
          <div class="kpi bordo" style="padding:22px">
            <div class="kpi-label">
              <mat-icon style="font-size:14px;width:14px;height:14px">account_balance</mat-icon>
              SALDO DO MÊS
            </div>
            <div class="serif" style="font-size:44px;line-height:1.05;margin-top:4px">
              {{ moedaCompact(atual?.saldo ?? 0) }}
            </div>
            <div style="font-size:12px;opacity:0.78;margin-top:6px;line-height:1.5">
              Diferença entre entradas e saídas no mês corrente.
            </div>
            <div style="margin-top:14px;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.10);display:flex;align-items:center;gap:10px">
              <mat-icon style="font-size:14px;width:14px;height:14px;color:var(--gold)">
                {{ (atual?.saldo ?? 0) >= 0 ? 'trending_up' : 'trending_down' }}
              </mat-icon>
              <span style="font-size:12px;color:var(--gold);font-weight:700">
                {{ (atual?.saldo ?? 0) >= 0 ? 'Saldo positivo' : 'Saldo negativo' }} em {{ mesLabel }}
              </span>
            </div>
          </div>

          <!-- Entradas -->
          <div class="kpi">
            <div class="kpi-label">
              <mat-icon style="font-size:14px;width:14px;height:14px">trending_up</mat-icon>
              ENTRADAS · {{ mesAbrev }}
            </div>
            <div class="kpi-value serif">{{ moedaCompact(atual?.entradas ?? 0) }}</div>
            <div class="kpi-foot">
              <span [class]="trendClass(deltaEntradas)">{{ trendArrow(deltaEntradas) }} {{ absPct(deltaEntradas) }}%</span>
              <span>vs {{ moedaCompact(anterior?.entradas ?? 0) }} em {{ mesAbrevAnterior }}</span>
            </div>
          </div>

          <!-- Saídas -->
          <div class="kpi">
            <div class="kpi-label">
              <mat-icon style="font-size:14px;width:14px;height:14px">trending_down</mat-icon>
              SAÍDAS · {{ mesAbrev }}
            </div>
            <div class="kpi-value serif" style="color:var(--bad)">{{ moedaCompact(atual?.saidas ?? 0) }}</div>
            <div class="kpi-foot">
              <span [class]="trendClass(-deltaSaidas)">{{ trendArrow(deltaSaidas) }} {{ absPct(deltaSaidas) }}%</span>
              <span>vs {{ moedaCompact(anterior?.saidas ?? 0) }} em {{ mesAbrevAnterior }}</span>
            </div>
          </div>

          <!-- Margem operacional (gold) -->
          <div class="kpi gold">
            <div class="kpi-label">
              <mat-icon style="font-size:14px;width:14px;height:14px">bolt</mat-icon>
              MARGEM OPERACIONAL
            </div>
            <div class="kpi-value serif">{{ fmtPct(atual?.margem ?? 0) }}%</div>
            <div class="kpi-foot">
              <span [class]="trendClass(deltaMargem)">{{ deltaMargem >= 0 ? '+' : '' }}{{ fmtPct(deltaMargem) }}%</span>
              <span>vs {{ fmtPct(anterior?.margem ?? 0) }}% em {{ mesAbrevAnterior }}</span>
            </div>
          </div>

        </div>

        <!-- ── Histórico & Projeção ────────────────────────────── -->
        <div class="card" style="padding:22px">

          <!-- Card header + legend -->
          <div class="row" style="align-items:flex-start;justify-content:space-between;margin-bottom:20px">
            <div>
              <h3 class="serif" style="margin:0;font-size:22px;font-weight:400">Histórico & Projeção</h3>
              <div style="font-size:12px;color:var(--text-3);margin-top:2px">
                Últimos 12 meses + projeção de 3 meses (intervalo de confiança 85%)
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:20px;font-size:12px;color:var(--text-2)">
              <span style="display:flex;align-items:center;gap:6px">
                <span style="width:10px;height:10px;border-radius:2px;background:#4A8C6A;flex:none"></span>Entradas
              </span>
              <span style="display:flex;align-items:center;gap:6px">
                <span style="width:10px;height:10px;border-radius:2px;background:#7A1F2B;flex:none"></span>Saídas
              </span>
              <span style="display:flex;align-items:center;gap:6px">
                <span style="width:22px;height:2px;background:var(--gold);flex:none"></span>Saldo
              </span>
            </div>
          </div>

          <!-- SVG chart -->
          <svg [attr.viewBox]="'0 0 ' + CW + ' ' + CH" style="width:100%;display:block;overflow:visible">

            <!-- Y-axis grid lines + labels -->
            @for (tick of yTicks; track $index) {
              <line [attr.x1]="ML" [attr.y1]="yS(tick)"
                    [attr.x2]="ML + chartW" [attr.y2]="yS(tick)"
                    stroke="var(--line)" stroke-width="1" stroke-dasharray="4 4"/>
              <text [attr.x]="ML - 8" [attr.y]="yS(tick) + 4"
                    text-anchor="end" font-size="11" fill="var(--text-3)">{{ kFmt(tick) }}</text>
            }

            <!-- Baseline (solid) -->
            <line [attr.x1]="ML" [attr.y1]="yS(0)"
                  [attr.x2]="ML + chartW" [attr.y2]="yS(0)"
                  stroke="var(--line-2)" stroke-width="1.5"/>

            <!-- Projection area divider -->
            <line [attr.x1]="dividerX" [attr.y1]="MT - 4"
                  [attr.x2]="dividerX" [attr.y2]="yS(0) + 10"
                  stroke="var(--text-3)" stroke-width="1" stroke-dasharray="6 4"/>
            <text [attr.x]="dividerX + 10" [attr.y]="MT + 16"
                  font-size="10" font-weight="700" letter-spacing="1.2" fill="var(--text-3)">PROJEÇÃO</text>

            <!-- Bars (rendered before lines so line appears on top) -->
            @for (m of allMonths; track m.mes; let i = $index) {
              <!-- Entrada bar -->
              <rect [attr.x]="barX(i, 'e')"
                    [attr.y]="yS(m.entradas)"
                    [attr.width]="barW"
                    [attr.height]="barH(m.entradas)"
                    [attr.fill]="m.projetado ? 'rgba(74,140,106,0.38)' : '#4A8C6A'"
                    rx="3" ry="3"/>
              <!-- Saída bar -->
              <rect [attr.x]="barX(i, 's')"
                    [attr.y]="yS(m.saidas)"
                    [attr.width]="barW"
                    [attr.height]="barH(m.saidas)"
                    [attr.fill]="m.projetado ? 'rgba(122,31,43,0.38)' : '#7A1F2B'"
                    rx="3" ry="3"/>
            }

            <!-- Saldo line — historical (solid) -->
            @if (historico.length > 0) {
              <polyline [attr.points]="saldoPtsHistorico"
                        fill="none" stroke="var(--gold)" stroke-width="2.5"
                        stroke-linejoin="round" stroke-linecap="round"/>
            }

            <!-- Saldo line — bridge + projection (dashed) -->
            @if (projecao.length > 0) {
              <polyline [attr.points]="saldoPtsBridgeProjecao"
                        fill="none" stroke="var(--gold)" stroke-width="2"
                        stroke-dasharray="6 4" stroke-linejoin="round" stroke-linecap="round"/>
            }

            <!-- Saldo dots -->
            @for (m of allMonths; track m.mes; let i = $index) {
              <circle [attr.cx]="barCenter(i)"
                      [attr.cy]="yS(m.saldo)"
                      [attr.r]="m.projetado ? 3 : 4"
                      fill="white"
                      stroke="var(--gold)"
                      [attr.stroke-width]="m.projetado ? 1.5 : 2"/>
            }

            <!-- X-axis labels -->
            @for (m of allMonths; track m.mes; let i = $index) {
              <text [attr.x]="barCenter(i)"
                    [attr.y]="yS(0) + 22"
                    text-anchor="middle"
                    font-size="11"
                    [attr.fill]="m.projetado ? 'var(--text-4)' : 'var(--text-2)'">{{ xLabel(m.mes, i) }}</text>
            }

          </svg>

          <!-- Stats row -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid var(--line);padding-top:16px;margin-top:12px">

            <!-- Maior mês -->
            <div style="padding-right:24px;border-right:1px solid var(--line)">
              <div class="kpi-label" style="margin-bottom:6px">MAIOR MÊS</div>
              <div class="serif" style="font-size:26px;font-weight:400;line-height:1.1">{{ maiorMesLabel }}</div>
              <div style="font-size:11px;color:var(--bordo);margin-top:4px">
                {{ moedaCompact(maiorMesEntradas) }} — pico do período
              </div>
            </div>

            <!-- Total 12 meses -->
            <div style="padding:0 24px;border-right:1px solid var(--line)">
              <div class="kpi-label" style="margin-bottom:6px">TOTAL 12 MESES</div>
              <div class="serif" style="font-size:26px;font-weight:400;line-height:1.1">{{ moedaCompact(totalSaldo12) }}</div>
              <div style="font-size:11px;margin-top:4px">
                <span [class]="totalSaldo12 >= 0 ? 'trend up' : 'trend down'">
                  {{ totalSaldo12 >= 0 ? '↑ saldo positivo' : '↓ saldo negativo' }}
                </span>
                <span style="color:var(--text-3)"> · margem {{ fmtPct(margemMedia12) }}%</span>
              </div>
            </div>

            <!-- Projeção último mês -->
            <div style="padding:0 24px;border-right:1px solid var(--line)">
              <div class="kpi-label" style="margin-bottom:6px">PROJEÇÃO {{ ultimaProjecaoLabel }}</div>
              <div class="serif" style="font-size:26px;font-weight:400;line-height:1.1"
                   [style.color]="(projecao[2]?.saldo ?? 0) >= 0 ? '' : 'var(--bad)'">
                {{ moedaCompact(projecao[2]?.saldo ?? 0) }}
              </div>
              <div style="font-size:11px;color:var(--text-3);margin-top:4px">com base na sazonalidade</div>
            </div>

            <!-- Reserva de caixa -->
            <div style="padding-left:24px">
              <div class="kpi-label" style="margin-bottom:6px">RESERVA DE CAIXA</div>
              <div class="serif" style="font-size:26px;font-weight:400;line-height:1.1">{{ reservaCaixa }} meses</div>
              <div style="font-size:11px;margin-top:4px">
                <span [class]="reservaCaixaNum >= 3 ? 'trend up' : 'trend down'">
                  {{ reservaCaixaNum >= 3 ? '↑' : '↓' }} recomendado: 3 meses
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    }
  `,
  styles: [],
})
export class FluxoCaixaComponent implements OnInit {
  private svc   = inject(FluxoCaixaService);
  private snack = inject(MatSnackBar);

  carregando = signal(false);
  periodo    = signal<'3m' | '6m' | '12m' | 'ytd'>('12m');

  // KPI state
  atual:    ResumoMes | null = null;
  anterior: ResumoMes | null = null;

  // Chart state
  historico:  MesResumo[] = [];
  projecao:   MesResumo[] = [];
  saldoBanco: number = 0;

  // Expose chart constants to template
  readonly CW = CW;
  readonly CH = CH;
  readonly ML = ML;
  readonly MT = MT;

  readonly periodoOpts = [
    { value: '3m'  as const, label: '3m'  },
    { value: '6m'  as const, label: '6m'  },
    { value: '12m' as const, label: '12m' },
    { value: 'ytd' as const, label: 'YTD' },
  ];

  // ── Date helpers ────────────────────────────────────────────
  private get _now() { return new Date(); }

  get mesLabel(): string {
    return this._now.toLocaleDateString('pt-BR', { month: 'long', year: '2-digit' });
  }

  get mesAbrev(): string {
    return this._now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
  }

  get mesAbrevAnterior(): string {
    const d = new Date(this._now.getFullYear(), this._now.getMonth() - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  }

  // ── KPI deltas ──────────────────────────────────────────────
  get deltaEntradas(): number {
    const prev = this.anterior?.entradas ?? 0;
    const curr = this.atual?.entradas ?? 0;
    return prev > 0 ? ((curr - prev) / prev) * 100 : 0;
  }

  get deltaSaidas(): number {
    const prev = this.anterior?.saidas ?? 0;
    const curr = this.atual?.saidas ?? 0;
    return prev > 0 ? ((curr - prev) / prev) * 100 : 0;
  }

  get deltaMargem(): number {
    return (this.atual?.margem ?? 0) - (this.anterior?.margem ?? 0);
  }

  // ── KPI formatters ──────────────────────────────────────────
  trendClass(delta: number): string { return 'trend ' + (delta >= 0 ? 'up' : 'down'); }
  trendArrow(delta: number): string { return delta >= 0 ? '↑' : '↓'; }
  absPct(v: number): string         { return Math.abs(Math.round(v)).toString(); }
  fmtPct(v: number): string         { return Math.round(v).toString(); }
  moedaCompact(v: number): string   { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); }

  // ── Chart dimensions ────────────────────────────────────────
  get chartW(): number { return CW - ML - MR; }
  get chartH(): number { return CH - MT - MB; }

  get allMonths(): MesResumo[] { return [...this.historico, ...this.projecao]; }

  get groupW(): number {
    const n = this.allMonths.length;
    return n > 0 ? this.chartW / n : 0;
  }

  get barW(): number { return Math.max(10, Math.floor(this.groupW * 0.3)); }

  get dividerX(): number { return ML + this.historico.length * this.groupW; }

  get yMax(): number {
    const all = this.allMonths;
    if (!all.length) return 200000;
    const max = Math.max(...all.flatMap(m => [m.entradas, m.saidas]));
    if (max <= 0) return 200000;
    if (max <= 50000)  return Math.ceil(max / 10000) * 10000;
    if (max <= 150000) return Math.ceil(max / 25000) * 25000;
    return Math.ceil(max / 50000) * 50000;
  }

  get yTicks(): number[] {
    const max = this.yMax;
    return [0, 1, 2, 3, 4].map(i => Math.round(i / 4 * max));
  }

  // ── Chart computation methods (called from template) ────────
  yS(v: number): number {
    return MT + this.chartH - (Math.max(0, v) / this.yMax) * this.chartH;
  }

  barH(v: number): number {
    return (Math.max(0, v) / this.yMax) * this.chartH;
  }

  barCenter(i: number): number {
    return ML + i * this.groupW + this.groupW / 2;
  }

  barX(i: number, side: 'e' | 's'): number {
    const center = this.barCenter(i);
    const gap    = 4;
    return side === 'e' ? center - this.barW - gap / 2 : center + gap / 2;
  }

  kFmt(v: number): string {
    if (v === 0) return '0';
    return Math.round(v / 1000) + 'k';
  }

  xLabel(mes: string, i: number): string {
    const [ano, m] = mes.split('-');
    const d = new Date(+ano, +m - 1, 1);
    const name = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    if (i === 0) return `${name}/${ano.slice(2)}`;
    const prev = this.allMonths[i - 1];
    if (prev.mes.slice(0, 4) !== ano) return `${name}/${ano.slice(2)}`;
    return name;
  }

  // ── Saldo line point strings ─────────────────────────────────
  get saldoPtsHistorico(): string {
    return this.historico
      .map((m, i) => `${this.barCenter(i)},${this.yS(m.saldo)}`)
      .join(' ');
  }

  get saldoPtsBridgeProjecao(): string {
    const pts: string[] = [];
    if (this.historico.length > 0) {
      const last = this.historico[this.historico.length - 1];
      pts.push(`${this.barCenter(this.historico.length - 1)},${this.yS(last.saldo)}`);
    }
    this.projecao.forEach((m, i) => {
      pts.push(`${this.barCenter(this.historico.length + i)},${this.yS(m.saldo)}`);
    });
    return pts.join(' ');
  }

  // ── Stats ───────────────────────────────────────────────────
  private get maiorMes(): MesResumo | null {
    if (!this.historico.length) return null;
    return this.historico.reduce((max, m) => m.entradas > max.entradas ? m : max);
  }

  get maiorMesLabel(): string {
    if (!this.maiorMes) return '—';
    const [ano, m] = this.maiorMes.mes.split('-');
    const d = new Date(+ano, +m - 1, 1);
    const name = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return `${name.charAt(0).toUpperCase()}${name.slice(1)}/${ano.slice(2)}`;
  }

  get maiorMesEntradas(): number {
    return this.maiorMes?.entradas ?? 0;
  }

  get totalSaldo12(): number {
    return this.historico.reduce((s, m) => s + m.saldo, 0);
  }

  get margemMedia12(): number {
    const e = this.historico.reduce((s, m) => s + m.entradas, 0);
    return e > 0 ? (this.totalSaldo12 / e) * 100 : 0;
  }

  get ultimaProjecaoLabel(): string {
    if (!this.projecao.length) return '';
    const last = this.projecao[this.projecao.length - 1];
    const [ano, m] = last.mes.split('-');
    const d = new Date(+ano, +m - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase() + '/' + ano.slice(2);
  }

  get reservaCaixaNum(): number {
    const avgSaidas = this.historico.slice(-3).reduce((s, m) => s + m.saidas, 0) / 3;
    return avgSaidas > 0 ? this.saldoBanco / avgSaidas : 0;
  }

  get reservaCaixa(): string {
    return this.reservaCaixaNum.toFixed(1);
  }

  // ── Lifecycle ───────────────────────────────────────────────
  async ngOnInit() { await this.carregar(); }

  async carregar() {
    this.carregando.set(true);
    try {
      const now    = this._now;
      const ano    = now.getFullYear();
      const mes    = now.getMonth() + 1;
      const anoAnt = mes === 1 ? ano - 1 : ano;
      const mesAnt = mes === 1 ? 12 : mes - 1;

      const [kpis, hist] = await Promise.all([
        Promise.all([
          this.svc.resumoMes(ano, mes),
          this.svc.resumoMes(anoAnt, mesAnt),
        ]),
        this.svc.historicoEProjecao(),
      ]);

      [this.atual, this.anterior] = kpis;
      this.historico  = hist.historico;
      this.projecao   = hist.projecao;
      this.saldoBanco = hist.saldoBanco;
    } catch {
      this.snack.open('Erro ao carregar dados.', 'OK', { duration: 4000 });
    } finally {
      this.carregando.set(false);
    }
  }
}
