import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { TiposPedidoService } from '../../services/tipos-pedido.service';
import { TipoPedido } from '../../models/tipo-pedido.model';

@Component({
  selector: 'app-tipo-pedido-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar' : 'Novo' }} Tipo de Pedido</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <label class="input">
          <span>Nome</span>
          <input formControlName="nome" placeholder="Ex.: Produtos de linha" />
          @if (form.get('nome')?.invalid && form.get('nome')?.touched) {
            <span class="hint" style="color:var(--bad)">Nome é obrigatório</span>
          }
        </label>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="btn outline sm" mat-dialog-close>Cancelar</button>
      <button class="btn primary sm" [disabled]="form.invalid || salvando" (click)="salvar()">
        @if (salvando) {
          <svg class="spin-ring-sm" width="16" height="16" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
            <path d="M18 3 A15 15 0 0 1 33 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
          </svg>
        } @else {
          Salvar
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { padding-top: 8px; }
    .spin-ring-sm { animation: spin 0.9s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class TipoPedidoDialogComponent {
  private fb = inject(FormBuilder);
  private service = inject(TiposPedidoService);
  private dialogRef = inject(MatDialogRef<TipoPedidoDialogComponent>);
  readonly data = inject<TipoPedido | null>(MAT_DIALOG_DATA);

  salvando = false;

  form = this.fb.group({
    nome: [this.data?.nome ?? '', Validators.required],
  });

  async salvar() {
    if (this.form.invalid) return;
    this.salvando = true;
    try {
      const nome = this.form.value.nome as string;
      if (this.data) {
        await this.service.atualizar(this.data.id, { nome });
      } else {
        await this.service.salvar({ nome, ativo: true });
      }
      this.dialogRef.close(true);
    } finally {
      this.salvando = false;
    }
  }
}
