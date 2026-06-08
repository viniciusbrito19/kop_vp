import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { ProdutosService } from '../../services/produtos.service';
import { Item } from '../../models/produto.model';

@Component({
  selector: 'app-lista-produtos',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatMenuModule,
  ],
  template: `
    @if (carregando()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="40"/>
      </div>
    } @else {
      <div class="content">

        <!-- ── Header ──────────────────────────────────── -->
        <div class="row page-heading-row" style="align-items:flex-end;justify-content:space-between;margin-bottom:22px">
          <div>
            <h1 class="page">Lista de <span class="accent serif">produtos</span></h1>
            <div class="page-sub">{{ itens().length }} itens cadastrados no catálogo</div>
          </div>
        </div>

        <!-- ── KPIs ───────────────────────────────────── -->
        <div class="kpi-grid" style="margin-bottom:22px">

          <div class="kpi bordo">
            <div class="kpi-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
              TOTAL CADASTRADO
            </div>
            <div class="kpi-value serif">{{ itens().length }}</div>
            <div class="kpi-foot">itens na base</div>
          </div>

          <div class="kpi">
            <div class="kpi-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>
              ATIVOS
            </div>
            <div class="kpi-value serif" style="color:var(--ok)">{{ kpiAtivos() }}</div>
            <div class="kpi-foot">disponíveis para pedido</div>
          </div>

          <div class="kpi">
            <div class="kpi-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9 9 15M9 9l6 6"/></svg>
              INATIVOS
            </div>
            <div class="kpi-value serif">{{ kpiInativos() }}</div>
            <div class="kpi-foot">desativados</div>
          </div>

          <div class="kpi gold">
            <div class="kpi-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12c0-4 3-7 7-7s7 3 7 7-3 7-7 7-7-3-7-7Z"/><path d="M9 9c.8 1 2 1.5 3 1.5s2.2-.5 3-1.5M9 14c.8 1 2 1.5 3 1.5s2.2-.5 3-1.5"/></svg>
              PREÇO MÉDIO
            </div>
            <div class="kpi-value serif">{{ moeda(precoMedio()) }}</div>
            <div class="kpi-foot">preço de venda médio</div>
          </div>

        </div>

        <!-- ── Filter bar ──────────────────────────────── -->
        <div class="filter-bar" style="margin-bottom:14px">
          <div class="seg">
            @for (tab of tabs; track tab.value) {
              <button [class.on]="filtro() === tab.value" (click)="filtro.set(tab.value)">{{ tab.label }}</button>
            }
          </div>
          <div class="sep"></div>
          <div class="field filter-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input [value]="busca()" (input)="busca.set($any($event.target).value)" placeholder="Buscar por descrição, código SAP ou EAN…"/>
            @if (busca()) {
              <button class="clear-btn" (click)="busca.set('')" type="button" title="Limpar busca">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            }
          </div>
          <div class="spacer"></div>
          <span class="chip-counter">{{ itensFiltrados().length }} resultados</span>
          <button class="btn ghost sm icon" [disabled]="!filtrosAtivos() || null" (click)="limparFiltros()" type="button" title="Limpar filtros">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>

        <!-- ── List head ───────────────────────────────── -->
        <div class="list-head pg">
          <span>Código SAP</span>
          <span>Descrição</span>
          <span style="text-align:center">Unidade</span>
          <span>EAN</span>
          <span style="text-align:right">Preço Venda</span>
          <span style="text-align:center">Cobranças</span>
          <span style="text-align:center">Status</span>
          <span></span>
        </div>

        <!-- ── Empty state ─────────────────────────────── -->
        @if (itensFiltrados().length === 0) {
          <div style="text-align:center;padding:64px 0;color:var(--text-3)">
            <div style="font-size:15px;font-weight:500">Nenhum item encontrado</div>
            <div style="font-size:13px;margin-top:6px">Ajuste os filtros ou verifique os dados cadastrados no Supabase</div>
          </div>
        }

        <!-- ── Rows ────────────────────────────────────── -->
        <div class="list">
          @for (item of itensPagina(); track item.id) {
            <div class="row-card">
              <div class="row-main pg" style="cursor:default">

                <span class="mono" style="font-size:12px;color:var(--text-2)">
                  {{ item.codigo_sap ?? '—' }}
                </span>

                <span style="font-size:14px;font-weight:500">{{ item.descricao }}</span>

                <span style="text-align:center;font-size:12px;font-weight:600;color:var(--text-3);font-variant:all-small-caps">
                  {{ item.unidade ?? '—' }}
                </span>

                <span class="mono" style="font-size:12px;color:var(--text-3)">
                  {{ item.ean ?? '—' }}
                </span>

                <span style="text-align:right;font-weight:600;font-size:14px">
                  {{ moeda(item.preco_venda) }}
                </span>

                <span class="cobrancas-cell">
                  <span class="mini-pill" [class]="item.cobra_fpp ? 'ok' : 'off'" title="{{ item.cobra_fpp ? 'Cobra FPP' : 'Isento de FPP' }}">FPP</span>
                  <span class="mini-pill" [class]="item.cobra_royalties ? 'ok' : 'off'" title="{{ item.cobra_royalties ? 'Cobra Royalties' : 'Isento de Royalties' }}">ROY</span>
                </span>

                <span style="text-align:center">
                  <span class="pill" [class]="item.ativo ? 'ok' : 'neutral'">
                    {{ item.ativo ? 'Ativo' : 'Inativo' }}
                  </span>
                </span>

                <button class="row-kebab" [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="19" r="1.3" fill="currentColor"/></svg>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="toggleAtivo(item)">
                    <mat-icon>{{ item.ativo ? 'toggle_off' : 'toggle_on' }}</mat-icon>
                    <span>{{ item.ativo ? 'Desativar' : 'Ativar' }}</span>
                  </button>
                  <button mat-menu-item (click)="toggleFpp(item)">
                    <mat-icon>{{ item.cobra_fpp ? 'money_off' : 'attach_money' }}</mat-icon>
                    <span>{{ item.cobra_fpp ? 'Isentar de FPP' : 'Cobrar FPP' }}</span>
                  </button>
                  <button mat-menu-item (click)="toggleRoyalties(item)">
                    <mat-icon>{{ item.cobra_royalties ? 'money_off' : 'attach_money' }}</mat-icon>
                    <span>{{ item.cobra_royalties ? 'Isentar de Royalties' : 'Cobrar Royalties' }}</span>
                  </button>
                  <button mat-menu-item class="warn-item" (click)="excluir(item.id)">
                    <mat-icon>delete</mat-icon><span>Excluir</span>
                  </button>
                </mat-menu>

              </div>
            </div>
          }
        </div>

        <!-- ── Paginador ───────────────────────────────── -->
        @if (totalPaginas() > 1) {
          <div class="paginator">
            <button class="btn ghost sm" [disabled]="paginaAtual() === 1 || null" (click)="irParaPagina(paginaAtual() - 1)" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Anterior
            </button>
            <span class="paginator-info">
              Página <strong>{{ paginaAtual() }}</strong> de <strong>{{ totalPaginas() }}</strong>
            </span>
            <button class="btn ghost sm" [disabled]="paginaAtual() === totalPaginas() || null" (click)="irParaPagina(paginaAtual() + 1)" type="button">
              Próxima
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        }

      </div>
    }
  `,
  styles: [`
    .pg {
      display: grid;
      grid-template-columns: 120px 1fr 80px 148px 118px 100px 88px 44px;
      align-items: center;
      gap: 0 16px;
      padding: 0 16px;
    }

    .cobrancas-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .mini-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .04em;
      padding: 2px 6px;
      border-radius: 4px;
      line-height: 1.4;
      cursor: default;
      user-select: none;
    }
    .mini-pill.ok  { background: color-mix(in srgb, var(--ok) 14%, transparent); color: var(--ok); }
    .mini-pill.off { background: color-mix(in srgb, var(--text-4) 14%, transparent); color: var(--text-4); text-decoration: line-through; }

    .filter-search {
      flex: 1;
      min-width: 220px;
    }

    .clear-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 0;
      background: var(--line-2);
      color: var(--text-3);
      cursor: pointer;
      flex-shrink: 0;
      padding: 0;
      transition: background 0.12s;
    }
    .clear-btn:hover { background: var(--line-2); color: var(--text); }

    .row-kebab {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 0;
      background: transparent;
      color: var(--text-4);
      cursor: pointer;
      border-radius: var(--r-sm);
      padding: 0;
      transition: background 0.12s, color 0.12s;
    }
    .row-kebab:hover { background: var(--surface-2); color: var(--text-2); }

    .paginator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 20px 0 4px;
    }
    .paginator-info {
      font-size: 13px;
      color: var(--text-3);
      min-width: 120px;
      text-align: center;
    }
    .paginator-info strong { color: var(--text); }
  `],
})
export class ListaProdutosComponent implements OnInit {
  private svc   = inject(ProdutosService);
  private snack = inject(MatSnackBar);

