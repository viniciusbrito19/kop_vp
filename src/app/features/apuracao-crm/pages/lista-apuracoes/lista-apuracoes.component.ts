import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { ApuracaoCrmService, PERCENTUAIS_ROYALTIES_SAZONAL } from '../../services/apuracao-crm.service';
import { PageHeaderService } from '../../../../core/services/page-header.service';
import { ApuracaoCrm, PreviewApuracao, ResultadoReconciliacao, ItemSemMatch, ItemEanSemCatalogo, ItemMultiMatch, ProdutoCatalogo, PedidoApuracao, TituloApuracao, SugestaoConciliacao } from '../../models/apuracao.model';

interface ModalFppCtx {
  periodoLabel: string;
  modo: 'preview' | 'historico';
  ano: number;
  mes: number;
  quinzena: 1 | 2;
  apuracaoId?: string;
  fppLinha: number;
  fppSazonal: number;
}

interface ModalRoyaltiesCtx {
  periodoLabel: string;
  modo: 'preview' | 'historico';
  ano: number;
  mes: number;
  quinzena: 1 | 2;
  apuracaoId?: string;
}

/** Estado editável de um grupo (tipo, alíquota) dentro do modal de emissão de Royalties. */
interface GrupoRoyaltiesEdicao {
  key: string;
  tipo: 'linha' | 'sazonal';
  aliquota: number;
  brutoStr: string;
  /** Só usado quando tipo === 'linha' — Devolução Garantida não se aplica a Sazonal. */
  devGarantidaStr: string;
  devProdutoStr: string;
  outrosStr: string;
  /** Só usado quando tipo === 'linha' — 1ª parcela, 30 dias. */
  vencimentoP1: string;
  /** Só usado quando tipo === 'linha' — 2ª parcela, 45 dias. */
  vencimentoP2: string;
  /** Só usado quando tipo === 'sazonal' — 5 parcelas (20/20/30/15/15%), valor e vencimento editáveis. */
  parcelasSazonal: Array<{ valorStr: string; vencimento: string }>;
  /** Σ vProd do grupo — base fixa para recalcular a Devolução Garantida quando o bruto é ajustado. */
  valorProdutosSemImposto: number;
}
import { DecimalPipe, DatePipe, NgClass } from '@angular/common';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

