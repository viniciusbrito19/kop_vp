import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApuracaoCrmService } from '../../services/apuracao-crm.service';
import { ApuracaoCrm, PreviewApuracao, ResultadoReconciliacao, ItemSemMatch, ProdutoCatalogo } from '../../models/apuracao.model';
import { DecimalPipe, DatePipe, NgClass } from '@angular/common';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

@Component({
  selector: 'app-lista-apuracoes',
  standalone: true,
  imports: [FormsModule, MatSnackBarModule, DecimalPipe, DatePipe, NgClass],
  template: `
    <div class="content">

      <!-- Cabeçalho -->
      <div class="page-header">
        <div>
          <h1 class="page">Apuração <span class="accent serif">CRM</span></h1>
          <div class="page-sub">Royalties e FPP — cálculo quinzenal sobre valor de venda dos pedidos</div>
        </div>
        <div class="row gap-2">
          <button class="btn outline" [disabled]="reconciliando()" (click)="reconciliarEans()" title="Cruzar itens de pedidos com a lista de produtos para preencher EAN automaticamente">
            @if (reconciliando()) {
              <svg class="spin-sm" width="16" height="16" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="15" stroke="rgba(0,0,0,0.15)" stroke-width="3"/>
                <path d="M18 3 A15 15 0 0 1 33 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              </svg>
              Reconciliando…
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/><path d="M15 21h4a2 2 0 0 0 2-2v-4"/><path d="M7 12h10M12 7l5 5-5 5"/></svg>
              Reconciliar EANs
            }
          </button>
          <button class="btn primary" (click)="abrirNova()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Nova Apuração
          </button>
        </div>
      </div>

      <!-- Resultado da reconciliação -->
      @if (resultadoRecon()) {
        <div class="recon-card">
          <div class="recon-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/><path d="M15 21h4a2 2 0 0 0 2-2v-4"/><path d="M7 12h10M12 7l5 5-5 5"/></svg>
            <strong>Reconciliação de EANs concluída</strong>
            <button class="btn ghost icon sm" (click)="resultadoRecon.set(null)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="recon-stats">
            <div class="recon-stat ok">
              <span class="recon-num">{{ resultadoRecon()!.reconciliados.length }}</span>
              <span>itens atualizados</span>
            </div>
            <div class="recon-stat warn" [class.hidden]="!resultadoRecon()!.semMatch.length">
              <span class="recon-num">{{ resultadoRecon()!.semMatch.length }}</span>
              <span>descrições sem match</span>
            </div>
            <div class="recon-stat neutral">
              <span class="recon-num">{{ resultadoRecon()!.jaComEan }}</span>
              <span>já tinham EAN</span>
            </div>
          </div>

          @if (resultadoRecon()!.semMatch.length > 0) {
            <details class="sem-match-details">
              <summary>Ver descrições sem correspondência ({{ resultadoRecon()!.semMatch.length }})</summary>
              <div class="sem-match-list">
                @for (s of resultadoRecon()!.semMatch; track s.descricao) {
                  <div class="sem-match-row">
                    <div class="sm-main">
                      <span class="sm-desc">{{ s.descricao }}</span>
                      @if (s.pedidos.length) {
                        <div class="sm-pedidos">
                          @for (p of s.pedidos; track p.pedido_id) {
                            <span class="sm-nf">{{ p.numero_nf ?? 'S/NF' }}</span>
                          }
                        </div>
                      }
                    </div>
                    <div class="sm-row-actions">
                      <span class="sm-count">{{ s.ocorrencias }}×</span>
                      <button class="btn ghost xs" (click)="abrirDialogMapeamento(s)">Mapear</button>
                    </div>
                  </div>
                }
              </div>
            </details>
          }
        </div>
      }

      <!-- Painel lateral de nova apuração -->
      @if (painelAberto()) {
        <div class="painel-overlay" (click)="fecharPainel()"></div>
        <div class="painel">
          <div class="painel-header">
            <h2>Nova Apuração</h2>
            <button class="btn ghost icon" (click)="fecharPainel()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="painel-body">
            <div class="form-row">
              <label class="input">
                <span>Mês</span>
                <select [(ngModel)]="selecionado.mes">
                  @for (m of meses; track $index) {
                    <option [value]="$index + 1">{{ m }}</option>
                  }
                </select>
              </label>
              <label class="input">
                <span>Ano</span>
                <input type="number" [(ngModel)]="selecionado.ano" min="2024" max="2030" />
              </label>
            </div>

            <div class="quinzena-selector">
              <button class="q-btn" [class.active]="selecionado.quinzena === 1" (click)="selecionado.quinzena = 1">
                1ª Quinzena<br><small>Dias 1–15</small>
              </button>
              <button class="q-btn" [class.active]="selecionado.quinzena === 2" (click)="selecionado.quinzena = 2">
                2ª Quinzena<br><small>Dias 16–último</small>
              </button>
            </div>

            <button class="btn primary w-full" [disabled]="calculando()" (click)="calcular()">
              @if (calculando()) {
                <svg class="spin-sm" width="16" height="16" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
                  <path d="M18 3 A15 15 0 0 1 33 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
                </svg>
                Calculando…
              } @else {
                Calcular Preview
              }
            </button>

            <!-- Preview dos resultados -->
            @if (preview()) {
              <div class="preview-section">
                @if (preview()!.pedidos.length === 0) {
                  <div class="empty-preview">
                    Nenhum pedido elegível encontrado neste período.
                  </div>
                } @else {
                  <!-- Alertas de itens sem EAN -->
                  @if (totalSemEan() > 0) {
                    <div class="alerta-ean">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      {{ totalSemEan() }} item(ns) sem EAN mapeado — valor de venda pode estar subestimado.
                    </div>
                  }

                  <!-- Pedidos incluídos -->
                  <div class="preview-titulo">Pedidos incluídos ({{ preview()!.pedidos.length }})</div>
                  <div class="pedidos-list">
                    @for (p of preview()!.pedidos; track p.pedido_id) {
                      <div class="pedido-row">
                        <div class="pedido-info">
                          <span class="nf">{{ p.numero_nf ?? 'S/NF' }}</span>
                          <span class="tipo-badge" [ngClass]="p.tipo">{{ p.tipo === 'linha' ? 'Linha' : 'Sazonal' }}</span>
                        </div>
                        <div class="pedido-valor">
                          R$ {{ p.valor_venda | number:'1.2-2':'pt-BR' }}
                          @if (p.itens_sem_ean > 0) {
                            <span class="warn-ean" title="{{ p.itens_sem_ean }} item(ns) sem EAN">⚠</span>
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Resumo de cálculo -->
                  <div class="calc-resumo">
                    <div class="calc-row">
                      <span>Total venda (Linha)</span>
                      <span>R$ {{ preview()!.total_linha | number:'1.2-2':'pt-BR' }}</span>
                    </div>
                    <div class="calc-row">
                      <span>Total venda (Sazonal)</span>
                      <span>R$ {{ preview()!.total_sazonal | number:'1.2-2':'pt-BR' }}</span>
                    </div>
                    <div class="calc-row total">
                      <span>Total venda</span>
                      <span>R$ {{ preview()!.total_venda | number:'1.2-2':'pt-BR' }}</span>
                    </div>
                    <div class="calc-divider"></div>
                    <div class="calc-row fpp">
                      <span>FPP (4%)</span>
                      <span>R$ {{ preview()!.fpp | number:'1.2-2':'pt-BR' }}</span>
                    </div>
                    @if (preview()!.roy_linha > 0) {
                      <div class="calc-row royalties">
                        <span>Royalties Linha (37%)</span>
                        <span>R$ {{ preview()!.roy_linha | number:'1.2-2':'pt-BR' }}</span>
                      </div>
                    }
                    @if (preview()!.roy_sazonal > 0) {
                      <div class="calc-row royalties">
                        <span>Royalties Sazonais (27,5%)</span>
                        <span>R$ {{ preview()!.roy_sazonal | number:'1.2-2':'pt-BR' }}</span>
                      </div>
                    }
                    <div class="calc-row total-geral">
                      <span>Total a pagar</span>
                      <span>R$ {{ totalApagar() | number:'1.2-2':'pt-BR' }}</span>
                    </div>
                    <div class="venc-info">Vencimento: dia 15/{{ mesVencLabel() }}</div>
                  </div>

                  <button class="btn primary w-full" [disabled]="confirmando()" (click)="confirmar()">
                    @if (confirmando()) {
                      <svg class="spin-sm" width="16" height="16" viewBox="0 0 36 36" fill="none">
                        <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
                        <path d="M18 3 A15 15 0 0 1 33 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
                      </svg>
                      Confirmando…
                    } @else {
                      Confirmar e Gerar Títulos
                    }
                  </button>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Histórico -->
      @if (carregando()) {
        <div class="load-wrap">
          <svg class="spin-ring" width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="15" stroke="var(--line-2)" stroke-width="3"/>
            <path d="M18 3 A15 15 0 0 1 33 18" stroke="var(--bordo)" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>

      } @else if (!apuracoes().length) {
        <div class="empty-wrap">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/>
          </svg>
          <p>Nenhuma apuração realizada ainda.</p>
          <button class="btn outline sm" (click)="abrirNova()">Fazer primeira apuração</button>
        </div>

      } @else {
        <div class="list">
          <div class="list-head apuracao-grid">
            <span>Período</span>
            <span>Total Venda</span>
            <span>FPP</span>
            <span>Roy. Linha</span>
            <span>Roy. Sazonal</span>
            <span>Vencimento</span>
            <span>Status</span>
          </div>

          @for (a of apuracoes(); track a.id) {
            <div class="row-card">
              <div class="row-main apuracao-grid">

                <div class="periodo">
                  <span class="mes-label">{{ mesNome(a.mes) }}/{{ a.ano }}</span>
                  <span class="quinzena-label">{{ a.quinzena === 1 ? '1ª Quinzena' : '2ª Quinzena' }}</span>
                </div>

                <span class="valor">R$ {{ a.total_venda | number:'1.2-2':'pt-BR' }}</span>
                <span class="valor fpp">R$ {{ a.valor_fpp | number:'1.2-2':'pt-BR' }}</span>
                <span class="valor roy">R$ {{ a.valor_roy_linha | number:'1.2-2':'pt-BR' }}</span>
                <span class="valor roy">R$ {{ a.valor_roy_sazonal | number:'1.2-2':'pt-BR' }}</span>
                <span class="data-venc">{{ a.data_vencimento | date:'dd/MM/yyyy' }}</span>

                <span class="status-badge" [class.confirmado]="a.status === 'confirmado'">
                  {{ a.status === 'confirmado' ? 'Confirmado' : 'Calculado' }}
                </span>

              </div>
            </div>
          }
        </div>
      }
      <!-- Dialog mapeamento manual -->
      @if (mapeandoItem()) {
        <div class="dialog-overlay" (click)="fecharDialogMapeamento()"></div>
        <div class="dialog-map">
          <div class="dialog-header">
            <div class="dialog-header-info">
              <div class="dialog-title">Mapeamento Manual</div>
              <div class="dialog-subtitle" title="{{ mapeandoItem()!.descricao }}">{{ mapeandoItem()!.descricao }}</div>
              <div class="dialog-ocorr">
                {{ mapeandoItem()!.ocorrencias }} ocorrência(s) —
                @for (p of mapeandoItem()!.pedidos; track p.pedido_id; let last = $last) {
                  <span class="dialog-nf">{{ p.numero_nf ?? 'S/NF' }}</span>@if (!last) {, }
                }
              </div>
            </div>
            <button class="btn ghost icon sm" (click)="fecharDialogMapeamento()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="dialog-body">
            @if (carregandoProdutos()) {
              <div class="map-loading">
                <svg class="spin-sm" width="20" height="20" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="15" stroke="var(--line-2)" stroke-width="3"/>
                  <path d="M18 3 A15 15 0 0 1 33 18" stroke="var(--bordo)" stroke-width="3" stroke-linecap="round"/>
                </svg>
                Carregando catálogo…
              </div>
            } @else {
              <input class="map-search" type="text" placeholder="Buscar por descrição ou EAN…"
                     [value]="termoBusca()" (input)="termoBusca.set($any($event.target).value)"
                     autofocus />

              <div class="map-list">
                @if (!produtosFiltrados().length) {
                  <div class="map-empty">Nenhum produto encontrado para "{{ termoBusca() }}".</div>
                }
                @for (p of produtosFiltrados(); track p.ean) {
                  <div class="map-item" [class.selected]="produtoSelecionado()?.ean === p.ean"
                       (click)="produtoSelecionado.set(p)">
                    <div class="map-item-desc">{{ p.descricao }}</div>
                    <div class="map-item-meta">
                      <span class="map-ean">{{ p.ean }}</span>
                      @if (p.preco_venda != null) {
                        <span class="map-preco">R$ {{ p.preco_venda | number:'1.2-2':'pt-BR' }}</span>
                      }
                    </div>
                  </div>
                }
              </div>

              @if (produtoSelecionado()) {
                <div class="map-selected-preview">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Selecionado: <strong>{{ produtoSelecionado()!.descricao }}</strong>
                </div>
              }

              <button class="btn primary w-full" [disabled]="!produtoSelecionado() || aplicandoMap()" (click)="confirmarMapeamento()">
                @if (aplicandoMap()) {
                  <svg class="spin-sm" width="16" height="16" viewBox="0 0 36 36" fill="none">
                    <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
                    <path d="M18 3 A15 15 0 0 1 33 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
                  </svg>
                  Aplicando…
                } @else {
                  Confirmar Mapeamento
                }
              </button>
            }
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
    }

    /* Painel lateral */
    .painel-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 100;
    }
    .painel {
      position: fixed; top: 0; right: 0; bottom: 0; width: 420px;
      background: var(--surface); border-left: 1px solid var(--line);
      z-index: 101; display: flex; flex-direction: column;
      box-shadow: -8px 0 32px rgba(0,0,0,0.15);
    }
    .painel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px; border-bottom: 1px solid var(--line);
      h2 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text); }
    }
    .painel-body { padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px; }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .quinzena-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .q-btn {
      padding: 12px 8px; border: 1.5px solid var(--line); border-radius: 10px;
      background: var(--surface); cursor: pointer; font-size: 13px; font-weight: 500;
      color: var(--text-3); text-align: center; line-height: 1.5; transition: all 0.15s;
      small { font-size: 11px; color: var(--text-4); }
      &.active { border-color: var(--bordo, #7A1F2B); background: color-mix(in srgb, var(--bordo, #7A1F2B) 8%, transparent); color: var(--bordo, #7A1F2B); font-weight: 600; }
    }

    .w-full { width: 100%; }

    .preview-section { display: flex; flex-direction: column; gap: 14px; }
    .empty-preview { text-align: center; padding: 24px; color: var(--text-3); font-size: 13px; }

    .alerta-ean {
      display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px;
      background: color-mix(in srgb, #C28A1E 12%, transparent);
      border: 1px solid color-mix(in srgb, #C28A1E 30%, transparent);
      border-radius: 8px; font-size: 12px; color: #7A5510;
      svg { flex-shrink: 0; margin-top: 1px; }
    }

    .preview-titulo { font-size: 12px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; }

    .pedidos-list { display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto; }
    .pedido-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: var(--surface-2); border-radius: 7px; }
    .pedido-info { display: flex; align-items: center; gap: 8px; }
    .nf { font-size: 12px; font-weight: 500; color: var(--text); }
    .tipo-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
      &.linha { background: color-mix(in srgb, #82622F 15%, transparent); color: #82622F; }
      &.sazonal { background: color-mix(in srgb, #5A1620 15%, transparent); color: #5A1620; }
    }
    .pedido-valor { font-size: 12px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 4px; }
    .warn-ean { color: #C28A1E; }

    .calc-resumo { background: var(--surface-2); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
    .calc-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-3);
      &.total { font-weight: 600; color: var(--text); }
      &.fpp { color: #5A1620; font-weight: 600; }
      &.royalties { color: #82622F; font-weight: 600; }
      &.total-geral { font-size: 14px; font-weight: 700; color: var(--text); border-top: 1px solid var(--line); padding-top: 8px; }
    }
    .calc-divider { border-top: 1px solid var(--line); margin: 2px 0; }
    .venc-info { font-size: 11px; color: var(--text-4); text-align: right; }

    /* Histórico */
    .apuracao-grid { grid-template-columns: 1.4fr 1fr 0.9fr 1fr 1fr 1fr 90px; }

    .periodo { display: flex; flex-direction: column; gap: 2px; }
    .mes-label { font-size: 13px; font-weight: 600; color: var(--text); }
    .quinzena-label { font-size: 11px; color: var(--text-3); }

    .valor { font-size: 13px; font-weight: 500; color: var(--text-2); }
    .valor.fpp { color: #5A1620; }
    .valor.roy { color: #82622F; }
    .data-venc { font-size: 12px; color: var(--text-3); }

    .status-badge {
      display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px;
      font-size: 11px; font-weight: 600;
      background: var(--surface-2); color: var(--text-3);
      &.confirmado { background: var(--ok-soft, #e6f4ea); color: var(--ok, #2E7D32); }
    }

    /* Reconciliação */
    .recon-card {
      background: var(--surface-2); border: 1px solid var(--line);
      border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;
      display: flex; flex-direction: column; gap: 14px;
    }
    .recon-header {
      display: flex; align-items: center; gap: 10px; color: var(--text);
      font-size: 14px;
      strong { flex: 1; }
    }
    .recon-stats { display: flex; gap: 20px; }
    .recon-stat {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 10px 20px; border-radius: 8px; font-size: 12px; color: var(--text-3);
      &.ok   { background: var(--ok-soft, #e6f4ea); color: var(--ok, #2E7D32); }
      &.warn { background: color-mix(in srgb, #C28A1E 12%, transparent); color: #7A5510; }
      &.neutral { background: var(--surface); color: var(--text-3); }
      &.hidden { display: none; }
    }
    .recon-num { font-size: 24px; font-weight: 700; line-height: 1; }

    .sem-match-details {
      font-size: 13px; color: var(--text-3);
      summary { cursor: pointer; font-weight: 500; color: var(--text-2); padding: 4px 0; }
    }
    .sem-match-list { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto; }
    .sem-match-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; background: var(--surface); border-radius: 6px; }
    .sm-main { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
    .sm-desc { font-size: 12px; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sm-pedidos { display: flex; flex-wrap: wrap; gap: 4px; }
    .sm-nf {
      font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px;
      background: color-mix(in srgb, var(--bordo, #7A1F2B) 10%, transparent);
      color: var(--bordo, #7A1F2B);
    }
    .sm-row-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .sm-count { font-size: 11px; font-weight: 600; color: var(--text-4); }
    .dialog-nf { font-weight: 600; color: var(--bordo, #7A1F2B); }

    /* Dialog mapeamento manual */
    .dialog-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200;
    }
    .dialog-map {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 480px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px);
      background: var(--surface); border: 1px solid var(--line);
      border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      z-index: 201; display: flex; flex-direction: column; overflow: hidden;
    }
    .dialog-header {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
      padding: 20px 20px 16px; border-bottom: 1px solid var(--line);
    }
    .dialog-header-info { flex: 1; min-width: 0; }
    .dialog-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .dialog-subtitle {
      font-size: 12px; font-weight: 600; color: var(--bordo, #7A1F2B);
      font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .dialog-ocorr { font-size: 11px; color: var(--text-4); margin-top: 2px; }
    .dialog-body { padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 12px; overflow: hidden; }
    .map-loading { display: flex; align-items: center; gap: 10px; padding: 24px; justify-content: center; color: var(--text-3); font-size: 13px; }
    .map-search {
      width: 100%; box-sizing: border-box;
      padding: 9px 12px; border: 1.5px solid var(--line); border-radius: 8px;
      font-size: 13px; color: var(--text); background: var(--surface-2);
      outline: none;
      &:focus { border-color: var(--bordo, #7A1F2B); }
    }
    .map-list {
      flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
      max-height: 260px; min-height: 80px;
    }
    .map-empty { padding: 20px; text-align: center; font-size: 13px; color: var(--text-4); }
    .map-item {
      padding: 8px 12px; border-radius: 8px; border: 1.5px solid transparent;
      cursor: pointer; transition: background 0.1s, border-color 0.1s;
      background: var(--surface-2);
      &:hover { background: color-mix(in srgb, var(--bordo, #7A1F2B) 6%, var(--surface-2)); }
      &.selected {
        border-color: var(--bordo, #7A1F2B);
        background: color-mix(in srgb, var(--bordo, #7A1F2B) 8%, transparent);
      }
    }
    .map-item-desc { font-size: 13px; font-weight: 500; color: var(--text); }
    .map-item-meta { display: flex; align-items: center; gap: 10px; margin-top: 3px; }
    .map-ean { font-size: 11px; color: var(--text-4); font-family: monospace; }
    .map-preco { font-size: 11px; font-weight: 600; color: var(--text-3); }
    .map-selected-preview {
      display: flex; align-items: center; gap: 6px; padding: 8px 12px;
      background: var(--ok-soft, #e6f4ea); border-radius: 8px;
      font-size: 12px; color: var(--ok, #2E7D32);
      svg { flex-shrink: 0; }
      strong { font-weight: 600; }
    }

    /* Genérico */
    .load-wrap { display: flex; justify-content: center; padding: 64px; }
    .spin-ring  { animation: spin 0.9s linear infinite; }
    .spin-sm    { animation: spin 0.9s linear infinite; }
    .empty-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 64px; color: var(--text-3); p { margin:0; font-size:14px; } }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class ListaApuracoesComponent implements OnInit {
  private service = inject(ApuracaoCrmService);
  private snack   = inject(MatSnackBar);

  readonly meses = MESES;

  apuracoes  = signal<ApuracaoCrm[]>([]);
  carregando = signal(false);
  painelAberto = signal(false);
  calculando = signal(false);
  confirmando = signal(false);
  preview = signal<PreviewApuracao | null>(null);
  reconciliando = signal(false);
  resultadoRecon = signal<ResultadoReconciliacao | null>(null);

  mapeandoItem = signal<ItemSemMatch | null>(null);
  termoBusca = signal('');
  todosProdutos = signal<ProdutoCatalogo[]>([]);
  produtoSelecionado = signal<ProdutoCatalogo | null>(null);
  carregandoProdutos = signal(false);
  aplicandoMap = signal(false);

  produtosFiltrados = computed(() => {
    const termo = this.termoBusca().toLowerCase().trim();
    const todos = this.todosProdutos();
    if (!termo) return todos.slice(0, 25);
    return todos.filter(p =>
      p.descricao.toLowerCase().includes(termo) || p.ean.includes(termo)
    ).slice(0, 40);
  });

  selecionado = {
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    quinzena: (new Date().getDate() <= 15 ? 1 : 2) as 1 | 2,
  };

  totalSemEan = computed(() =>
    this.preview()?.pedidos.reduce((s, p) => s + p.itens_sem_ean, 0) ?? 0
  );

  totalApagar = computed(() => {
    const p = this.preview();
    if (!p) return 0;
    return p.fpp + p.roy_linha + p.roy_sazonal;
  });

  async ngOnInit() {
    await this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      this.apuracoes.set(await this.service.listar());
    } finally {
      this.carregando.set(false);
    }
  }

  abrirNova() {
    this.preview.set(null);
    this.painelAberto.set(true);
  }

  fecharPainel() {
    this.painelAberto.set(false);
    this.preview.set(null);
  }

  async calcular() {
    this.calculando.set(true);
    this.preview.set(null);
    try {
      const p = await this.service.calcularPreview(
        this.selecionado.ano,
        this.selecionado.mes,
        this.selecionado.quinzena,
      );
      this.preview.set(p);
    } catch {
      this.snack.open('Erro ao calcular preview.', 'OK', { duration: 4000 });
    } finally {
      this.calculando.set(false);
    }
  }

  async confirmar() {
    const p = this.preview();
    if (!p) return;
    this.confirmando.set(true);
    try {
      await this.service.confirmar(p, this.selecionado.ano, this.selecionado.mes, this.selecionado.quinzena);
      this.snack.open('Apuração confirmada e títulos gerados!', 'OK', { duration: 4000 });
      this.fecharPainel();
      await this.carregar();
    } catch (err: any) {
      const msg = err?.message?.includes('unique') ? 'Já existe apuração para este período.' : 'Erro ao confirmar apuração.';
      this.snack.open(msg, 'OK', { duration: 4000 });
    } finally {
      this.confirmando.set(false);
    }
  }

  async reconciliarEans() {
    this.reconciliando.set(true);
    this.resultadoRecon.set(null);
    try {
      const resultado = await this.service.reconciliarEans();
      this.resultadoRecon.set(resultado);
      const msg = resultado.reconciliados.length > 0
        ? `${resultado.reconciliados.length} EAN(s) preenchido(s) com sucesso.`
        : 'Nenhum item novo para reconciliar.';
      this.snack.open(msg, 'OK', { duration: 4000 });
    } catch {
      this.snack.open('Erro ao reconciliar EANs.', 'OK', { duration: 4000 });
    } finally {
      this.reconciliando.set(false);
    }
  }

  async abrirDialogMapeamento(item: ItemSemMatch) {
    this.mapeandoItem.set(item);
    this.termoBusca.set('');
    this.produtoSelecionado.set(null);
    this.todosProdutos.set([]);
    this.carregandoProdutos.set(true);
    try {
      this.todosProdutos.set(await this.service.buscarProdutos());
    } catch {
      this.snack.open('Erro ao carregar catálogo de produtos.', 'OK', { duration: 3000 });
      this.mapeandoItem.set(null);
    } finally {
      this.carregandoProdutos.set(false);
    }
  }

  fecharDialogMapeamento() {
    this.mapeandoItem.set(null);
    this.todosProdutos.set([]);
    this.produtoSelecionado.set(null);
    this.termoBusca.set('');
  }

  async confirmarMapeamento() {
    const item = this.mapeandoItem();
    const produto = this.produtoSelecionado();
    if (!item || !produto) return;
    this.aplicandoMap.set(true);
    try {
      const count = await this.service.aplicarMatchManual(item.descricao, produto.ean);
      this.snack.open(`${count} item(ns) atualizado(s) com EAN.`, 'OK', { duration: 4000 });
      const resultado = this.resultadoRecon();
      if (resultado) {
        this.resultadoRecon.set({
          ...resultado,
          semMatch: resultado.semMatch.filter(s => s.descricao !== item.descricao),
        });
      }
      this.fecharDialogMapeamento();
    } catch {
      this.snack.open('Erro ao aplicar mapeamento.', 'OK', { duration: 4000 });
    } finally {
      this.aplicandoMap.set(false);
    }
  }

  mesNome(mes: number): string {
    return MESES[mes - 1] ?? '';
  }

  mesVencLabel(): string {
    const { ano, mes } = this.selecionado;
    const proximo = mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
    return `${String(proximo.mes).padStart(2, '0')}/${proximo.ano}`;
  }
}
