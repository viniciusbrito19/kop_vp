import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FornecedoresService } from '../../services/fornecedores.service';
import { Fornecedor, FornecedorChave } from '../../models/fornecedor.model';
import { CategoriasFornecedorService } from '../../../categorias-fornecedor/services/categorias-fornecedor.service';
import { CategoriaFornecedor } from '../../../categorias-fornecedor/models/categoria-fornecedor.model';

@Component({
  selector: 'app-fornecedor-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
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

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Categoria</mat-label>
          <mat-select formControlName="categoria_fornecedor_id">
            <mat-option [value]="null">— não classificado —</mat-option>
            @for (c of categorias(); track c.id) {
              <mat-option [value]="c.id">{{ c.nome }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Chaves do extrato -->
        <div class="chaves-section">
          <span class="chaves-label">Chaves no extrato</span>

          <div class="chaves-lista">
            @for (chave of chavesAtuais(); track chave.id) {
              <div class="chave-item" [class.removida]="removidas().has(chave.id)">
                <code class="chave-texto">{{ chave.chave }}</code>
                @if (!removidas().has(chave.id)) {
                  <button mat-icon-button type="button" class="btn-remover"
                          (click)="marcarRemocao(chave.id)" title="Remover">
                    <mat-icon>close</mat-icon>
                  </button>
                } @else {
                  <button mat-icon-button type="button" class="btn-desfazer"
                          (click)="desfazerRemocao(chave.id)" title="Desfazer">
                    <mat-icon>undo</mat-icon>
                  </button>
                }
              </div>
            }
            @for (chave of novasChaves(); track chave) {
              <div class="chave-item chave-nova">
                <code class="chave-texto">{{ chave }}</code>
                <button mat-icon-button type="button" class="btn-remover"
                        (click)="removerNova(chave)" title="Cancelar">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            }
          </div>

          <div class="chave-input-row">
            <input class="chave-input" type="text" [(ngModel)]="novaChaveInput"
                   [ngModelOptions]="{standalone: true}"
                   placeholder="Ex: CEB, SABESP, LIMPEZA..."
                   (keydown.enter)="adicionarChave()" />
            <button mat-stroked-button type="button" (click)="adicionarChave()"
                    [disabled]="!novaChaveInput.trim()">
              Adicionar
            </button>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || salvando()" (click)="salvar()">
        @if (salvando()) { <mat-spinner diameter="18" /> } @else { Salvar }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form   { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
    .full-width    { width: 100%; }
    mat-dialog-content { min-width: 400px; }

    .chaves-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 12px;
    }

    .chaves-label {
      font-size: 12px;
      font-weight: 500;
      color: #555;
    }

    .chaves-lista {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-height: 8px;
    }

    .chave-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 2px 4px;
      border-radius: 4px;
      transition: opacity 0.2s;
    }

    .chave-item.removida {
      opacity: 0.4;
      text-decoration: line-through;
    }

    .chave-item.chave-nova .chave-texto {
      color: #1a7a37;
    }

    .chave-texto {
      flex: 1;
      background: #f3f4f6;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 13px;
    }

    .btn-remover  { color: #c0392b; width: 28px; height: 28px; }
    .btn-desfazer { color: #888;    width: 28px; height: 28px; }

    .chave-input-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .chave-input {
      flex: 1;
      height: 32px;
      padding: 0 10px;
      border: 1px solid #d4d4d4;
      border-radius: 5px;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      &:focus { border-color: #90282a; }
    }
  `],
})
export class FornecedorDialogComponent implements OnInit {
  private fb          = inject(FormBuilder);
  private service     = inject(FornecedoresService);
  private categoriasSvc = inject(CategoriasFornecedorService);
  private dialogRef   = inject(MatDialogRef<FornecedorDialogComponent>);
  readonly data       = inject<Fornecedor | null>(MAT_DIALOG_DATA);

  salvando   = signal(false);
  categorias = signal<CategoriaFornecedor[]>([]);

  chavesAtuais  = signal<FornecedorChave[]>(this.data?.chaves ?? []);
  removidas     = signal<Set<string>>(new Set());
  novasChaves   = signal<string[]>([]);
  novaChaveInput = '';

  form = this.fb.group({
    nome:                    [this.data?.nome                    ?? '', Validators.required],
    cnpj:                    [this.data?.cnpj                    ?? ''],
    categoria_fornecedor_id: [this.data?.categoria_fornecedor_id ?? null],
  });

  async ngOnInit() {
    this.categorias.set(await this.categoriasSvc.listar());
  }

  adicionarChave() {
    const chave = this.novaChaveInput.trim();
    if (!chave) return;
    const jaExiste =
      this.chavesAtuais().some(c => c.chave.toLowerCase() === chave.toLowerCase()) ||
      this.novasChaves().some(c => c.toLowerCase() === chave.toLowerCase());
    if (jaExiste) { this.novaChaveInput = ''; return; }
    this.novasChaves.update(list => [...list, chave]);
    this.novaChaveInput = '';
  }

  removerNova(chave: string) {
    this.novasChaves.update(list => list.filter(c => c !== chave));
  }

  marcarRemocao(id: string) {
    this.removidas.update(s => new Set([...s, id]));
  }

  desfazerRemocao(id: string) {
    this.removidas.update(s => { const n = new Set(s); n.delete(id); return n; });
  }

  async salvar() {
    if (this.form.invalid) return;
    this.salvando.set(true);
    try {
      const v = this.form.value as any;
      const payload = {
        nome: v.nome,
        cnpj: v.cnpj || null,
        categoria_fornecedor_id: v.categoria_fornecedor_id || null,
      };

      let fornecedorId: string;
      if (this.data) {
        await this.service.atualizar(this.data.id, payload);
        fornecedorId = this.data.id;
      } else {
        const novo = await this.service.salvar(payload);
        fornecedorId = novo.id;
      }

      await Promise.all([
        this.service.removerChaves([...this.removidas()]),
        this.service.adicionarChaves(fornecedorId, this.novasChaves()),
      ]);

      this.dialogRef.close(true);
    } finally {
      this.salvando.set(false);
    }
  }
}
