import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TitulosService } from '../../services/titulos.service';

@Component({
  selector: 'app-titulo-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Novo Título</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-col">
        <mat-form-field appearance="outline">
          <mat-label>Código</mat-label>
          <input matInput formControlName="codigo" placeholder="86001840/002"
                 maxlength="12" (input)="aplicarMascara($event)" />
          <mat-hint>XXXXXXXX/XXX — 8 dígitos barra número da parcela</mat-hint>
          @if (form.get('codigo')?.hasError('pattern')) {
            <mat-error>Formato inválido. Use XXXXXXXX/XXX.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Data de Vencimento</mat-label>
          <input matInput type="date" formControlName="data_vencimento" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Data de Pagamento</mat-label>
          <input matInput type="date" formControlName="data_pagamento" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Valor (R$)</mat-label>
          <input matInput type="number" formControlName="valor" min="0" step="0.01" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary"
              [disabled]="form.invalid || salvando()" (click)="salvar()">
        @if (salvando()) { <mat-spinner diameter="18" /> } @else { Salvar }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-col {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 340px;
      padding-top: 8px;
    }
  `],
})
export class TituloDialogComponent {
  readonly data = inject<{ pedidoId: string }>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<TituloDialogComponent>);
  private service   = inject(TitulosService);
  private snack     = inject(MatSnackBar);
  salvando = signal(false);

  form = inject(FormBuilder).group({
    codigo:          ['', [Validators.required, Validators.pattern(/^\d{8}\/\d{3}$/)]],
    data_vencimento: [''],
    data_pagamento:  [''],
    valor:           [null as number | null, Validators.required],
  });

  aplicarMascara(event: Event) {
    const input = event.target as HTMLInputElement;
    let v = input.value.replace(/\D/g, '').substring(0, 11);
    if (v.length > 8) v = v.substring(0, 8) + '/' + v.substring(8);
    this.form.get('codigo')!.setValue(v, { emitEvent: false });
    input.value = v;
  }

  async salvar() {
    if (this.form.invalid) return;
    this.salvando.set(true);
    try {
      const v = this.form.value;
      await this.service.salvar({
        pedido_id:       this.data.pedidoId,
        codigo:          v.codigo!,
        data_vencimento: v.data_vencimento || null,
        data_pagamento:  v.data_pagamento  || null,
        valor:           v.valor!,
      });
      this.dialogRef.close(true);
    } catch {
      this.snack.open('Erro ao salvar título.', 'OK', { duration: 4000 });
    } finally {
      this.salvando.set(false);
    }
  }
}
