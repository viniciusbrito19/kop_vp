import { Component, inject, Inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TiposPedidoService } from '../../services/tipos-pedido.service';
import { TipoPedido } from '../../models/tipo-pedido.model';

@Component({
  selector: 'app-tipo-pedido-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar' : 'Novo' }} Tipo de Pedido</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="nome" placeholder="Ex.: Produtos de linha" />
          @if (form.get('nome')?.hasError('required')) {
            <mat-error>Nome é obrigatório</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || salvando" (click)="salvar()">
        @if (salvando) { <mat-spinner diameter="18" /> } @else { Salvar }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { padding-top: 8px; }
    .full-width { width: 100%; }
    mat-dialog-content { min-width: 320px; }
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