  itens      = signal<Item[]>([]);
  carregando = signal(false);
  filtro     = signal<'todos' | 'ativos' | 'inativos'>('todos');
  busca      = signal('');
  paginaAtual = signal(1);

  readonly tamanhoPagina = 10;

  readonly tabs = [
    { value: 'todos'    as const, label: 'Todos'    },
    { value: 'ativos'   as const, label: 'Ativos'   },
    { value: 'inativos' as const, label: 'Inativos' },
  ];

  itensFiltrados = computed(() => {
    let lista = this.itens();
    const f = this.filtro();
    if (f === 'ativos')   lista = lista.filter(i => i.ativo);
    if (f === 'inativos') lista = lista.filter(i => !i.ativo);
    const b = this.busca().toLowerCase().trim();
    if (b) lista = lista.filter(i =>
      i.descricao.toLowerCase().includes(b) ||
      (i.codigo_sap ?? '').toLowerCase().includes(b) ||
      (i.ean ?? '').toLowerCase().includes(b)
    );
    return lista;
  });

  totalPaginas = computed(() => Math.max(1, Math.ceil(this.itensFiltrados().length / this.tamanhoPagina)));

  itensPagina = computed(() => {
    const inicio = (this.paginaAtual() - 1) * this.tamanhoPagina;
    return this.itensFiltrados().slice(inicio, inicio + this.tamanhoPagina);
  });

