import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { SimulacoesPedidoService } from '../../services/simulacoes-pedido.service';
import { SimulacaoPedidoResumo } from '../../models/simulacao-pedido.model';

@Component({
  selector: 'app-abrir-simulacao-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Simulações salvas</h2>

    <mat-dialog-content>
      @if (lista().length === 0) {
        <p class="vazio">Nenhuma simulação salva ainda.</p>
      } @else {
        <div class="lista">
          @for (s of lista(); track s.id) {
            <div class="linha" [class.atual]="s.id === data.simulacaoIdAtual">
              <button type="button" class="abrir-btn" (click)="ref.close(s.id)">
                <span class="nome">{{ s.nome }}</span>
                <span class="data">Atualizada em {{ s.updated_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </button>
              <button type="button" class="excluir-btn" (click)="excluir(s)" title="Excluir simulação" [disabled]="excluindo() === s.id">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          }
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button class="btn ghost" mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .vazio {
      font-size: 13px;
      color: var(--text-4);
      text-align: center;
      padding: 24px 0;
    }

    .lista {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 380px;
      max-height: 360px;
      overflow-y: auto;
    }

    .linha {
      display: flex;
      align-items: center;
      gap: 4px;
      border-radius: var(--r-sm);
      transition: background 0.12s;

      &:hover { background: var(--surface-2); }
      &.atual { background: var(--bordo-tint); }
    }

    .abrir-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      padding: 10px 12px;
      border: 0;
      background: transparent;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
    }
    .nome { font-size: 14px; font-weight: 600; color: var(--text); }
    .data { font-size: 11px; color: var(--text-4); }

    .excluir-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      margin-right: 6px;
      border: 0;
      border-radius: var(--r-sm);
      background: transparent;
      color: var(--text-4);
      cursor: pointer;
      transition: background 0.12s, color 0.12s;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover:not(:disabled) { background: var(--bad-soft); color: var(--bad); }
      &:disabled { opacity: 0.5; cursor: default; }
    }
  `],
})
export class AbrirSimulacaoDialogComponent {
  readonly data = inject<{ simulacoes: SimulacaoPedidoResumo[]; simulacaoIdAtual: string | null }>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<AbrirSimulacaoDialogComponent>);
  private service = inject(SimulacoesPedidoService);

  lista = signal<SimulacaoPedidoResumo[]>(this.data.simulacoes);
  excluindo = signal<string | null>(null);

  async excluir(s: SimulacaoPedidoResumo) {
    if (!confirm(`Excluir a simulação "${s.nome}"? Esta ação não pode ser desfeita.`)) return;
    this.excluindo.set(s.id);
    try {
      await this.service.excluir(s.id);
      this.lista.update(list => list.filter(x => x.id !== s.id));
    } finally {
      this.excluindo.set(null);
    }
  }
}
