import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApuracaoCrmService } from '../../services/apuracao-crm.service';
import { ApuracaoCrm, PreviewApuracao, ResultadoReconciliacao, ItemSemMatch, ItemEanSemCatalogo, ProdutoCatalogo, PedidoApuracao } from '../../models/apuracao.model';
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
            <div class="recon-stat warn" [class.hidden]="!resultadoRecon()!.eanSemCatalogo.length">
              <span class="recon-num">{{ resultadoRecon()!.eanSemCatalogo.length }}</span>
              <span>EANs sem catálogo</span>
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
          @if (resultadoRecon()!.eanSemCatalogo.length > 0) {
            <details class="sem-match-details">
              <summary>EANs sem correspondência no catálogo ({{ resultadoRecon()!.eanSemCatalogo.length }})</summary>
              <div class="sem-match-list">
                @for (s of resultadoRecon()!.eanSemCatalogo; track s.ean) {
                  <div class="sem-match-row">
                    <div class="sm-main">
                      <span class="sm-desc mono" style="font-size:12px">{{ s.ean }}</span>
                      @if (s.descricoes.length) {
                        <div class="sm-pedidos" style="font-style:italic">
                          {{ s.descricoes.slice(0, 3).join(' · ') }}{{ s.descricoes.length > 3 ? ' …' : '' }}
                        </div>
                      }
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
                      <button class="btn ghost xs" (click)="abrirDialogCorrigirEan(s)">Corrigir</button>
                    </div>
                  </div>
                }
              </div>
            </details>
          }
        </div>
      }

      <!-- Formulário de nova apuração (inline) -->
      <div class="form-section">
        <div class="form-controls">
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
          <div class="quinzena-inline">
            <span class="fi-label">Quinzena</span>
            <div class="quinzena-selector">
              <button class="q-btn" [class.active]="selecionado.quinzena === 1" (click)="selecionado.quinzena = 1">
                1ª Quinzena<br><small>Dias 1–15</small>
              </button>
              <button class="q-btn" [class.active]="selecionado.quinzena === 2" (click)="selecionado.quinzena = 2">
                2ª Quinzena<br><small>Dias 16–último</small>
              </button>
            </div>
          </div>
          <button class="btn primary calc-btn" [disabled]="calculando()" (click)="calcular()">
            @if (calculando()) {
              <svg class="spin-sm" width="16" height="16" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
                <path d="M18 3 A15 15 0 0 1 33 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
              </svg>
              Calculando…
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Calcular Preview
            }
          </button>
        </div>

        @if (preview() && preview()!.pedidos.length === 0) {
          <div class="empty-preview">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Nenhum pedido elegível encontrado neste período.
          </div>
        }
      </div>

      <!-- Preview resultados (inline, expansível) -->
      @if (preview() && preview()!.pedidos.length > 0) {
        <div class="preview-full">

          <div class="preview-full-header">
            <div class="preview-titulo">
              Notas incluídas
              <span class="preview-count">{{ preview()!.pedidos.length }}</span>
            </div>
            @if (totalSemEan() > 0) {
              <div class="alerta-ean">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {{ totalSemEan() }} item(ns) sem EAN — valor de venda pode estar subestimado
              </div>
            }
          </div>

          <!-- Lista de notas expansível -->
          <div class="notas-list">
            @for (p of preview()!.pedidos; track p.pedido_id) {
              <div class="nota-card">

                <!-- Cabeçalho clicável -->
                <div class="nota-header" (click)="toggleExpand(p.pedido_id)">
                  <svg class="chevron" [class.open]="expandidos().has(p.pedido_id)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                  <span class="nf">NF {{ p.numero_nf ?? 'S/NF' }}</span>
                  <span class="tipo-badge" [ngClass]="p.tipo">{{ p.tipo === 'linha' ? 'Linha' : 'Sazonal' }}</span>
                  <span class="nota-date">{{ p.data_emissao | date:'dd/MM/yyyy' }}</span>
                  <span class="spacer"></span>
                  @if (p.itens_sem_ean > 0) {
                    <span class="warn-ean" title="{{ p.itens_sem_ean }} item(ns) sem EAN mapeado">
                      ⚠ {{ p.itens_sem_ean }} s/EAN
                    </span>
                  }
                  <span class="nota-items-count">{{ p.itens.length }} item{{ p.itens.length !== 1 ? 's' : '' }}</span>
                  <span class="nota-valor">R$ {{ p.valor_venda | number:'1.2-2':'pt-BR' }}</span>
                </div>

                <!-- Tabela de itens (expansível) -->
                @if (expandidos().has(p.pedido_id)) {
                  <div class="nota-itens">
                    <table class="itens-table">
                      <thead>
                        <tr>
                          <th class="th-desc">Descrição</th>
                          <th class="th-num">Qtd</th>
                          <th class="th-num">Custo Unit.</th>
                          <th class="th-num">Custo Total</th>
                          <th class="th-num">Venda Total</th>
                          <th class="th-num th-fpp">FPP (4%)</th>
                          <th class="th-num">Base Roy.</th>
                          <th class="th-num th-roy">Royalties</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (item of p.itens; track $index) {
                          <tr [class.row-sem-ean]="item.sem_ean">
                            <td class="td-desc">
                              {{ item.descricao }}
                              @if (item.sem_ean) {
                                <span class="badge-sem-ean">s/EAN</span>
                              }
                            </td>
                            <td class="td-num">{{ item.quantidade }}</td>
                            <td class="td-num">{{ item.custo_unitario != null ? (item.custo_unitario | number:'1.2-2':'pt-BR') : '—' }}</td>
                            <td class="td-num">{{ item.custo_total != null ? (item.custo_total | number:'1.2-2':'pt-BR') : '—' }}</td>
                            <td class="td-num">{{ item.sem_ean ? '—' : (item.preco_total_venda | number:'1.2-2':'pt-BR') }}</td>
                            <td class="td-num td-fpp">
                              @if (item.sem_ean) { — }
                              @else if (!item.cobra_fpp) { <span class="badge-isento" title="Produto isento de FPP">Isento</span> }
                              @else { {{ item.fpp | number:'1.2-2':'pt-BR' }} }
                            </td>
                            <td class="td-num">
                              @if (item.sem_ean) { — }
                              @else if (!item.cobra_royalties) { <span class="badge-isento" title="Produto isento de Royalties">Isento</span> }
                              @else { {{ item.base_royalties | number:'1.2-2':'pt-BR' }} }
                            </td>
                            <td class="td-num td-roy">
                              @if (item.sem_ean) { — }
                              @else if (!item.cobra_royalties) { <span class="badge-isento" title="Produto isento de Royalties">Isento</span> }
                              @else { {{ item.royalties | number:'1.2-2':'pt-BR' }} }
                            </td>
                          </tr>
                        }
                      </tbody>
                      <tfoot>
                        <tr>
                          <td class="tf-label" colspan="4">Total da nota</td>
                          <td class="td-num tf-total">R$ {{ p.valor_venda | number:'1.2-2':'pt-BR' }}</td>
                          <td class="td-num td-fpp tf-total">R$ {{ fppPedido(p) | number:'1.2-2':'pt-BR' }}</td>
                          <td class="td-num tf-total">R$ {{ basePedido(p) | number:'1.2-2':'pt-BR' }}</td>
                          <td class="td-num td-roy tf-total">R$ {{ royPedido(p) | number:'1.2-2':'pt-BR' }}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                }

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

          <button class="btn primary confirm-btn" [disabled]="confirmando()" (click)="confirmar()">
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

        </div>
      }

      <!-- Histórico -->
      <div class="historico-section">
        <div class="section-title">Histórico de Apurações</div>

        @if (carregando()) {
          <div class="load-wrap">
            <svg class="spin-ring" width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="15" stroke="var(--line-2)" stroke-width="3"/>
              <path d="M18 3 A15 15 0 0 1 33 18" stroke="var(--bordo)" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>

        } @else if (!apuracoes().length) {
          <div class="empty-wrap">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/>
            </svg>
            <p>Nenhuma apuração confirmada ainda.</p>
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
      </div>

      <!-- Dialog mapeamento manual / correção de EAN -->
      @if (mapeandoItem() || corrigindoEan()) {
        <div class="dialog-overlay" (click)="fecharDialogMapeamento()"></div>
        <div class="dialog-map">
          <div class="dialog-header">
            <div class="dialog-header-info">
              <div class="dialog-title">{{ corrigindoEan() ? 'Corrigir EAN' : 'Mapeamento Manual' }}</div>
              <div class="dialog-subtitle">
                {{ corrigindoEan() ? corrigindoEan()!.ean : mapeandoItem()!.descricao }}
              </div>
              <div class="dialog-ocorr">
                {{ (corrigindoEan() ?? mapeandoItem())!.ocorrencias }} ocorrência(s) —
                @for (p of (corrigindoEan() ?? mapeandoItem())!.pedidos; track p.pedido_id; let last = $last) {
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

              <button class="btn primary w-full" [disabled]="!produtoSelecionado() || aplicandoMap()"
                      (click)="corrigindoEan() ? confirmarCorrigirEan() : confirmarMapeamento()">
                @if (aplicandoMap()) {
                  <svg class="spin-sm" width="16" height="16" viewBox="0 0 36 36" fill="none">
                    <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
                    <path d="M18 3 A15 15 0 0 1 33 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
                  </svg>
                  Aplicando…
                } @else {
                  {{ corrigindoEan() ? 'Confirmar Correção' : 'Confirmar Mapeamento' }}
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
      margin-bottom: 24px;
    }

    /* ─── Formulário inline ─── */
    .form-section {
      background: var(--surface-2);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 18px 22px;
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .form-controls {
      display: grid;
      grid-template-columns: 180px 120px 1fr auto;
      gap: 14px;
      align-items: end;
    }
    .quinzena-inline { display: flex; flex-direction: column; gap: 6px; }
    .fi-label { font-size: 12px; color: var(--text-3); font-weight: 500; }
    .quinzena-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .q-btn {
      padding: 9px 10px; border: 1.5px solid var(--line); border-radius: 10px;
      background: var(--surface); cursor: pointer; font-size: 12px; font-weight: 500;
      color: var(--text-3); text-align: center; line-height: 1.5; transition: all 0.15s;
      small { font-size: 11px; color: var(--text-4); }
      &.active { border-color: var(--bordo, #7A1F2B); background: color-mix(in srgb, var(--bordo, #7A1F2B) 8%, transparent); color: var(--bordo, #7A1F2B); font-weight: 600; }
    }
    .calc-btn { white-space: nowrap; }
    .empty-preview {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; background: var(--surface); border-radius: 8px;
      font-size: 13px; color: var(--text-3);
      svg { flex-shrink: 0; color: var(--text-4); }
    }

    /* ─── Preview inline ─── */
    .preview-full { display: flex; flex-direction: column; gap: 16px; margin-bottom: 28px; }

    .preview-full-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 12px; flex-wrap: wrap;
    }
    .preview-titulo {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; color: var(--text);
    }
    .preview-count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px;
      background: var(--surface-2); border: 1px solid var(--line);
      font-size: 11px; font-weight: 700; color: var(--text-3);
    }
    .alerta-ean {
      display: flex; align-items: center; gap: 7px; padding: 8px 12px;
      background: color-mix(in srgb, #C28A1E 12%, transparent);
      border: 1px solid color-mix(in srgb, #C28A1E 30%, transparent);
      border-radius: 8px; font-size: 12px; color: #7A5510;
      svg { flex-shrink: 0; }
    }

    /* ─── Lista de notas expansível ─── */
    .notas-list { display: flex; flex-direction: column; gap: 6px; }

    .nota-card {
      border: 1px solid var(--line);
      border-radius: 10px;
      overflow: hidden;
    }
    .nota-header {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; cursor: pointer;
      background: var(--surface-2); user-select: none;
      transition: background 0.12s;
      &:hover { background: color-mix(in srgb, var(--bordo, #7A1F2B) 5%, var(--surface-2)); }
    }
    .chevron {
      flex-shrink: 0; color: var(--text-4);
      transition: transform 0.18s ease;
      &.open { transform: rotate(90deg); }
    }
    .nf { font-size: 13px; font-weight: 600; color: var(--text); }
    .tipo-badge {
      font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
      &.linha   { background: color-mix(in srgb, #82622F 15%, transparent); color: #82622F; }
      &.sazonal { background: color-mix(in srgb, #5A1620 15%, transparent); color: #5A1620; }
    }
    .nota-date { font-size: 11px; color: var(--text-4); }
    .spacer { flex: 1; }
    .warn-ean { font-size: 11px; color: #C28A1E; white-space: nowrap; }
    .nota-items-count { font-size: 11px; color: var(--text-4); white-space: nowrap; }
    .nota-valor { font-size: 13px; font-weight: 700; color: var(--text); white-space: nowrap; }

    /* ─── Tabela de itens ─── */
    .nota-itens {
      overflow-x: auto;
      border-top: 1px solid var(--line);
    }
    .itens-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .itens-table thead tr {
      background: color-mix(in srgb, var(--surface-2) 80%, var(--line) 20%);
    }
    .itens-table th {
      padding: 7px 12px;
      font-size: 10px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--text-4); white-space: nowrap;
      border-bottom: 1px solid var(--line);
    }
    .th-desc { text-align: left; }
    .th-num  { text-align: right; }
    .th-fpp  { color: color-mix(in srgb, #5A1620 80%, var(--text-4)); }
    .th-roy  { color: color-mix(in srgb, #82622F 80%, var(--text-4)); }

    .itens-table td {
      padding: 7px 12px;
      color: var(--text-2);
      border-top: 1px solid color-mix(in srgb, var(--line) 45%, transparent);
      white-space: nowrap;
    }
    .td-desc {
      text-align: left; color: var(--text);
      white-space: normal; min-width: 180px; max-width: 300px;
    }
    .td-num  { text-align: right; }
    .td-fpp  { color: #5A1620; font-weight: 600; }
    .td-roy  { color: #82622F; font-weight: 600; }

    .row-sem-ean td { opacity: 0.5; }

    .badge-sem-ean {
      display: inline-block; margin-left: 6px;
      font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px;
      background: color-mix(in srgb, #C28A1E 15%, transparent); color: #7A5510;
      vertical-align: middle;
    }

    .badge-isento {
      display: inline-block;
      font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px;
      background: color-mix(in srgb, var(--text-4) 12%, transparent); color: var(--text-4);
      vertical-align: middle; letter-spacing: .04em;
    }

    .itens-table tfoot td {
      padding: 8px 12px; font-weight: 600;
      color: var(--text); background: var(--surface-2);
      border-top: 2px solid var(--line);
    }
    .tf-label {
      text-align: left; font-size: 11px;
      font-weight: 500; color: var(--text-3);
    }
    .tf-total { font-weight: 700; }

    /* ─── Resumo de cálculo ─── */
    .calc-resumo {
      background: var(--surface-2); border: 1px solid var(--line);
      border-radius: 10px; padding: 16px 20px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .calc-row {
      display: flex; justify-content: space-between; font-size: 13px; color: var(--text-3);
      &.total { font-weight: 600; color: var(--text); }
      &.fpp { color: #5A1620; font-weight: 600; }
      &.royalties { color: #82622F; font-weight: 600; }
      &.total-geral { font-size: 14px; font-weight: 700; color: var(--text); border-top: 1px solid var(--line); padding-top: 8px; }
    }
    .calc-divider { border-top: 1px solid var(--line); margin: 2px 0; }
    .venc-info { font-size: 11px; color: var(--text-4); text-align: right; }

    .confirm-btn { width: 100%; }

    /* ─── Histórico ─── */
    .historico-section { margin-top: 8px; }
    .section-title {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.07em; color: var(--text-4); margin-bottom: 12px;
    }
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
    .empty-wrap {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      padding: 48px 0; color: var(--text-3);
      p { margin: 0; font-size: 13px; }
    }

    /* ─── Reconciliação ─── */
    .recon-card {
      background: var(--surface-2); border: 1px solid var(--line);
      border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;
      display: flex; flex-direction: column; gap: 14px;
    }
    .recon-header {
      display: flex; align-items: center; gap: 10px; color: var(--text); font-size: 14px;
      strong { flex: 1; }
    }
    .recon-stats { display: flex; gap: 16px; }
    .recon-stat {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 10px 18px; border-radius: 8px; font-size: 12px; color: var(--text-3);
      &.ok      { background: var(--ok-soft, #e6f4ea); color: var(--ok, #2E7D32); }
      &.warn    { background: color-mix(in srgb, #C28A1E 12%, transparent); color: #7A5510; }
      &.neutral { background: var(--surface); color: var(--text-3); }
      &.hidden  { display: none; }
    }
    .recon-num { font-size: 22px; font-weight: 700; line-height: 1; }
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

    /* ─── Dialog mapeamento ─── */
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
    .map-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; max-height: 260px; min-height: 80px; }
    .map-empty { padding: 20px; text-align: center; font-size: 13px; color: var(--text-4); }
    .map-item {
      padding: 8px 12px; border-radius: 8px; border: 1.5px solid transparent;
      cursor: pointer; transition: background 0.1s, border-color 0.1s; background: var(--surface-2);
      &:hover { background: color-mix(in srgb, var(--bordo, #7A1F2B) 6%, var(--surface-2)); }
      &.selected { border-color: var(--bordo, #7A1F2B); background: color-mix(in srgb, var(--bordo, #7A1F2B) 8%, transparent); }
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

    /* ─── Utilitários ─── */
    .w-full { width: 100%; }
    .load-wrap { display: flex; justify-content: center; padding: 48px; }
    .spin-ring { animation: spin 0.9s linear infinite; }
    .spin-sm   { animation: spin 0.9s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class ListaApuracoesComponent implements OnInit {
  private service = inject(ApuracaoCrmService);
  private snack   = inject(MatSnackBar);

  readonly meses = MESES;

  apuracoes  = signal<ApuracaoCrm[]>([]);
  carregando = signal(false);
  calculando = signal(false);
  confirmando = signal(false);
  preview = signal<PreviewApuracao | null>(null);
  reconciliando = signal(false);
  resultadoRecon = signal<ResultadoReconciliacao | null>(null);
  expandidos = signal<Set<string>>(new Set());

  mapeandoItem  = signal<ItemSemMatch | null>(null);
  corrigindoEan = signal<ItemEanSemCatalogo | null>(null);
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

  async calcular() {
    this.calculando.set(true);
    this.preview.set(null);
    this.expandidos.set(new Set());
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
      this.preview.set(null);
      this.expandidos.set(new Set());
      await this.carregar();
    } catch (err: any) {
      const msg = err?.message?.includes('unique') ? 'Já existe apuração para este período.' : 'Erro ao confirmar apuração.';
      this.snack.open(msg, 'OK', { duration: 4000 });
    } finally {
      this.confirmando.set(false);
    }
  }

  toggleExpand(pedidoId: string) {
    const s = new Set(this.expandidos());
    s.has(pedidoId) ? s.delete(pedidoId) : s.add(pedidoId);
    this.expandidos.set(s);
  }

  fppPedido(p: PedidoApuracao): number {
    return p.itens.reduce((acc, i) => acc + i.fpp, 0);
  }

  basePedido(p: PedidoApuracao): number {
    return p.itens.reduce((acc, i) => acc + i.base_royalties, 0);
  }

  royPedido(p: PedidoApuracao): number {
    return p.itens.reduce((acc, i) => acc + i.royalties, 0);
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
    this.corrigindoEan.set(null);
    this.todosProdutos.set([]);
    this.produtoSelecionado.set(null);
    this.termoBusca.set('');
  }

  async abrirDialogCorrigirEan(item: ItemEanSemCatalogo) {
    this.corrigindoEan.set(item);
    this.termoBusca.set('');
    this.produtoSelecionado.set(null);
    this.todosProdutos.set([]);
    this.carregandoProdutos.set(true);
    try {
      this.todosProdutos.set(await this.service.buscarProdutos());
    } catch {
      this.snack.open('Erro ao carregar catálogo de produtos.', 'OK', { duration: 3000 });
      this.corrigindoEan.set(null);
    } finally {
      this.carregandoProdutos.set(false);
    }
  }

  async confirmarCorrigirEan() {
    const item    = this.corrigindoEan();
    const produto = this.produtoSelecionado();
    if (!item || !produto) return;
    this.aplicandoMap.set(true);
    try {
      const count = await this.service.corrigirEan(item.ean, produto.ean);
      this.snack.open(`${count} item(ns) com EAN corrigido.`, 'OK', { duration: 4000 });
      const resultado = this.resultadoRecon();
      if (resultado) {
        this.resultadoRecon.set({
          ...resultado,
          eanSemCatalogo: resultado.eanSemCatalogo.filter(s => s.ean !== item.ean),
        });
      }
      this.fecharDialogMapeamento();
    } catch {
      this.snack.open('Erro ao corrigir EAN.', 'OK', { duration: 4000 });
    } finally {
      this.aplicandoMap.set(false);
    }
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
