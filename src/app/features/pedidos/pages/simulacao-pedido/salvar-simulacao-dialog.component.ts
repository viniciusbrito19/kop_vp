import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-salvar-simulacao-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, A11yModule],
  template: `
    <h2 mat-dialog-title>Salvar simulação</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-col">
        <mat-form-field appearance="outline">
          <mat-label>Nome da simulação</mat-label>
          <input matInput formControlName="nome" placeholder="Ex.: Pedido Kop Club — julho" cdkFocusInitial />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="confirmar()">Salvar</button>
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
export class SalvarSimulacaoDialogComponent {
  readonly data = inject<{ nomeAtual: string | null }>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<SalvarSimulacaoDialogComponent>);

  form = inject(FormBuilder).group({
    nome: [this.data.nomeAtual ?? '', Validators.required],
  });

  confirmar() {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value.nome!.trim());
  }
}
