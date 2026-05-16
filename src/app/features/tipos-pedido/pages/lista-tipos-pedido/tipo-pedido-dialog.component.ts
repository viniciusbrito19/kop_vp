import { Component, inject, signal, effect } from '@angular/core';
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

        <label class="checkbox-row">
          <input type="checkbox" formControlName="incide_royalties" />
          <span>Incide Royalties / FPP</span>
        </label>

        @if (form.get('incide_royalties')?.value) {
          <label class="input">
            <span>Tipo de cobrança</span>
            <select formControlName="tipo_royalties">
              <option value="">Selecione…</option>
              <option value="linha">Produtos de Linha (37%)</option>
              <option value="sazonal">Sazonal — Páscoa, Natal, Datas (27,5%)</option>
            </select>
          </label>
        }
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
    .dialog-form { padding-top: 8px; display: flex; flex-direction: column; gap: 12px; }
    .checkbox-row { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; }
    .checkbox-row input[type=checkbox] { width: 16px; height: 16px; accent-color: var(--primary, #82622F); }
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
    incide_royalties: [this.data?.incide_royalties ?? false],
    tipo_royalties: [this.data?.tipo_royalties ?? null as 'linha' | 'sazonal' | null],
  });

  async salvar() {
    if (this.form.invalid) return;
    this.salvando = true;
    try {
      const v = this.form.value;
      const incide = !!v.incide_royalties;
      const formData = {
        nome: v.nome as string,
        ativo: this.data?.ativo ?? true,
        incide_royalties: incide,
        tipo_royalties: incide ? (v.tipo_royalties as 'linha' | 'sazonal' | null) : null,
      };
      if (this.data) {
        await this.service.atualizar(this.data.id, formData);
      } else {
        await this.service.salvar(formData);
      }
      this.dialogRef.close(true);
    } finally {
      this.salvando = false;
    }
  }
}