  constructor() {
    effect(() => {
      this.itensFiltrados();
      this.paginaAtual.set(1);
    });
  }

  kpiAtivos   = computed(() => this.itens().filter(i => i.ativo).length);
  kpiInativos = computed(() => this.itens().filter(i => !i.ativo).length);

  precoMedio = computed(() => {
    const comPreco = this.itens().filter(i => i.preco_venda != null);
    if (!comPreco.length) return 0;
    return comPreco.reduce((s, i) => s + (i.preco_venda ?? 0), 0) / comPreco.length;
  });

  filtrosAtivos = computed(() => this.filtro() !== 'todos' || !!this.busca());

  async ngOnInit() { await this.carregar(); }

  async carregar() {
    this.carregando.set(true);
    try {
      this.itens.set(await this.svc.listar());
    } catch {
      this.snack.open('Erro ao carregar produtos.', 'OK', { duration: 4000 });
    } finally {
      this.carregando.set(false);
    }
  }

  irParaPagina(p: number) {
    this.paginaAtual.set(Math.max(1, Math.min(p, this.totalPaginas())));
  }

  limparFiltros() {
    this.filtro.set('todos');
    this.busca.set('');
  }

  async toggleAtivo(item: Item) {
    try {
      await this.svc.toggleAtivo(item.id, !item.ativo);
      this.itens.update(list =>
        list.map(i => i.id === item.id ? { ...i, ativo: !i.ativo } : i)
      );
    } catch {
      this.snack.open('Erro ao atualizar status.', 'OK', { duration: 4000 });
    }
  }

  async toggleFpp(item: Item) {
    try {
      await this.svc.toggleFlag(item.id, 'cobra_fpp', !item.cobra_fpp);
      this.itens.update(list =>
        list.map(i => i.id === item.id ? { ...i, cobra_fpp: !item.cobra_fpp } : i)
      );
    } catch {
      this.snack.open('Erro ao atualizar FPP.', 'OK', { duration: 4000 });
    }
  }

  async toggleRoyalties(item: Item) {
    try {
      await this.svc.toggleFlag(item.id, 'cobra_royalties', !item.cobra_royalties);
      this.itens.update(list =>
        list.map(i => i.id === item.id ? { ...i, cobra_royalties: !item.cobra_royalties } : i)
      );
    } catch {
      this.snack.open('Erro ao atualizar Royalties.', 'OK', { duration: 4000 });
    }
  }

  async excluir(id: string) {
    if (!confirm('Deseja excluir este item? Esta ação não pode ser desfeita.')) return;
    try {
      await this.svc.excluir(id);
      this.itens.update(list => list.filter(i => i.id !== id));
      this.snack.open('Item excluído com sucesso.', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao excluir item.', 'OK', { duration: 4000 });
    }
  }

  moeda(v: number | null): string {
    if (v == null) return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
