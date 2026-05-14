import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DespesasService } from '../../services/despesas.service';
import { FornecedoresService } from '../../../fornecedores/services/fornecedores.service';
import { Fornecedor } from '../../../fornecedores/models/fornecedor.model';
import { DespesaRecorrente } from '../../models/despesa.model';

@Component({
  selector: 'app-template-despesa-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar' : 'Novo' }} Template</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descrição</mat-label>
          <input matInput formControlName="descricao" />
          @if (form.get('descricao')?.hasError('required')) {
            <mat-error>Obrigatório</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Fornecedor</mat-label>
          <mat-select formControlName="fornecedor_id">
            <mat-option [value]="null">— nenhum —</mat-option>
            @for (f of fornecedores(); track f.id) {
              <mat-option [value]="f.id">{{ f.nome }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Valor estimado (R$)</mat-label>
            <input matInput type="number" formControlName="valor_estimado" min="0" step="0.01" />
            @if (form.get('valor_estimado')?.hasError('required')) {
              <mat-error>Obrigatório</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Dia do vencimento</mat-label>
            <input matInput type="number" formControlName="dia_venc" min="1" max="31" />
            @if (form.get('dia_venc')?.hasError('required')) {
              <mat-error>Obrigatório</mat-error>
            }
          </mat-form-field>
        </div>

        <mat-checkbox formControlName="ativo">Ativo</mat-checkbox>
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
    .dialog-form { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
    .full-width  { width: 100%; }
    .row-2       { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    mat-dialog-content { min-width: 420px; }
  `],
})
export class TemplateDespesaDialogComponent {
  readonly data = inject<DespesaRecorrente | null>(MAT_DIALOG_DATA);
  private dialogRef  = inject(MatDialogRef<TemplateDespesaDialogComponent>);
  private svc        = inject(DespesasService);
  private fornSvc    = inject(FornecedoresService);
  private snack      = inject(MatSnackBar);

  salvando     = signal(false);
  fornecedores = signal<Fornecedor[]>([]);

  form = inject(FormBuilder).group({
    descricao:     [this.data?.descricao      ?? '',   Validators.required],
    fornecedor_id: [this.data?.fornecedor_id  ?? null],
    valor_estimado:[this.data?.valor_estimado ?? null, Validators.required],
    dia_venc:      [this.data?.dia_venc       ?? null, Validators.required],
    ativo:         [this.data?.ativo ?? true],
  });

  constructor() {
    this.fornSvc.listar().then(lista => this.fornecedores.set(lista));
  }

  async salvar() {
    if (this.form.invalid) return;
    this.salvando.set(true);
    try {
      const v = this.form.value as any;
      const payload = { ...v, fornecedor_id: v.fornecedor_id || null, categoria: null };
      if (this.data) {
        await this.svc.atualizarTemplate(this.data.id, payload);
      } else {
        await this.svc.salvarTemplate(payload);
      }
      this.dialogRef.close(true);
    } catch {
      this.snack.open('Erro ao salvar template.', 'OK', { duration: 4000 });
    } finally {
      this.salvando.set(false);
    }
  }
}
