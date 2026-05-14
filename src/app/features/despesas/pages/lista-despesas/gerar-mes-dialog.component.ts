import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DespesasService } from '../../services/despesas.service';
import { DespesaRecorrente } from '../../models/despesa.model';

const MESES = [
  { value: 1,  label: 'Janeiro' },
  { value: 2,  label: 'Fevereiro' },
  { value: 3,  label: 'Março' },
  { value: 4,  label: 'Abril' },
  { value: 5,  label: 'Maio' },
  { value: 6,  label: 'Junho' },
  { value: 7,  label: 'Julho' },
  { value: 8,  label: 'Agosto' },
  { value: 9,  label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

@Component({
  selector: 'app-gerar-mes-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Gerar Título — {{ data.descricao }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Mês</mat-label>
          <mat-select formControlName="mes">
            @for (m of meses; track m.value) {
              <mat-option [value]="m.value">{{ m.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Ano</mat-label>
          <input matInput type="number" formControlName="ano" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary"
              [disabled]="form.invalid || gerando()" (click)="gerar()">
        @if (gerando()) { <mat-spinner diameter="18" /> } @else { Gerar }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; gap: 12px; padding-top: 8px; }
    mat-dialog-content { min-width: 300px; }
  `],
})
export class GerarMesDialogComponent {
  readonly data = inject<DespesaRecorrente>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<GerarMesDialogComponent>);
  private svc       = inject(DespesasService);
  private snack     = inject(MatSnackBar);

  gerando = signal(false);
  meses   = MESES;

  form = inject(FormBuilder).group({
    mes: [new Date().getMonth() + 1, Validators.required],
    ano: [new Date().getFullYear(), Validators.required],
  });

  async gerar() {
    if (this.form.invalid) return;
    this.gerando.set(true);
    try {
      await this.svc.gerarMes(this.data.id, this.form.value.mes!, this.form.value.ano!);
      this.snack.open('Título gerado com sucesso.', 'OK', { duration: 4000 });
      this.dialogRef.close(true);
    } catch (err) {
      this.snack.open((err as Error).message || 'Erro ao gerar título.', 'OK', { duration: 5000 });
    } finally {
      this.gerando.set(false);
    }
  }
}