@Component({
  selector: 'app-lista-apuracoes',
  standalone: true,
  imports: [FormsModule, MatSnackBarModule, MatMenuModule, MatIconModule, DecimalPipe, DatePipe, NgClass],
  template: `
    <div class="content">

      <!-- Cabeçalho -->
      <div class="page-header list-page-heading">
        <div>
          <h1 class="page">Royalties <span class="accent serif">e FPP</span></h1>
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
              <span>vinculados via cProd</span>
            </div>
            <div class="recon-stat warn" [class.hidden]="!resultadoRecon()!.multiMatch.length">
              <span class="recon-num">{{ resultadoRecon()!.multiMatch.length }}</span>
              <span>aguardam escolha</span>
            </div>
            <div class="recon-stat warn" [class.hidden]="!resultadoRecon()!.semMatch.length">
              <span class="recon-num">{{ resultadoRecon()!.semMatch.length }}</span>
              <span>sem correspondência</span>
            </div>
            <div class="recon-stat neutral">
              <span class="recon-num">{{ resultadoRecon()!.jaComEan }}</span>
              <span>já tinham EAN válido</span>
            </div>
          </div>
          @if (resultadoRecon()!.multiMatch.length > 0) {
            <details class="sem-match-details" open>
              <summary>Múltiplos candidatos — escolha o produto correto ({{ resultadoRecon()!.multiMatch.length }})</summary>
              <div class="sem-match-list">
                @for (m of resultadoRecon()!.multiMatch; track m.item_pedido_id) {
                  <div class="sem-match-row multi-row">
                    <div class="sm-main" style="width:100%">
                      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                        <span class="sm-desc">{{ m.descricao_pedido ?? '—' }}</span>
                        <span class="sm-cprod mono">cProd: {{ m.c_prod }}</span>
                        @if (m.numero_nf) { <span class="sm-nf">{{ m.numero_nf }}</span> }
                      </div>
                      <div class="multi-candidates">
                        @for (c of m.candidatos; track c.ean) {
                          <button class="candidate-btn" (click)="resolverMultiMatch(m, c)">
                            <span class="candidate-sap mono">{{ c.codigo_sap }}</span>
                            <span class="candidate-desc">{{ c.descricao }}</span>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </details>
          }
          @if (resultadoRecon()!.semMatch.length > 0) {
            <details class="sem-match-details">
              <summary>Sem correspondência — atualize o catálogo ({{ resultadoRecon()!.semMatch.length }})</summary>
              <div class="sem-match-list">
                @for (s of resultadoRecon()!.semMatch; track s.descricao) {
                  <div class="sem-match-row">
                    <div class="sm-main">
                      <div style="display:flex;align-items:center;gap:8px">
                        <span class="sm-desc">{{ s.descricao }}</span>
                        @if (s.c_prod) { <span class="sm-cprod mono">cProd: {{ s.c_prod }}</span> }
                      </div>
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

      <!-- Formulário de nova apuração (inline) -->
      <div class="form-section">
        <div class="form-controls">
          <label class="input">
            <span>Mês</span>
            <select [(ngModel)]="selecionado.mes">
              @for (m of meses; track $index) {
                <option [ngValue]="$index + 1">{{ m }}</option>
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
            <div class="preview-header-actions">
              @if (totalSemEan() > 0) {
                <div class="alerta-ean">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  {{ totalSemEan() }} item(ns) sem EAN — valor de venda pode estar subestimado
                </div>
              }
              <button class="btn outline btn-export-csv" (click)="exportarCsv()" title="Exportar todos os itens das NFs em CSV">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Exportar CSV
              </button>
            </div>
          </div>

          <!-- Cabeçalho da lista -->
          <div class="notas-list-head">
            <span></span>
            <span>Código</span>
            <span>NF</span>
            <span>Tipo</span>
            <span>Data pedido</span>
            <span>Roy</span>
            <span>FPP</span>
            <span>Royalties</span>
            <span>Venda Total</span>
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
                  <span class="nota-codigo">{{ p.codigo ?? '—' }}</span>
                  <div class="nota-nf-cell">
                    <span class="nf">{{ p.numero_nf ?? 'S/NF' }}</span>
                    @if (p.itens_sem_ean > 0) {
                      <span class="warn-ean" title="{{ p.itens_sem_ean }} item(ns) sem EAN mapeado">
                        ⚠ {{ p.itens_sem_ean }} s/EAN
                      </span>
                    }
                  </div>
                  <span class="tipo-badge" [ngClass]="p.tipo">{{ p.tipo === 'linha' ? 'Linha' : 'Sazonal' }}</span>
                  <span class="nota-date">{{ p.data_emissao | date:'dd/MM/yyyy' }}</span>
                  <span class="pct-roy-badge">{{ p.aliquota_royalties * 100 | number:'1.0-2':'pt-BR' }}%</span>
                  <span class="nota-fpp">R$ {{ fppPedido(p) | number:'1.2-2':'pt-BR' }}</span>
                  <span class="nota-roy">R$ {{ royPedido(p) | number:'1.2-2':'pt-BR' }}</span>
                  <span class="nota-valor">R$ {{ p.valor_venda | number:'1.2-2':'pt-BR' }}</span>
                </div>

                <!-- Info compacta mobile: badge/data + FPP/Royalties/Venda -->
                <div class="nota-mobile-info mobile-only">
                  <div class="nota-mobile-top">
                    <span class="tipo-badge" [ngClass]="p.tipo">{{ p.tipo === 'linha' ? 'Linha' : 'Sazonal' }}</span>
                    @if (p.itens_sem_ean > 0) {
                      <span class="warn-ean-badge">⚠ {{ p.itens_sem_ean }} s/EAN</span>
                    }
                    <span class="nota-mobile-date">{{ p.data_emissao | date:'dd/MM/yyyy' }}</span>
                  </div>
                  <div class="nota-mobile-stats">
                    <div class="nms">
                      <span class="nms-label">FPP</span>
                      <span class="nms-value fpp">R$ {{ fppPedido(p) | number:'1.2-2':'pt-BR' }}</span>
                    </div>
                    <div class="nms">
                      <span class="nms-label">ROY. {{ p.aliquota_royalties * 100 | number:'1.0-2':'pt-BR' }}%</span>
                      <span class="nms-value roy">R$ {{ royPedido(p) | number:'1.2-2':'pt-BR' }}</span>
                    </div>
                    <div class="nms">
                      <span class="nms-label">VENDA</span>
                      <span class="nms-value">R$ {{ p.valor_venda | number:'1.2-2':'pt-BR' }}</span>
                    </div>
                  </div>
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
          <div class="calc-resumo-title mobile-only">Totais</div>
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
            @if (preview()!.fpp_linha > 0) {
              <div class="calc-row fpp">
                <span>FPP — Linha (3,85%)</span>
                <span>R$ {{ preview()!.fpp_linha | number:'1.2-2':'pt-BR' }}</span>
              </div>
            }
            @if (preview()!.fpp_sazonal > 0) {
              <div class="calc-row fpp">
                <span>FPP — Sazonal (3,85%)</span>
                <span>R$ {{ preview()!.fpp_sazonal | number:'1.2-2':'pt-BR' }}</span>
              </div>
            }
            @if (preview()!.fpp_linha > 0 && preview()!.fpp_sazonal > 0) {
              <div class="calc-row fpp total-fpp">
                <span>FPP Total</span>
                <span>R$ {{ preview()!.fpp | number:'1.2-2':'pt-BR' }}</span>
              </div>
            }
            @for (r of royaltiesPorAliquota(); track r.label) {
              <div class="calc-row royalties">
                <span>{{ r.label }}</span>
                <span>R$ {{ r.valor | number:'1.2-2':'pt-BR' }}</span>
              </div>
            }
            <div class="calc-row total-geral">
              <span>Total a pagar</span>
              <span>R$ {{ totalApagar() | number:'1.2-2':'pt-BR' }}</span>
            </div>
            <div class="venc-info">Vencimento estimado (FPP): {{ vencimentoPreview() | date:'dd/MM/yyyy' }}</div>
          </div>

          <div class="emissao-btns">
            @if (apuracaoExistentePreview()?.fpp_emitido) {
              <span class="titulo-emitido-badge emissao-btn">FPP já emitido ✓</span>
            } @else {
              <button class="btn primary emissao-btn" [disabled]="emitindoFpp()" (click)="abrirModalFppPreview()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                Emitir FPP
              </button>
            }
            @if (apuracaoExistentePreview()?.royalties_emitidos) {
              <span class="titulo-emitido-badge emissao-btn">Royalties já emitidos ✓</span>
            } @else {
              <button class="btn ghost emissao-btn" [disabled]="emitindoRoyalties()" (click)="abrirModalRoyaltiesPreview()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                Emitir Royalties
              </button>
            }
          </div>

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
              <span></span>
              <span>Período</span>
              <span>Total Venda</span>
              <span>FPP</span>
              <span>Roy. Linha</span>
              <span>Roy. Sazonal</span>
              <span>Vencimento</span>
              <span>Status</span>
              <span>Títulos</span>
            </div>

            @for (a of apuracoes(); track a.id) {
              <div class="row-card">
                <div class="row-main apuracao-grid" style="cursor:pointer" (click)="toggleExpandHistorico(a.id)">

                  <svg class="chevron" [class.open]="expandidosHistorico().has(a.id)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>

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

                  <div class="titulos-badges" (click)="$event.stopPropagation()">
                    @if (a.fpp_emitido) {
                      <span class="titulo-emitido-badge">FPP ✓</span>
                    } @else {
                      <button class="btn outline xs" (click)="abrirModalFppHistorico(a)">Emitir FPP</button>
                    }
                    @if (a.royalties_emitidos) {
                      <span class="titulo-emitido-badge">ROY ✓</span>
                    } @else {
                      <button class="badge-roy-pendente" [disabled]="abrindoModalRoyalties()" (click)="abrirModalRoyaltiesHistorico(a)" title="Emitir Royalties">ROY</button>
                    }
                  </div>

                </div>

                <!-- Grade de estatísticas mobile -->
                <div class="mobile-stats mobile-only">
                  <div class="mobile-stat">
                    <span class="ms-label">Total venda</span>
                    <span class="ms-value">R$ {{ a.total_venda | number:'1.2-2':'pt-BR' }}</span>
                  </div>
                  <div class="mobile-stat">
                    <span class="ms-label">Vencimento</span>
                    <span class="ms-value">{{ a.data_vencimento | date:'dd/MM/yyyy' }}</span>
                  </div>
                  <div class="mobile-stat">
                    <span class="ms-label">FPP</span>
                    <span class="ms-value fpp">R$ {{ a.valor_fpp | number:'1.2-2':'pt-BR' }}</span>
                  </div>
                  <div class="mobile-stat">
                    <span class="ms-label">Roy. Linha</span>
                    <span class="ms-value roy">R$ {{ a.valor_roy_linha | number:'1.2-2':'pt-BR' }}</span>
                  </div>
                  <div class="mobile-stat">
                    <span class="ms-label">Roy. Sazonal</span>
                    <span class="ms-value roy">R$ {{ a.valor_roy_sazonal | number:'1.2-2':'pt-BR' }}</span>
                  </div>
                  @if (titulosPorApuracao()[a.id]) {
                    <div class="mobile-stat">
                      <span class="ms-label">Títulos</span>
                      <span class="ms-value">{{ titulosPorApuracao()[a.id].length }}</span>
                    </div>
                  }
                </div>

                @if (expandidosHistorico().has(a.id)) {
                  <div class="apuracao-expand">

                    @if (carregandoTitulos() === a.id) {
                      <div class="expand-loading">
                        <svg class="spin-sm" width="16" height="16" viewBox="0 0 36 36" fill="none">
                          <circle cx="18" cy="18" r="15" stroke="var(--line-2)" stroke-width="3"/>
                          <path d="M18 3 A15 15 0 0 1 33 18" stroke="var(--bordo)" stroke-width="3" stroke-linecap="round"/>
                        </svg>
                        Carregando títulos…
                      </div>

                    } @else if (titulosPorApuracao()[a.id]) {
                      @if (titulosPorApuracao()[a.id].length === 0 && adicionandoTituloPara() !== a.id) {
                        <div class="expand-empty">Nenhum título emitido para esta apuração.</div>
                      } @else {
                        <table class="titulos-table">
                          <thead>
                            <tr>
                              <th>Código</th>
                              <th>Descrição</th>
                              <th>Categoria</th>
                              <th>Vencimento</th>
                              <th>Pagamento</th>
                              <th style="text-align:right">Valor</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (t of titulosPorApuracao()[a.id]; track t.id) {
                              @if (editandoTituloId() === t.id) {
                                <tr class="titulo-add-row">
                                  <td><input class="map-search mono" [value]="edicaoTitulo().codigo" (input)="edicaoTitulo.update(v => ({ ...v, codigo: $any($event.target).value }))" placeholder="Código" /></td>
                                  <td><input class="map-search" [value]="edicaoTitulo().descricao" (input)="edicaoTitulo.update(v => ({ ...v, descricao: $any($event.target).value }))" placeholder="Descrição" /></td>
                                  <td>
                                    <select class="map-search" [value]="edicaoTitulo().categoria" (change)="edicaoTitulo.update(v => ({ ...v, categoria: $any($event.target).value }))">
                                      <option value="fpp">fpp</option>
                                      <option value="royalties">royalties</option>
                                      <option value="outros">outros</option>
                                    </select>
                                  </td>
                                  <td><input type="date" class="map-search" [value]="edicaoTitulo().vencimento" (change)="edicaoTitulo.update(v => ({ ...v, vencimento: $any($event.target).value }))" /></td>
                                  <td>—</td>
                                  <td>
                                    <input type="text" inputmode="decimal" class="map-search add-titulo-valor" [value]="edicaoTitulo().valorStr" (input)="edicaoTitulo.update(v => ({ ...v, valorStr: $any($event.target).value }))" placeholder="0,00" />
                                  </td>
                                  <td></td>
                                </tr>
                                <tr class="titulo-add-actions-row">
                                  <td colspan="7">
                                    <div class="titulo-add-actions">
                                      <button class="btn ghost xs" [disabled]="salvandoEdicaoTitulo()" (click)="cancelarEdicaoTitulo()">Cancelar</button>
                                      <button class="btn primary xs" [disabled]="salvandoEdicaoTitulo()" (click)="salvarEdicaoTitulo(a.id, t.id)">
                                        {{ salvandoEdicaoTitulo() ? 'Salvando…' : 'Salvar' }}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              } @else {
                                <tr>
                                  <td class="mono">{{ t.codigo }}</td>
                                  <td>{{ t.descricao ?? '—' }}</td>
                                  <td><span class="cat-badge cat-{{ t.categoria ?? 'default' }}">{{ t.categoria ?? '—' }}</span></td>
                                  <td>{{ t.data_vencimento ? (t.data_vencimento | date:'dd/MM/yyyy') : '—' }}</td>
                                  <td class="pagamento-cell">
                                    @if (t.data_pagamento) {
                                      <span class="pago-badge">{{ t.data_pagamento | date:'dd/MM/yyyy' }}</span>
                                    } @else if (sugestoesConciliacao()[t.id]) {
                                      <span class="identificado-badge">Identificado</span>
                                    } @else if (t.data_vencimento && t.data_vencimento < today) {
                                      <span class="atraso-badge">Em atraso</span>
                                    } @else {
                                      <span class="pendente-badge">Em aberto</span>
                                    }
                                    @if (!t.data_pagamento && sugestoesConciliacao()[t.id]) {
                                      <button
                                        class="btn-conciliar"
                                        [disabled]="conciliando() === t.id"
                                        (click)="confirmarConciliacao(a.id, t, sugestoesConciliacao()[t.id])"
                                        [title]="'Lançamento NIBS de ' + (sugestoesConciliacao()[t.id].dataLancamento | date:'dd/MM/yyyy')">
                                        @if (conciliando() === t.id) {
                                          <svg class="spin-sm" width="11" height="11" viewBox="0 0 36 36" fill="none">
                                            <circle cx="18" cy="18" r="15" stroke="rgba(0,0,0,0.15)" stroke-width="3"/>
                                            <path d="M18 3 A15 15 0 0 1 33 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                                          </svg>
                                        } @else {
                                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                        }
                                        {{ sugestoesConciliacao()[t.id].dataLancamento | date:'dd/MM' }}
                                      </button>
                                    }
                                  </td>
                                  <td style="text-align:right;font-weight:600">R$ {{ t.valor | number:'1.2-2':'pt-BR' }}</td>
                                  <td style="text-align:right">
                                    <button class="btn ghost icon sm" type="button"
                                            [matMenuTriggerFor]="tituloMenu"
                                            [matMenuTriggerData]="{ apuracaoId: a.id, titulo: t }"
                                            title="Mais opções">
                                      <mat-icon style="font-size:18px;width:18px;height:18px">more_vert</mat-icon>
                                    </button>
                                  </td>
                                </tr>
                              }
                            }
                            @if (adicionandoTituloPara() === a.id) {
                              <tr class="titulo-add-row">
                                <td><input class="map-search mono" [value]="novoTitulo().codigo" (input)="novoTitulo.update(v => ({ ...v, codigo: $any($event.target).value }))" placeholder="Código" /></td>
                                <td><input class="map-search" [value]="novoTitulo().descricao" (input)="novoTitulo.update(v => ({ ...v, descricao: $any($event.target).value }))" placeholder="Descrição" /></td>
                                <td>
                                  <select class="map-search" [value]="novoTitulo().categoria" (change)="novoTitulo.update(v => ({ ...v, categoria: $any($event.target).value }))">
                                    <option value="fpp">fpp</option>
                                    <option value="royalties">royalties</option>
                                    <option value="outros">outros</option>
                                  </select>
                                </td>
                                <td><input type="date" class="map-search" [value]="novoTitulo().vencimento" (change)="novoTitulo.update(v => ({ ...v, vencimento: $any($event.target).value }))" /></td>
                                <td>—</td>
                                <td>
                                  <input type="text" inputmode="decimal" class="map-search add-titulo-valor" [value]="novoTitulo().valorStr" (input)="novoTitulo.update(v => ({ ...v, valorStr: $any($event.target).value }))" placeholder="0,00" />
                                </td>
                                <td></td>
                              </tr>
                              <tr class="titulo-add-actions-row">
                                <td colspan="7">
                                  <div class="titulo-add-actions">
                                    <button class="btn ghost xs" [disabled]="salvandoTitulo()" (click)="cancelarAdicionarTitulo()">Cancelar</button>
                                    <button class="btn primary xs" [disabled]="salvandoTitulo()" (click)="salvarNovoTitulo(a.id)">
                                      {{ salvandoTitulo() ? 'Salvando…' : 'Salvar título' }}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      }
                      @if (titulosPorApuracao()[a.id].length > 0 || adicionandoTituloPara() === a.id) {
                        <div class="titulos-mobile-list mobile-only">
                          @for (t of titulosPorApuracao()[a.id]; track t.id) {
                            @if (editandoTituloId() === t.id) {
                              <div class="titulo-mobile-card titulo-mobile-edit">
                                <input class="map-search mono" [value]="edicaoTitulo().codigo" (input)="edicaoTitulo.update(v => ({ ...v, codigo: $any($event.target).value }))" placeholder="Código" />
                                <input class="map-search" [value]="edicaoTitulo().descricao" (input)="edicaoTitulo.update(v => ({ ...v, descricao: $any($event.target).value }))" placeholder="Descrição" />
                                <select class="map-search" [value]="edicaoTitulo().categoria" (change)="edicaoTitulo.update(v => ({ ...v, categoria: $any($event.target).value }))">
                                  <option value="fpp">fpp</option>
                                  <option value="royalties">royalties</option>
                                  <option value="outros">outros</option>
                                </select>
                                <input type="date" class="map-search" [value]="edicaoTitulo().vencimento" (change)="edicaoTitulo.update(v => ({ ...v, vencimento: $any($event.target).value }))" />
                                <input type="text" inputmode="decimal" class="map-search add-titulo-valor" [value]="edicaoTitulo().valorStr" (input)="edicaoTitulo.update(v => ({ ...v, valorStr: $any($event.target).value }))" placeholder="0,00" />
                                <div class="titulo-add-actions">
                                  <button class="btn ghost xs" [disabled]="salvandoEdicaoTitulo()" (click)="cancelarEdicaoTitulo()">Cancelar</button>
                                  <button class="btn primary xs" [disabled]="salvandoEdicaoTitulo()" (click)="salvarEdicaoTitulo(a.id, t.id)">
                                    {{ salvandoEdicaoTitulo() ? 'Salvando…' : 'Salvar' }}
                                  </button>
                                </div>
                              </div>
                            } @else {
                              <div class="titulo-mobile-card">
                                <div class="tm-row1">
                                  <span class="cat-badge cat-{{ t.categoria ?? 'default' }}">{{ t.categoria ?? '—' }}</span>
                                  <span class="tm-desc">{{ t.descricao ?? t.codigo }}</span>
                                  <button class="btn ghost icon sm" type="button"
                                          [matMenuTriggerFor]="tituloMenu"
                                          [matMenuTriggerData]="{ apuracaoId: a.id, titulo: t }"
                                          title="Mais opções">
                                    <mat-icon style="font-size:18px;width:18px;height:18px">more_vert</mat-icon>
                                  </button>
                                </div>
                                <div class="tm-row2">
                                  <span class="tm-venc">
                                    @if (t.data_vencimento) { vence {{ t.data_vencimento | date:'dd/MM/yyyy' }} } @else { — }
                                  </span>
                                  <span class="tm-valor">R$ {{ t.valor | number:'1.2-2':'pt-BR' }}</span>
                                </div>
                                <div class="tm-row3 pagamento-cell">
                                  @if (t.data_pagamento) {
                                    <span class="pago-badge">{{ t.data_pagamento | date:'dd/MM/yyyy' }}</span>
                                  } @else if (sugestoesConciliacao()[t.id]) {
                                    <span class="identificado-badge">Identificado</span>
                                  } @else if (t.data_vencimento && t.data_vencimento < today) {
                                    <span class="atraso-badge">Em atraso</span>
                                  } @else {
                                    <span class="pendente-badge">Em aberto</span>
                                  }
                                  @if (!t.data_pagamento && sugestoesConciliacao()[t.id]) {
                                    <button
                                      class="btn-conciliar"
                                      [disabled]="conciliando() === t.id"
                                      (click)="confirmarConciliacao(a.id, t, sugestoesConciliacao()[t.id])"
                                      [title]="'Lançamento NIBS de ' + (sugestoesConciliacao()[t.id].dataLancamento | date:'dd/MM/yyyy')">
                                      {{ sugestoesConciliacao()[t.id].dataLancamento | date:'dd/MM' }}
                                    </button>
                                  }
                                </div>
                              </div>
                            }
                          }
                          @if (adicionandoTituloPara() === a.id) {
                            <div class="titulo-mobile-card titulo-mobile-edit">
                              <input class="map-search mono" [value]="novoTitulo().codigo" (input)="novoTitulo.update(v => ({ ...v, codigo: $any($event.target).value }))" placeholder="Código" />
                              <input class="map-search" [value]="novoTitulo().descricao" (input)="novoTitulo.update(v => ({ ...v, descricao: $any($event.target).value }))" placeholder="Descrição" />
                              <select class="map-search" [value]="novoTitulo().categoria" (change)="novoTitulo.update(v => ({ ...v, categoria: $any($event.target).value }))">
                                <option value="fpp">fpp</option>
                                <option value="royalties">royalties</option>
                                <option value="outros">outros</option>
                              </select>
                              <input type="date" class="map-search" [value]="novoTitulo().vencimento" (change)="novoTitulo.update(v => ({ ...v, vencimento: $any($event.target).value }))" />
                              <input type="text" inputmode="decimal" class="map-search add-titulo-valor" [value]="novoTitulo().valorStr" (input)="novoTitulo.update(v => ({ ...v, valorStr: $any($event.target).value }))" placeholder="0,00" />
                              <div class="titulo-add-actions">
                                <button class="btn ghost xs" [disabled]="salvandoTitulo()" (click)="cancelarAdicionarTitulo()">Cancelar</button>
                                <button class="btn primary xs" [disabled]="salvandoTitulo()" (click)="salvarNovoTitulo(a.id)">
                                  {{ salvandoTitulo() ? 'Salvando…' : 'Salvar título' }}
                                </button>
                              </div>
                            </div>
                          }
                        </div>
                      }
                      @if (adicionandoTituloPara() !== a.id) {
                        <button class="btn ghost xs add-titulo-trigger" (click)="abrirAdicionarTitulo(a.id)">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          Adicionar título
                        </button>
                      }
                    }

                  </div>
                }

              </div>
            }
          </div>
        }
      </div>

      <!-- ── Modal Emissão FPP ──────────────────────────── -->
      @if (modalFpp()) {
        <div class="dialog-overlay" (click)="fecharModalFpp()"></div>
        <div class="dialog-map dialog-fpp">
          <div class="dialog-header">
            <div class="dialog-header-info">
              <div class="dialog-title">Emitir Título — FPP</div>
              <div class="dialog-subtitle">{{ modalFpp()!.periodoLabel }}</div>
            </div>
            <button class="btn ghost icon sm" (click)="fecharModalFpp()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="dialog-body">
            @if (modalFpp()!.fppLinha > 0) {
              <label class="input">
                <span>FPP Linha (R$)</span>
                <input type="text" inputmode="decimal"
                       [value]="fppValorLinhaStr()"
                       (input)="fppValorLinhaStr.set($any($event.target).value)"
                       placeholder="0,00" [autofocus]="true" />
              </label>
              <label class="input">
                <span>Vencimento{{ modalFpp()!.fppSazonal > 0 ? ' — FPP Linha' : '' }}</span>
                <input type="date"
                       [value]="fppVencimentoLinha()"
                       (change)="fppVencimentoLinha.set($any($event.target).value)" />
              </label>
            }
            @if (modalFpp()!.fppSazonal > 0) {
              <label class="input">
                <span>FPP Sazonal (R$)</span>
                <input type="text" inputmode="decimal"
                       [value]="fppValorSazonalStr()"
                       (input)="fppValorSazonalStr.set($any($event.target).value)"
                       placeholder="0,00" />
              </label>
              <label class="input">
                <span>Vencimento{{ modalFpp()!.fppLinha > 0 ? ' — FPP Sazonal' : '' }}</span>
                <input type="date"
                       [value]="fppVencimentoSazonal()"
                       (change)="fppVencimentoSazonal.set($any($event.target).value)" />
              </label>
            }
            <div class="fpp-modal-info">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Valores pré-preenchidos com o calculado. FPP Linha vence em 30 dias; FPP Sazonal em 3 meses. Ajuste se necessário.
            </div>
            <button class="btn primary w-full"
                    [disabled]="emitindoFpp()"
                    (click)="confirmarEmissaoFpp()">
              @if (emitindoFpp()) {
                <svg class="spin-sm" width="16" height="16" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
                  <path d="M18 3 A15 15 0 0 1 33 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
                </svg>
                Emitindo…
              } @else {
                Confirmar e Emitir Título FPP
              }
            </button>
          </div>
        </div>
      }

      <!-- ── Modal Emissão Royalties ──────────────────────────── -->
      @if (modalRoyalties()) {
        <div class="dialog-overlay" (click)="fecharModalRoyalties()"></div>
        <div class="dialog-map dialog-royalties">
          <div class="dialog-header">
            <div class="dialog-header-info">
              <div class="dialog-title">Emitir Título — Royalties</div>
              <div class="dialog-subtitle">{{ modalRoyalties()!.periodoLabel }}</div>
            </div>
            <button class="btn ghost icon sm" (click)="fecharModalRoyalties()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="dialog-body">
            @if (abrindoModalRoyalties()) {
              <div class="map-loading">
                <svg class="spin-sm" width="20" height="20" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="15" stroke="var(--line-2)" stroke-width="3"/>
                  <path d="M18 3 A15 15 0 0 1 33 18" stroke="var(--bordo)" stroke-width="3" stroke-linecap="round"/>
                </svg>
                Calculando royalties do período…
              </div>
            }
            @if (royGrupos().length > 1) {
              <div class="quinzena-selector roy-tab-selector" [style.grid-template-columns]="'repeat(' + royGrupos().length + ', 1fr)'">
                @for (g of royGrupos(); track g.key) {
                  <button class="q-btn" [class.active]="royGrupoAtivo() === g.key" (click)="royGrupoAtivo.set(g.key)">{{ grupoLabel(g) }}</button>
                }
              </div>
            }
            @for (g of royGrupos(); track g.key) {
              @if (royGrupos().length === 1 || royGrupoAtivo() === g.key) {
                <div class="roy-fields-grid">
                  <label class="input">
                    <span>{{ grupoLabel(g) }} (bruto) (R$)</span>
                    <input type="text" inputmode="decimal"
                           [value]="g.brutoStr"
                           (input)="onGrupoBrutoOuCreditoInput(g, { brutoStr: $any($event.target).value })"
                           placeholder="0,00" [autofocus]="$first" />
                  </label>
                  @if (g.tipo === 'linha') {
                    <label class="input">
                      <span>(-) Crédito Devolução Garantida (R$)</span>
                      <input type="text" inputmode="decimal"
                             [value]="g.devGarantidaStr"
                             (input)="updateGrupo(g.key, { devGarantidaStr: $any($event.target).value })"
                             placeholder="0,00" />
                    </label>
                  }
                  <label class="input">
                    <span>(-) Crédito Devoluções de Produto (R$)</span>
                    <input type="text" inputmode="decimal"
                           [value]="g.devProdutoStr"
                           (input)="onGrupoBrutoOuCreditoInput(g, { devProdutoStr: $any($event.target).value })"
                           placeholder="0,00" />
                  </label>
                  <label class="input">
                    <span>(-) Outros Créditos (R$)</span>
                    <input type="text" inputmode="decimal"
                           [value]="g.outrosStr"
                           (input)="onGrupoBrutoOuCreditoInput(g, { outrosStr: $any($event.target).value })"
                           placeholder="0,00" />
                  </label>
                  @if (g.tipo === 'linha') {
                    <label class="input">
                      <span>Vencimento — Parcela 1 (R$ {{ parcela1Grupo(g) | number:'1.2-2':'pt-BR' }})</span>
                      <input type="date"
                             [value]="g.vencimentoP1"
                             (change)="updateGrupo(g.key, { vencimentoP1: $any($event.target).value })" />
                    </label>
                    <label class="input">
                      <span>Vencimento — Parcela 2 (R$ {{ parcela2Grupo(g) | number:'1.2-2':'pt-BR' }})</span>
                      <input type="date"
                             [value]="g.vencimentoP2"
                             (change)="updateGrupo(g.key, { vencimentoP2: $any($event.target).value })" />
                    </label>
                  }
                </div>
                @if (g.tipo === 'sazonal') {
                  @for (p of g.parcelasSazonal; track $index) {
                    <div class="roy-fields-grid">
                      <label class="input">
                        <span>Parcela {{ $index + 1 }} — {{ percentuaisSazonal[$index] * 100 | number:'1.0-0' }}% (R$)</span>
                        <input type="text" inputmode="decimal"
                               [value]="p.valorStr"
                               (input)="updateParcelaSazonal(g, $index, { valorStr: $any($event.target).value })"
                               placeholder="0,00" />
                      </label>
                      <label class="input">
                        <span>Vencimento</span>
                        <input type="date"
                               [value]="p.vencimento"
                               (change)="updateParcelaSazonal(g, $index, { vencimento: $any($event.target).value })" />
                      </label>
                    </div>
                  }
                }
                <div class="calc-row total">
                  <span>Royalties líquido — {{ grupoLabel(g) }} ({{ g.tipo === 'linha' ? '2' : '5' }} parcelas)</span>
                  <span>R$ {{ (g.tipo === 'sazonal' ? somaParcelasSazonal(g) : liquidoGrupo(g)) | number:'1.2-2':'pt-BR' }}</span>
                </div>
                <div class="calc-divider"></div>
              }
            }
            <div class="calc-row total-geral">
              <span>Royalties líquido total a cobrar</span>
              <span>R$ {{ royaltiesLiquidoTotal() | number:'1.2-2':'pt-BR' }}</span>
            </div>
            <button class="btn primary w-full"
                    [disabled]="emitindoRoyalties()"
                    (click)="confirmarEmissaoRoyalties()">
              @if (emitindoRoyalties()) {
                <svg class="spin-sm" width="16" height="16" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
                  <path d="M18 3 A15 15 0 0 1 33 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
                </svg>
                Emitindo…
              } @else {
                Confirmar e Emitir Título de Royalties
              }
            </button>
          </div>
        </div>
      }

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
                      @if (p.codigo_sap) { <span class="map-ean">SAP {{ p.codigo_sap }}</span> }
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

    <mat-menu #tituloMenu="matMenu">
      <ng-template matMenuContent let-apuracaoId="apuracaoId" let-titulo="titulo">
        <button mat-menu-item (click)="iniciarEdicaoTitulo(titulo)">
          <mat-icon>edit</mat-icon> Editar
        </button>
        <button mat-menu-item (click)="excluirTitulo(apuracaoId, titulo)">
          <mat-icon>delete</mat-icon> Excluir
        </button>
      </ng-template>
    </mat-menu>
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
    .preview-header-actions {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .alerta-ean {
      display: flex; align-items: center; gap: 7px; padding: 8px 12px;
      background: color-mix(in srgb, #C28A1E 12%, transparent);
      border: 1px solid color-mix(in srgb, #C28A1E 30%, transparent);
      border-radius: 8px; font-size: 12px; color: #7A5510;
      svg { flex-shrink: 0; }
    }
    .btn-export-csv {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; padding: 6px 12px; white-space: nowrap;
    }

    /* ─── Lista de notas expansível ─── */
    .notas-list-head, .nota-header {
      display: grid;
      grid-template-columns: 22px 110px 1fr 90px 105px 60px 110px 110px 120px;
      align-items: center;
    }
    .notas-list-head {
      padding: 4px 14px;
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.1em; color: var(--text-4);
      span:nth-child(n+7) { text-align: right; }
      span { white-space: nowrap; }
    }
    .notas-list { display: flex; flex-direction: column; gap: 6px; }

    .nota-card { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
    .nota-header {
      padding: 10px 14px; cursor: pointer;
      background: var(--surface-2); user-select: none;
      transition: background 0.12s;
      &:hover { background: color-mix(in srgb, var(--bordo, #7A1F2B) 5%, var(--surface-2)); }
    }
    .nota-nf-cell {
      display: flex; align-items: center; gap: 8px; min-width: 0; overflow: hidden;
    }
    .chevron {
      flex-shrink: 0; color: var(--text-4);
      transition: transform 0.18s ease;
      &.open { transform: rotate(90deg); }
    }
    .nota-codigo { font-size: 12px; font-weight: 500; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: monospace; }
    .nf { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tipo-badge {
      font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
      justify-self: start; align-self: center;
      &.linha   { background: color-mix(in srgb, #82622F 15%, transparent); color: #82622F; }
      &.sazonal { background: color-mix(in srgb, #5A1620 15%, transparent); color: #5A1620; }
    }
    .nota-date { font-size: 11px; color: var(--text-4); white-space: nowrap; }
    .pct-roy-badge {
      font-size: 11px; font-weight: 600; color: #82622F;
      white-space: nowrap;
    }
    .spacer { flex: 1; }
    .warn-ean { font-size: 11px; color: #C28A1E; white-space: nowrap; flex-shrink: 0; }
    .nota-fpp  { font-size: 12px; font-weight: 600; color: #5A1620; white-space: nowrap; text-align: right; }
    .nota-roy  { font-size: 12px; font-weight: 600; color: #82622F; white-space: nowrap; text-align: right; }
    .nota-valor { font-size: 13px; font-weight: 700; color: var(--text); white-space: nowrap; text-align: right; }

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

    .badge-sem-ean, .badge-isento {
      display: inline-block; font-size: 9px; font-weight: 700; padding: 1px 5px;
      border-radius: 4px; vertical-align: middle;
    }
    .badge-sem-ean { margin-left: 6px; background: color-mix(in srgb, #C28A1E 15%, transparent); color: #7A5510; }
    .badge-isento  { background: color-mix(in srgb, var(--text-4) 12%, transparent); color: var(--text-4); letter-spacing: .04em; }

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
      &.fpp.total-fpp { border-top: 1px dashed color-mix(in srgb, #5A1620 30%, transparent); padding-top: 4px; margin-top: 2px; }
      &.royalties { color: #82622F; font-weight: 600; }
      &.total-geral { font-size: 14px; font-weight: 700; color: var(--text); border-top: 1px solid var(--line); padding-top: 8px; }
    }
    .calc-divider { border-top: 1px solid var(--line); margin: 2px 0; }
    .venc-info { font-size: 11px; color: var(--text-4); text-align: right; }


    /* ─── Histórico ─── */
    .historico-section { margin-top: 8px; }
    .section-title {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.07em; color: var(--text-4); margin-bottom: 12px;
    }
    .list-head.apuracao-grid,
    .row-main.apuracao-grid {
      display: grid;
      grid-template-columns: 22px 1.4fr 1fr 0.9fr 1fr 1fr 1fr 90px 110px;
      gap: 14px;
    }
    /* Alinha à direita as colunas numéricas (3ª a 6ª: Total Venda, FPP, Roy. Linha, Roy. Sazonal) */
    .list-head.apuracao-grid span:nth-child(n+3):nth-child(-n+6),
    .row-main.apuracao-grid .valor { text-align: right; }
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
    .sm-count  { font-size: 11px; font-weight: 600; color: var(--text-4); }
    .sm-cprod  { font-size: 10px; color: var(--text-4); background: var(--surface-3); padding: 1px 6px; border-radius: 4px; flex-shrink: 0; }
    .dialog-nf { font-weight: 600; color: var(--bordo, #7A1F2B); }

    /* ─── Multi-match ─── */
    .multi-row { flex-direction: column; align-items: stretch; }
    .multi-candidates {
      display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;
    }
    .candidate-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 10px; border-radius: 6px;
      border: 1.5px solid var(--line-2); background: var(--surface);
      cursor: pointer; font: inherit; font-size: 12px;
      color: var(--text-2); transition: all 0.12s;
      &:hover { border-color: var(--bordo, #7A1F2B); background: color-mix(in srgb, var(--bordo, #7A1F2B) 6%, transparent); color: var(--bordo, #7A1F2B); }
    }
    .candidate-sap { font-size: 10px; font-weight: 700; font-family: monospace; color: var(--text-4); }
    .candidate-desc { font-size: 12px; }

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
    .dialog-body { padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 12px; flex: 1; min-height: 0; overflow-y: auto; }
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

    /* ─── Emissão FPP / Royalties ─── */
    .emissao-btns {
      display: flex; gap: 10px; flex-wrap: wrap;
    }
    .emissao-btn {
      display: inline-flex; align-items: center; gap: 7px;
      flex: 1; justify-content: center; min-width: 160px;
    }
    /* ─── Títulos badges no histórico ─── */
    .titulos-badges {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    }
    .titulo-emitido-badge, .badge-roy-pendente {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px;
    }
    .titulo-emitido-badge { background: var(--ok-soft, #e6f4ea); color: var(--ok, #2E7D32); }
    .badge-roy-pendente {
      background: color-mix(in srgb, #C28A1E 16%, transparent); color: #7A5510;
      border: none; cursor: pointer; font-family: inherit; transition: opacity 0.15s;
      &:hover:not(:disabled) { opacity: 0.75; }
      &:disabled { opacity: 0.5; cursor: default; }
    }

    /* ─── Accordion do histórico ─── */
    .apuracao-expand {
      border-top: 1px solid var(--line);
      padding: 14px 16px;
      background: color-mix(in srgb, var(--surface-2) 60%, var(--surface));
    }
    .expand-loading {
      display: flex; align-items: center; gap: 10px;
      font-size: 13px; color: var(--text-3); padding: 8px 0;
    }
    .expand-empty {
      font-size: 13px; color: var(--text-4); padding: 8px 0;
    }

    /* ─── Tabela de títulos ─── */
    .titulos-table {
      width: 100%; border-collapse: collapse; font-size: 12px;
    }
    .titulos-table th {
      padding: 6px 10px; font-size: 10px; font-weight: 600;
      text-transform: uppercase; letter-spacing: .06em; color: var(--text-4);
      border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap;
    }
    .titulos-table td {
      padding: 7px 10px; color: var(--text-2);
      border-top: 1px solid color-mix(in srgb, var(--line) 50%, transparent);
      white-space: nowrap;
    }
    .cat-badge {
      display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .04em;
      padding: 2px 7px; border-radius: 4px; text-transform: uppercase;
    }
    .cat-fpp       { background: color-mix(in srgb, #5A1620 14%, transparent); color: #5A1620; }
    .cat-royalties { background: color-mix(in srgb, #82622F 14%, transparent); color: #82622F; }
    .cat-default   { background: var(--surface-2); color: var(--text-3); }
    .pago-badge, .pendente-badge, .atraso-badge, .identificado-badge {
      display: inline-block; font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px;
    }
    .pago-badge { background: var(--ok-soft, #e6f4ea); color: var(--ok, #2E7D32); }
    .pendente-badge    { background: color-mix(in srgb, #C28A1E 12%, transparent); color: #7A5510; }
    .atraso-badge      { background: color-mix(in srgb, #C62828 12%, transparent); color: #C62828; }
    .identificado-badge{ background: color-mix(in srgb, #1565C0 12%, transparent); color: #1565C0; }
    .pagamento-cell { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .add-titulo-valor { text-align: right; }
    .titulo-add-row td, .titulo-add-actions-row td { padding: 5px 10px; }
    .titulo-add-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .add-titulo-trigger { margin-top: 8px; }
    .btn-conciliar {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 999px; border: none; cursor: pointer;
      background: color-mix(in srgb, #2E7D32 14%, transparent); color: #2E7D32;
      transition: opacity .15s;
      &:hover:not(:disabled) { opacity: .75; }
      &:disabled { opacity: .5; cursor: default; }
    }

    /* ─── Modal FPP ─── */
    .dialog-fpp { width: 420px; }
    /* ─── Modal Royalties ─── */
    .dialog-royalties { width: 520px; }
    .roy-fields-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px;
    }
    .fpp-modal-info {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 12px; border-radius: 8px; font-size: 12px; color: var(--text-3);
      background: var(--surface-2); border: 1px solid var(--line);
      svg { flex-shrink: 0; margin-top: 1px; }
    }

    /* ─── Utilitários ─── */
    /* .mobile-only é ocultado no styles.scss global (mesma especificidade do breakpoint
       mobile que o reexibe — um display:none aqui, com o atributo de encapsulamento do
       Angular, teria especificidade maior e venceria mesmo dentro do @media mobile). */
    .w-full { width: 100%; }
    .load-wrap { display: flex; justify-content: center; padding: 48px; }
    .spin-ring, .spin-sm { animation: spin 0.9s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class ListaApuracoesComponent implements OnInit {
  private service = inject(ApuracaoCrmService);
  private snack   = inject(MatSnackBar);
  private pageHeader = inject(PageHeaderService);

  readonly meses = MESES;
  readonly percentuaisSazonal = PERCENTUAIS_ROYALTIES_SAZONAL;

  apuracoes  = signal<ApuracaoCrm[]>([]);
  carregando = signal(false);
  calculando = signal(false);
  preview = signal<PreviewApuracao | null>(null);
  reconciliando = signal(false);
  resultadoRecon = signal<ResultadoReconciliacao | null>(null);
  expandidos = signal<Set<string>>(new Set());

  mapeandoItem  = signal<ItemSemMatch | null>(null);
  corrigindoEan = signal<ItemEanSemCatalogo | null>(null);
  resolvendoMulti = signal(false);
  termoBusca = signal('');
  todosProdutos = signal<ProdutoCatalogo[]>([]);
  produtoSelecionado = signal<ProdutoCatalogo | null>(null);
  carregandoProdutos = signal(false);
  today = new Date().toISOString().slice(0, 10);

  aplicandoMap = signal(false);

  emitindoFpp            = signal(false);
  modalFpp               = signal<ModalFppCtx | null>(null);
  fppValorLinhaStr       = signal('');
  fppValorSazonalStr     = signal('');
  fppVencimentoLinha     = signal('');
  fppVencimentoSazonal   = signal('');

  emitindoRoyalties          = signal(false);
  abrindoModalRoyalties      = signal(false);
  modalRoyalties             = signal<ModalRoyaltiesCtx | null>(null);
  /** Um item por combinação (tipo, alíquota) encontrada no período (ex.: Linha 27,5%, Linha 37%). */
  royGrupos                  = signal<GrupoRoyaltiesEdicao[]>([]);
  /** Key do grupo ativo no chaveador — só relevante quando royGrupos().length > 1. */
  royGrupoAtivo              = signal('');

  expandidosHistorico   = signal<Set<string>>(new Set());
  titulosPorApuracao    = signal<Record<string, TituloApuracao[]>>({});
  carregandoTitulos     = signal<string | null>(null);
  // tituloId → melhor lançamento NIBS candidato
  sugestoesConciliacao  = signal<Record<string, SugestaoConciliacao>>({});
  conciliando           = signal<string | null>(null);

  /** Id da apuração com o formulário inline de novo título aberto (ou null). */
  adicionandoTituloPara = signal<string | null>(null);
  novoTitulo = signal({ codigo: '', descricao: '', categoria: 'outros', valorStr: '', vencimento: '' });
  salvandoTitulo = signal(false);

  /** Id do título com o formulário inline de edição aberto (ou null). */
  editandoTituloId = signal<string | null>(null);
  edicaoTitulo = signal({ codigo: '', descricao: '', categoria: 'outros', valorStr: '', vencimento: '' });
  salvandoEdicaoTitulo = signal(false);

  produtosFiltrados = computed(() => {
    const termo = this.termoBusca().toLowerCase().trim();
    const todos = this.todosProdutos();
    if (!termo) return todos.slice(0, 25);
    return todos.filter(p =>
      p.descricao.toLowerCase().includes(termo) ||
      p.ean.includes(termo) ||
      (p.codigo_sap ?? '').toLowerCase().includes(termo)
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

  private apuracaoDoPeriodo(ano: number, mes: number, quinzena: 1 | 2): ApuracaoCrm | undefined {
    return this.apuracoes().find(a => a.ano === ano && a.mes === mes && a.quinzena === quinzena);
  }

  /** Apuração já existente (se houver) para o período selecionado no preview — usada para bloquear reemissão. */
  apuracaoExistentePreview = computed(() => {
    this.preview(); // recalcula quando um novo preview é gerado para o período selecionado
    return this.apuracaoDoPeriodo(this.selecionado.ano, this.selecionado.mes, this.selecionado.quinzena);
  });

  private parseMoeda(s: string): number {
    const v = parseFloat(s.trim().replace(',', '.'));
    return isNaN(v) ? 0 : v;
  }

  private formatMoeda(n: number): string {
    return n.toFixed(2).replace('.', ',');
  }

  /** Rótulo do grupo para o chaveador e os cabeçalhos, ex.: "Linha 27,5%" / "Sazonal 37%". */
  grupoLabel(g: GrupoRoyaltiesEdicao): string {
    const nome = g.tipo === 'linha' ? 'Linha' : 'Sazonal';
    const pct  = (g.aliquota * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    return `${nome} ${pct}%`;
  }

  updateGrupo(key: string, patch: Partial<GrupoRoyaltiesEdicao>) {
    this.royGrupos.update(lista => lista.map(g => g.key === key ? { ...g, ...patch } : g));
  }

  liquidoGrupo(g: GrupoRoyaltiesEdicao): number {
    const bruto     = this.parseMoeda(g.brutoStr);
    const devGarant = g.tipo === 'linha' ? this.parseMoeda(g.devGarantidaStr) : 0;
    const devProd   = this.parseMoeda(g.devProdutoStr);
    const outros    = this.parseMoeda(g.outrosStr);
    return bruto - devGarant - devProd - outros;
  }

  /** Divide o líquido nas 5 parcelas de Royalties Sazonal (20/20/30/15/15%); a última absorve o resto do arredondamento. */
  private calcularParcelasSazonal(liquido: number, vencimentos: string[]): Array<{ valorStr: string; vencimento: string }> {
    const valores: number[] = [];
    let soma = 0;
    for (let i = 0; i < PERCENTUAIS_ROYALTIES_SAZONAL.length - 1; i++) {
      const v = Math.round(liquido * PERCENTUAIS_ROYALTIES_SAZONAL[i] * 100) / 100;
      valores.push(v);
      soma += v;
    }
    valores.push(Math.round((liquido - soma) * 100) / 100);
    return vencimentos.map((vencimento, i) => ({ valorStr: this.formatMoeda(valores[i]), vencimento }));
  }

  /**
   * O royalties bruto (e os créditos) de um grupo podem ser ajustados manualmente. Quando ajustados:
   * em grupo Linha, a Devolução Garantida — que depende do bruto na fórmula (Σ produtos sem imposto +
   * royalties bruto) × 5% — é recalculada; em grupo Sazonal, as 5 parcelas são recalculadas a partir
   * do novo líquido (mantendo as datas já ajustadas pelo usuário).
   */
  onGrupoBrutoOuCreditoInput(g: GrupoRoyaltiesEdicao, patch: Partial<GrupoRoyaltiesEdicao>) {
    let atualizado: GrupoRoyaltiesEdicao = { ...g, ...patch };
    if (g.tipo === 'linha' && 'brutoStr' in patch) {
      const brutoAjustado = this.parseMoeda(atualizado.brutoStr);
      const sugestao = (g.valorProdutosSemImposto + brutoAjustado) * 0.05;
      atualizado = { ...atualizado, devGarantidaStr: sugestao > 0 ? this.formatMoeda(sugestao) : '' };
    }
    if (g.tipo === 'sazonal') {
      atualizado = {
        ...atualizado,
        parcelasSazonal: this.calcularParcelasSazonal(this.liquidoGrupo(atualizado), atualizado.parcelasSazonal.map(p => p.vencimento)),
      };
    }
    this.royGrupos.update(lista => lista.map(x => x.key === g.key ? atualizado : x));
  }

  /** Ajuste manual de uma parcela específica de Royalties Sazonal — não recalcula as demais. */
  updateParcelaSazonal(g: GrupoRoyaltiesEdicao, idx: number, patch: Partial<{ valorStr: string; vencimento: string }>) {
    const parcelas = g.parcelasSazonal.map((p, i) => i === idx ? { ...p, ...patch } : p);
    this.updateGrupo(g.key, { parcelasSazonal: parcelas });
  }

  /** Royalties Linha é cobrado em 2 parcelas iguais; a 2ª absorve o resto do arredondamento. */
  parcela1Grupo(g: GrupoRoyaltiesEdicao): number {
    return Math.round(this.liquidoGrupo(g) / 2 * 100) / 100;
  }
  parcela2Grupo(g: GrupoRoyaltiesEdicao): number {
    return Math.round((this.liquidoGrupo(g) - this.parcela1Grupo(g)) * 100) / 100;
  }

  /** Soma das 5 parcelas de Sazonal — pode diferir levemente do líquido "de fábrica" se o usuário ajustou valores manualmente. */
  somaParcelasSazonal(g: GrupoRoyaltiesEdicao): number {
    return g.parcelasSazonal.reduce((s, p) => s + this.parseMoeda(p.valorStr), 0);
  }

  royaltiesLiquidoTotal = computed(() => this.royGrupos().reduce(
    (s, g) => s + (g.tipo === 'sazonal' ? this.somaParcelasSazonal(g) : this.liquidoGrupo(g)), 0));

  async ngOnInit() {
    this.pageHeader.setSubtitle('Royalties e FPP — cálculo quinzenal sobre valor de venda dos pedidos');
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

  abrirModalFppPreview() {
    const { ano, mes, quinzena } = this.selecionado;
    const { fim } = this.service.intervalo(ano, mes, quinzena);
    const p = this.preview();
    const quinzLabel = quinzena === 1 ? '1ª Quinzena' : '2ª Quinzena';
    const fppLinha   = p?.fpp_linha   ?? 0;
    const fppSazonal = p?.fpp_sazonal ?? 0;
    this.fppValorLinhaStr.set(fppLinha   > 0 ? this.formatMoeda(fppLinha)   : '');
    this.fppValorSazonalStr.set(fppSazonal > 0 ? this.formatMoeda(fppSazonal) : '');
    this.fppVencimentoLinha.set(this.service.vencimentoFpp(fim));
    this.fppVencimentoSazonal.set(this.service.vencimentoFppSazonal(fim));
    this.modalFpp.set({ periodoLabel: `${quinzLabel} de ${MESES[mes - 1]}/${ano}`, modo: 'preview', ano, mes, quinzena, fppLinha, fppSazonal });
  }

  abrirModalFppHistorico(a: ApuracaoCrm) {
    const quinzLabel = a.quinzena === 1 ? '1ª Quinzena' : '2ª Quinzena';
    const totalGeral = a.total_linha + a.total_sazonal;
    const fppLinha   = totalGeral > 0 && a.total_linha   > 0 ? a.valor_fpp * (a.total_linha   / totalGeral) : (a.total_sazonal === 0 ? a.valor_fpp : 0);
    const fppSazonal = totalGeral > 0 && a.total_sazonal > 0 ? a.valor_fpp * (a.total_sazonal / totalGeral) : (a.total_linha   === 0 ? a.valor_fpp : 0);
    this.fppValorLinhaStr.set(fppLinha   > 0 ? this.formatMoeda(fppLinha)   : '');
    this.fppValorSazonalStr.set(fppSazonal > 0 ? this.formatMoeda(fppSazonal) : '');
    this.fppVencimentoLinha.set(a.data_vencimento);
    this.fppVencimentoSazonal.set(this.service.vencimentoFppSazonal(a.data_fim));
    this.modalFpp.set({ periodoLabel: `${quinzLabel} de ${MESES[a.mes - 1]}/${a.ano}`, modo: 'historico', ano: a.ano, mes: a.mes, quinzena: a.quinzena, apuracaoId: a.id, fppLinha, fppSazonal });
  }

  fecharModalFpp() {
    this.modalFpp.set(null);
  }

  async confirmarEmissaoFpp() {
    const ctx = this.modalFpp();
    if (!ctx) return;

    const existente = ctx.modo === 'preview'
      ? this.apuracaoDoPeriodo(ctx.ano, ctx.mes, ctx.quinzena)
      : this.apuracoes().find(a => a.id === ctx.apuracaoId);
    if (existente?.fpp_emitido) {
      this.snack.open('FPP já foi emitido para este período.', 'OK', { duration: 4000 });
      this.modalFpp.set(null);
      return;
    }

    const parseFpp = (s: string) => parseFloat(s.trim().replace(',', '.'));
    const itensFpp: Array<{ subtipo: 'linha' | 'sazonal'; valor: number; dataVencimento: string }> = [];

    if (ctx.fppLinha > 0) {
      const v = parseFpp(this.fppValorLinhaStr());
      if (isNaN(v) || v <= 0) { this.snack.open('Informe o valor do FPP Linha.', 'OK', { duration: 3000 }); return; }
      const d = this.fppVencimentoLinha();
      if (!d) { this.snack.open('Informe o vencimento do FPP Linha.', 'OK', { duration: 3000 }); return; }
      itensFpp.push({ subtipo: 'linha', valor: v, dataVencimento: d });
    }
    if (ctx.fppSazonal > 0) {
      const v = parseFpp(this.fppValorSazonalStr());
      if (isNaN(v) || v <= 0) { this.snack.open('Informe o valor do FPP Sazonal.', 'OK', { duration: 3000 }); return; }
      const d = this.fppVencimentoSazonal();
      if (!d) { this.snack.open('Informe o vencimento do FPP Sazonal.', 'OK', { duration: 3000 }); return; }
      itensFpp.push({ subtipo: 'sazonal', valor: v, dataVencimento: d });
    }
    if (itensFpp.length === 0) { this.snack.open('Nenhum FPP a emitir.', 'OK', { duration: 3000 }); return; }

    this.emitindoFpp.set(true);
    try {
      let apuracaoId: string;

      if (existente) {
        apuracaoId = existente.id;
      } else if (ctx.modo === 'preview') {
        const p = this.preview();
        if (!p) return;
        const apuracao = await this.service.confirmar(p, ctx.ano, ctx.mes, ctx.quinzena);
        apuracaoId = apuracao.id;
      } else {
        apuracaoId = ctx.apuracaoId!;
      }

      await this.service.emitirFpp(apuracaoId, itensFpp, ctx.ano, ctx.mes, ctx.quinzena);

      this.snack.open('Título FPP emitido com sucesso!', 'OK', { duration: 4000 });
      this.modalFpp.set(null);

      if (ctx.modo === 'preview') {
        this.preview.set(null);
        this.expandidos.set(new Set());
      }

      // Invalida cache de títulos da apuração para recarregar se expandir
      this.titulosPorApuracao.update(m => {
        const copia = { ...m };
        delete copia[apuracaoId];
        return copia;
      });

      await this.carregar();
    } catch (err: any) {
      const msg = err?.message?.includes('unique')
        ? 'Já existe apuração confirmada para este período.'
        : 'Erro ao emitir título FPP.';
      this.snack.open(msg, 'OK', { duration: 4000 });
    } finally {
      this.emitindoFpp.set(false);
    }
  }

  /** Constrói o estado editável de cada grupo (tipo, alíquota) a partir de um preview recém-calculado. */
  private construirGrupos(p: PreviewApuracao, dataFim: string, quinzena: 1 | 2): GrupoRoyaltiesEdicao[] {
    return p.grupos_royalties.map(g => ({
      key:                     `${g.tipo}_${g.aliquota}`,
      tipo:                    g.tipo,
      aliquota:                g.aliquota,
      brutoStr:                this.formatMoeda(g.roy_bruto),
      devGarantidaStr:         g.tipo === 'linha' && g.credito_devolucao_garantida > 0 ? this.formatMoeda(g.credito_devolucao_garantida) : '',
      devProdutoStr:           '',
      outrosStr:               '',
      vencimentoP1:            g.tipo === 'linha' ? this.service.vencimentoFpp(dataFim) : '',
      vencimentoP2:            g.tipo === 'linha' ? this.service.vencimentoRoyaltiesLinhaParcela2(dataFim) : '',
      parcelasSazonal:         g.tipo === 'sazonal' ? this.calcularParcelasSazonal(g.roy_bruto, this.service.vencimentosRoyaltiesSazonal(dataFim, quinzena)) : [],
      valorProdutosSemImposto: g.valor_produtos_sem_imposto,
    }));
  }

  abrirModalRoyaltiesPreview() {
    const { ano, mes, quinzena } = this.selecionado;
    const { fim } = this.service.intervalo(ano, mes, quinzena);
    const p = this.preview();
    if (!p) return;
    const quinzLabel = quinzena === 1 ? '1ª Quinzena' : '2ª Quinzena';
    const grupos = this.construirGrupos(p, fim, quinzena);
    this.royGrupos.set(grupos);
    this.royGrupoAtivo.set(grupos[0]?.key ?? '');
    this.modalRoyalties.set({ periodoLabel: `${quinzLabel} de ${MESES[mes - 1]}/${ano}`, modo: 'preview', ano, mes, quinzena });
  }

  async abrirModalRoyaltiesHistorico(a: ApuracaoCrm) {
    const quinzLabel = a.quinzena === 1 ? '1ª Quinzena' : '2ª Quinzena';
    // A apuração confirmada só guarda totais agregados por tipo (não por alíquota) — para segregar
    // corretamente os grupos, recalculamos a partir dos pedidos do período, igual ao preview.
    this.abrindoModalRoyalties.set(true);
    try {
      const p = await this.service.calcularPreview(a.ano, a.mes, a.quinzena);
      const grupos = this.construirGrupos(p, a.data_fim, a.quinzena);
      this.royGrupos.set(grupos);
      this.royGrupoAtivo.set(grupos[0]?.key ?? '');
    } catch {
      this.snack.open('Não foi possível recalcular os royalties do período — tente novamente.', 'OK', { duration: 4000 });
      this.abrindoModalRoyalties.set(false);
      return;
    }
    this.abrindoModalRoyalties.set(false);
    this.modalRoyalties.set({ periodoLabel: `${quinzLabel} de ${MESES[a.mes - 1]}/${a.ano}`, modo: 'historico', ano: a.ano, mes: a.mes, quinzena: a.quinzena, apuracaoId: a.id });
  }

  fecharModalRoyalties() {
    this.modalRoyalties.set(null);
  }

  async confirmarEmissaoRoyalties() {
    const ctx = this.modalRoyalties();
    if (!ctx) return;

    const existente = ctx.modo === 'preview'
      ? this.apuracaoDoPeriodo(ctx.ano, ctx.mes, ctx.quinzena)
      : this.apuracoes().find(a => a.id === ctx.apuracaoId);
    if (existente?.royalties_emitidos) {
      this.snack.open('Royalties já foram emitidos para este período.', 'OK', { duration: 4000 });
      this.modalRoyalties.set(null);
      return;
    }

    const itensRoy: Array<{
      tipo: 'linha' | 'sazonal';
      aliquota: number;
      valorBruto: number;
      valorLiquido: number;
      parcelas: Array<{ valor: number; dataVencimento: string }>;
      devolucaoGarantida: number;
      devolucoesProduto: number;
      outros: number;
    }> = [];

    for (const g of this.royGrupos()) {
      const bruto = this.parseMoeda(g.brutoStr);
      if (bruto <= 0) { this.snack.open(`Informe o valor do royalties bruto — ${this.grupoLabel(g)}.`, 'OK', { duration: 3500 }); return; }

      if (g.tipo === 'linha') {
        if (!g.vencimentoP1 || !g.vencimentoP2) { this.snack.open(`Informe o vencimento das duas parcelas — ${this.grupoLabel(g)}.`, 'OK', { duration: 3500 }); return; }
        itensRoy.push({
          tipo: 'linha',
          aliquota: g.aliquota,
          valorBruto: bruto,
          valorLiquido: this.liquidoGrupo(g),
          parcelas: [
            { valor: this.parcela1Grupo(g), dataVencimento: g.vencimentoP1 },
            { valor: this.parcela2Grupo(g), dataVencimento: g.vencimentoP2 },
          ],
          devolucaoGarantida: this.parseMoeda(g.devGarantidaStr),
          devolucoesProduto:  this.parseMoeda(g.devProdutoStr),
          outros:             this.parseMoeda(g.outrosStr),
        });
      } else {
        if (g.parcelasSazonal.some(p => !p.vencimento)) { this.snack.open(`Informe o vencimento das 5 parcelas — ${this.grupoLabel(g)}.`, 'OK', { duration: 3500 }); return; }
        itensRoy.push({
          tipo: 'sazonal',
          aliquota: g.aliquota,
          valorBruto: bruto,
          valorLiquido: this.somaParcelasSazonal(g),
          parcelas: g.parcelasSazonal.map(p => ({ valor: this.parseMoeda(p.valorStr), dataVencimento: p.vencimento })),
          devolucaoGarantida: 0,
          devolucoesProduto:  this.parseMoeda(g.devProdutoStr),
          outros:             this.parseMoeda(g.outrosStr),
        });
      }
    }
    if (itensRoy.length === 0) { this.snack.open('Nenhum Royalties a emitir.', 'OK', { duration: 3000 }); return; }

    this.emitindoRoyalties.set(true);
    try {
      let apuracaoId: string;

      if (existente) {
        apuracaoId = existente.id;
      } else if (ctx.modo === 'preview') {
        const p = this.preview();
        if (!p) return;
        const apuracao = await this.service.confirmar(p, ctx.ano, ctx.mes, ctx.quinzena);
        apuracaoId = apuracao.id;
      } else {
        apuracaoId = ctx.apuracaoId!;
      }

      await this.service.emitirRoyalties(apuracaoId, itensRoy, ctx.ano, ctx.mes, ctx.quinzena);

      this.snack.open('Título de Royalties emitido com sucesso!', 'OK', { duration: 4000 });
      this.modalRoyalties.set(null);

      if (ctx.modo === 'preview') {
        this.preview.set(null);
        this.expandidos.set(new Set());
      }

      this.titulosPorApuracao.update(m => {
        const copia = { ...m };
        delete copia[apuracaoId];
        return copia;
      });

      await this.carregar();
    } catch (err: any) {
      const msg = err?.message?.includes('unique')
        ? 'Já existe apuração confirmada para este período.'
        : 'Erro ao emitir título de Royalties.';
      this.snack.open(msg, 'OK', { duration: 4000 });
    } finally {
      this.emitindoRoyalties.set(false);
    }
  }

  async toggleExpandHistorico(apuracaoId: string) {
    const s = new Set(this.expandidosHistorico());
    if (s.has(apuracaoId)) {
      s.delete(apuracaoId);
      this.expandidosHistorico.set(s);
    } else {
      s.add(apuracaoId);
      this.expandidosHistorico.set(s);
      if (!this.titulosPorApuracao()[apuracaoId]) {
        await this.carregarTitulosApuracao(apuracaoId);
      }
    }
  }

  async carregarTitulosApuracao(apuracaoId: string) {
    this.carregandoTitulos.set(apuracaoId);
    try {
      const [titulos, lancamentosNibs] = await Promise.all([
        this.service.buscarTitulos(apuracaoId),
        this.service.buscarLancamentosNibs(),
      ]);
      this.titulosPorApuracao.update(m => ({ ...m, [apuracaoId]: titulos }));
      this.gerarSugestoes(titulos, lancamentosNibs);
    } catch {
      this.snack.open('Erro ao carregar títulos.', 'OK', { duration: 3000 });
    } finally {
      this.carregandoTitulos.set(null);
    }
  }

  private gerarSugestoes(
    titulos: TituloApuracao[],
    lancamentos: { id: string; valor: number; data_lancamento: string }[],
  ) {
    const novas: Record<string, SugestaoConciliacao> = { ...this.sugestoesConciliacao() };
    const TOLERANCIA = 0.01;
    const usados = new Set(Object.values(novas).map(s => s.lancamentoId));

    for (const t of titulos) {
      if (t.data_pagamento || t.lancamento_extrato_id || novas[t.id]) continue;

      const candidatos = lancamentos.filter(
        l => !usados.has(l.id) && Math.abs(l.valor - t.valor) <= TOLERANCIA,
      );
      if (candidatos.length === 0) continue;

      // Prefere o mais próximo ao vencimento
      const ref = t.data_vencimento ?? candidatos[0].data_lancamento;
      const melhor = candidatos.reduce((a, b) =>
        Math.abs(dateDiff(a.data_lancamento, ref)) <= Math.abs(dateDiff(b.data_lancamento, ref)) ? a : b,
      );
      novas[t.id] = { lancamentoId: melhor.id, dataLancamento: melhor.data_lancamento };
      usados.add(melhor.id);
    }
    this.sugestoesConciliacao.set(novas);
  }

  async confirmarConciliacao(apuracaoId: string, titulo: TituloApuracao, sugestao: SugestaoConciliacao) {
    this.conciliando.set(titulo.id);
    try {
      await this.service.conciliarTitulo(titulo.id, sugestao.lancamentoId, sugestao.dataLancamento);

      // Atualiza título localmente
      this.titulosPorApuracao.update(m => ({
        ...m,
        [apuracaoId]: m[apuracaoId].map(t =>
          t.id === titulo.id
            ? { ...t, data_pagamento: sugestao.dataLancamento, lancamento_extrato_id: sugestao.lancamentoId }
            : t,
        ),
      }));

      // Remove sugestão usada
      this.sugestoesConciliacao.update(m => {
        const copia = { ...m };
        delete copia[titulo.id];
        return copia;
      });
    } catch {
      this.snack.open('Erro ao conciliar pagamento.', 'OK', { duration: 3000 });
    } finally {
      this.conciliando.set(null);
    }
  }

  abrirAdicionarTitulo(apuracaoId: string) {
    this.editandoTituloId.set(null);
    this.novoTitulo.set({ codigo: '', descricao: '', categoria: 'outros', valorStr: '', vencimento: this.today });
    this.adicionandoTituloPara.set(apuracaoId);
  }

  cancelarAdicionarTitulo() {
    this.adicionandoTituloPara.set(null);
  }

  async salvarNovoTitulo(apuracaoId: string) {
    const dados = this.novoTitulo();
    const valor = this.parseMoeda(dados.valorStr);

    if (!dados.codigo.trim()) { this.snack.open('Informe o código do título.', 'OK', { duration: 3000 }); return; }
    if (valor <= 0) { this.snack.open('Informe o valor do título.', 'OK', { duration: 3000 }); return; }
    if (!dados.vencimento) { this.snack.open('Informe o vencimento do título.', 'OK', { duration: 3000 }); return; }

    this.salvandoTitulo.set(true);
    try {
      const titulo = await this.service.adicionarTitulo(apuracaoId, {
        codigo:          dados.codigo.trim(),
        descricao:       dados.descricao.trim(),
        categoria:       dados.categoria,
        valor,
        dataVencimento:  dados.vencimento,
      });
      this.titulosPorApuracao.update(m => ({ ...m, [apuracaoId]: [...(m[apuracaoId] ?? []), titulo] }));
      this.adicionandoTituloPara.set(null);
      this.snack.open('Título adicionado com sucesso!', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao adicionar título.', 'OK', { duration: 4000 });
    } finally {
      this.salvandoTitulo.set(false);
    }
  }

  iniciarEdicaoTitulo(t: TituloApuracao) {
    this.adicionandoTituloPara.set(null);
    this.edicaoTitulo.set({
      codigo:     t.codigo,
      descricao:  t.descricao ?? '',
      categoria:  t.categoria ?? 'outros',
      valorStr:   this.formatMoeda(t.valor),
      vencimento: t.data_vencimento ?? '',
    });
    this.editandoTituloId.set(t.id);
  }

  cancelarEdicaoTitulo() {
    this.editandoTituloId.set(null);
  }

  async salvarEdicaoTitulo(apuracaoId: string, tituloId: string) {
    const dados = this.edicaoTitulo();
    const valor = this.parseMoeda(dados.valorStr);

    if (!dados.codigo.trim()) { this.snack.open('Informe o código do título.', 'OK', { duration: 3000 }); return; }
    if (valor <= 0) { this.snack.open('Informe o valor do título.', 'OK', { duration: 3000 }); return; }
    if (!dados.vencimento) { this.snack.open('Informe o vencimento do título.', 'OK', { duration: 3000 }); return; }

    this.salvandoEdicaoTitulo.set(true);
    try {
      await this.service.editarTitulo(tituloId, {
        codigo:         dados.codigo.trim(),
        descricao:      dados.descricao.trim(),
        categoria:      dados.categoria,
        valor,
        dataVencimento: dados.vencimento,
      });
      this.titulosPorApuracao.update(m => ({
        ...m,
        [apuracaoId]: (m[apuracaoId] ?? []).map(t => t.id === tituloId
          ? { ...t, codigo: dados.codigo.trim(), descricao: dados.descricao.trim() || null, categoria: dados.categoria, valor, data_vencimento: dados.vencimento }
          : t),
      }));
      this.editandoTituloId.set(null);
      this.snack.open('Título atualizado com sucesso!', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao editar título.', 'OK', { duration: 4000 });
    } finally {
      this.salvandoEdicaoTitulo.set(false);
    }
  }

  async excluirTitulo(apuracaoId: string, titulo: TituloApuracao) {
    if (!confirm(`Confirma a exclusão do título "${titulo.codigo}"?`)) return;
    try {
      await this.service.excluirTitulo(titulo.id);
      this.titulosPorApuracao.update(m => ({
        ...m,
        [apuracaoId]: (m[apuracaoId] ?? []).filter(t => t.id !== titulo.id),
      }));
      this.snack.open('Título excluído.', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao excluir título.', 'OK', { duration: 4000 });
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

  temFppNota(p: PedidoApuracao): boolean {
    return p.itens.some(i => i.cobra_fpp && i.fpp > 0);
  }

  exportarCsv(): void {
    const p = this.preview();
    if (!p) return;

    const { ano, mes, quinzena } = this.selecionado;
    const mesPad = String(mes).padStart(2, '0');

    const fmt = (n: number) => n.toFixed(2).replace('.', ',');
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;

    const cabecalho = [
      'Código', 'NF', 'Tipo', 'Data Emissão', 'Alíquota Roy. (%)',
      'Descrição', 'Qtd',
      'Custo Unit.', 'Custo Total',
      'Venda Total', 'FPP', 'Base Roy.', 'Royalties',
    ];

    const linhas: string[][] = [];
    for (const pedido of p.pedidos) {
      const tipo = pedido.tipo === 'linha' ? 'Linha' : 'Sazonal';
      const aliquota = fmt(pedido.aliquota_royalties * 100);
      for (const item of pedido.itens) {
        linhas.push([
          pedido.codigo ?? '',
          pedido.numero_nf ?? 'S/NF',
          tipo,
          pedido.data_emissao,
          aliquota,
          item.descricao,
          String(item.quantidade),
          item.custo_unitario != null ? fmt(item.custo_unitario) : '',
          item.custo_total    != null ? fmt(item.custo_total)    : '',
          item.sem_ean ? '' : fmt(item.preco_total_venda),
          item.sem_ean ? '' : (!item.cobra_fpp       ? 'Isento' : fmt(item.fpp)),
          item.sem_ean ? '' : (!item.cobra_royalties  ? 'Isento' : fmt(item.base_royalties)),
          item.sem_ean ? '' : (!item.cobra_royalties  ? 'Isento' : fmt(item.royalties)),
        ]);
      }
    }

    const csvRows = [cabecalho, ...linhas]
      .map(row => row.map(esc).join(';'))
      .join('\r\n');

    const blob = new Blob(['﻿' + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `apuracao-crm-${ano}${mesPad}-q${quinzena}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  royaltiesPorAliquota(): { label: string; valor: number }[] {
    const p = this.preview();
    if (!p) return [];
    const grupos = new Map<string, number>();
    for (const pedido of p.pedidos) {
      const pct = pedido.aliquota_royalties * 100;
      const tipo = pedido.tipo === 'linha' ? 'Linha' : 'Sazonal';
      const key = `${tipo}|${pct}`;
      const total = pedido.itens.reduce((s, i) => s + i.royalties, 0);
      grupos.set(key, (grupos.get(key) ?? 0) + total);
    }
    return Array.from(grupos.entries())
      .filter(([, valor]) => valor > 0)
      .map(([key, valor]) => {
        const [tipo, pct] = key.split('|');
        const pctNum = parseFloat(pct);
        const pctStr = Number.isInteger(pctNum) ? `${pctNum}%` : `${pctNum.toLocaleString('pt-BR')}%`;
        return { label: `Royalties ${tipo} (${pctStr})`, valor };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
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

  async resolverMultiMatch(item: ItemMultiMatch, candidato: { ean: string; descricao: string; codigo_sap: string }) {
    if (this.resolvendoMulti()) return;
    this.resolvendoMulti.set(true);
    try {
      await this.service.aplicarMatchById(item.item_pedido_id, candidato.ean);
      const resultado = this.resultadoRecon();
      if (resultado) {
        this.resultadoRecon.set({
          ...resultado,
          multiMatch: resultado.multiMatch.filter(m => m.item_pedido_id !== item.item_pedido_id),
          reconciliados: [...resultado.reconciliados, {
            item_pedido_id:    item.item_pedido_id,
            descricao_pedido:  item.descricao_pedido ?? '',
            descricao_produto: candidato.descricao,
            ean:               candidato.ean,
            estrategia:        'c_prod',
          }],
        });
      }
      this.snack.open('EAN aplicado com sucesso.', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao aplicar EAN.', 'OK', { duration: 4000 });
    } finally {
      this.resolvendoMulti.set(false);
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
      const count = await this.service.aplicarMatchManual(item.descricao, produto.ean, item.c_prod);
      this.snack.open(`${count} item(ns) atualizado(s) com EAN.`, 'OK', { duration: 4000 });
      const resultado = this.resultadoRecon();
      if (resultado) {
        this.resultadoRecon.set({
          ...resultado,
          semMatch: resultado.semMatch.filter(s =>
            item.c_prod ? s.c_prod !== item.c_prod : s.descricao !== item.descricao
          ),
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

  vencimentoPreview(): string {
    const { ano, mes, quinzena } = this.selecionado;
    const { fim } = this.service.intervalo(ano, mes, quinzena);
    return this.service.vencimentoFpp(fim);
  }
}

function dateDiff(a: string, b: string): number {
  return (new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
}
