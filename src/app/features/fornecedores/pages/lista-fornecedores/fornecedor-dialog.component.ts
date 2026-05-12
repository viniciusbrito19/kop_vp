import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FornecedoresService } from '../../services/fornecedores.service';
import { Fornecedor } from '../../models/fornecedor.model';

@Component({
  selector: 'app-fornecedor-dialog',
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
    <h2 mat-dialog-title>{{ data ? 'Editar' : 'Novo' }} Fornecedor</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="nome" />
          @if (form.get('nome')?.hasError('required')) {
            <mat-error>Nome é obrigatório</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>CNPJ</mat-label>
          <input matInput formControlName="cnpj" placeholder="00.000.000/0000-00" />
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
    .dialog-form { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
    .full-width { width: 100%; }
    mat-dialog-content { min-width: 360px; }
  `],
})
export class FornecedorDialogComponent {
  private fb = inject(FormBuilder);
  private service = inject(FornecedoresService);
  private dialogRef = inject(MatDialogRef<FornecedorDialogComponent>);
  readonly data = inject<Fornecedor | null>(MAT_DIALOG_DATA);

  salvando = false;

  form = this.fb.group({
    nome: [this.data?.nome ?? '', Validators.required],
    cnpj: [this.data?.cnpj ?? ''],
  });

  async salvar() {
    if (this.form.invalid) return;
    this.salvando = true;
    try {
      const valores = this.form.value as { nome: string; cnpj: string };
      if (this.data) {
        await this.service.atualizar(this.data.id, valores);
      } else {
        await this.service.salvar(valores);
      }
      this.dialogRef.close(true);
    } finally {
      this.salvando = false;
    }
  }
}
