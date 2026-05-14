import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
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
  ],
  template: `
    <h2 mat-dialog-title class="dlg-title">{{ data ? 'Editar' : 'Novo' }} Fornecedor</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dlg-form">

        <label class="input">
          <span>Nome *</span>
          <input formControlName="nome" placeholder="Nome do fornecedor" />
          @if (form.get('nome')?.hasError('required') && form.get('nome')?.touched) {
            <span class="input-err">Nome é obrigatório</span>
          }
        </label>

        <label class="input">
          <span>CNPJ</span>
          <input formControlName="cnpj" placeholder="00.000.000/0000-00" />
        </label>

        <label class="input">
          <span>Categoria</span>
          <select formControlName="categoria_fornecedor_id">
            <option value="">— não classificado —</option>
            @for (c of categorias(); track c.id) {
              <option [value]="c.id">{{ c.nome }}</option>
            }
          </select>
        </label>

        <div class="chaves-section">
          <span class="chaves-label">Chaves no extrato</span>

          <div class="chaves-lista">
            @for (chave of chavesAtuais(); track chave.id) {
              <div class="chave-item" [class.removida]="removidas().has(chave.id)">
                <code class="chave-texto">{{ chave.chave }}</code>
                @if (!removidas().has(chave.id)) {
                  <button type="button" class="chave-btn del"
                          (click)="marcarRemocao(chave.id)" title="Remover">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                } @else {
                  <button type="button" class="chave-btn undo"
                          (click)="desfazerRemocao(chave.id)" title="Desfazer">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                  </button>
                }
              </div>
            }
            @for (chave of novasChaves(); track chave) {
              <div class="chave-item chave-nova">
                <code class="chave-texto">{{ chave }}</code>
                <button type="button" class="chave-btn del"
                        (click)="removerNova(chave)" title="Cancelar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            }
          </div>

          <div class="chave-input-row">
            <input class="chave-input" type="text" [(ngModel)]="novaChaveInput"
                   [ngModelOptions]="{standalone: true}"
                   placeholder="Ex: CEB, SABESP, LIMPEZA..."
                   (keydown.enter)="adicionarChave()" />
            <button type="button" class="btn outline sm" (click)="adicionarChave()"
                    [disabled]="!novaChaveInput.trim()">
              Adicionar
            </button>
          </div>
        </div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button class="btn ghost sm" mat-dialog-close>Cancelar</button>
      <button class="btn primary sm" [disabled]="form.invalid || salvando()" (click)="salvar()">
        @if (salvando()) {
          <svg class="btn-spin" width="14" height="14" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.35)" stroke-width="3"/>
            <path d="M18 3 A15 15 0 0 1 33 18" stroke="white" stroke-width="3" stroke-linecap="round"/>
          </svg>
        } @else { Salvar }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dlg-title {
      font-size: 17px !important;
      font-weight: 700 !important;
      letter-spacing: -0.01em;
      color: var(--text) !important;
      margin: 0 !important;
    }

    mat-dialog-content { min-width: 420px; padding-top: 16px !important; }
    mat-dialog-actions { padding: 12px 24px 20px !important; gap: 8px; }

    .dlg-form { display: flex; flex-direction: column; gap: 14px; }
    .input-err { font-size: 11px; color: var(--bad); margin-top: 2px; }

    .chaves-section {
      display: flex; flex-direction: column; gap: 10px;
      background: var(--surface-2);
      border: 1px solid var(--line);
      border-radius: var(--r-sm);
      padding: 14px;
    }
    .chaves-label {
      font-size: 11px; font-weight: 600; color: var(--text-3);
      text-transform: uppercase; letter-spacing: 0.08em;
    }
    .chaves-lista { display: flex; flex-direction: column; gap: 4px; min-height: 8px; }

    .chave-item {
      display: flex; align-items: center; gap: 8px;
      padding: 5px 8px; border-radius: var(--r-xs);
      background: var(--surface); border: 1px solid var(--line);
      transition: opacity 0.2s;
    }
    .chave-item.removida { opacity: 0.4; text-decoration: line-through; }
    .chave-item.chave-nova .chave-texto { color: var(--ok); }

    .chave-texto {
      flex: 1; font-family: 'JetBrains Mono', monospace;
      font-size: 12px; color: var(--text-2);
    }

    .chave-btn {
      width: 22px; height: 22px; border-radius: 4px; border: 0; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      background: transparent; transition: background 0.12s;
    }
    .chave-btn.del  { color: var(--bad); }
    .chave-btn.del:hover  { background: var(--bad-soft); }
    .chave-btn.undo { color: var(--text-3); }
    .chave-btn.undo:hover { background: var(--surface-3); }

    .chave-input-row { display: flex; gap: 8px; align-items: center; }
    .chave-input {
      flex: 1; height: 36px; padding: 0 12px;
      border: 1px solid var(--line); border-radius: var(--r-xs);
      font-size: 13px; font-family: inherit;
      background: var(--surface); color: var(--text); outline: none;
    }
    .chave-input:focus { border-color: var(--bordo); box-shadow: 0 0 0 3px var(--bordo-tint); }
    .chave-input::placeholder { color: var(--text-4); }

    .btn-spin { animation: spin 0.9s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class FornecedorDialogComponent implements OnInit {
  private fb            = inject(FormBuilder);
  private service       = inject(FornecedoresService);
  private categoriasSvc = inject(CategoriasFornecedorService);
  private dialogRef     = inject(MatDialogRef<FornecedorDialogComponent>);
  readonly data         = inject<Fornecedor | null>(MAT_DIALOG_DATA);

  salvando   = signal(false);
  categorias = signal<CategoriaFornecedor[]>([]);

  chavesAtuais   = signal<FornecedorChave[]>(this.data?.chaves ?? []);
  removidas      = signal<Set<string>>(new Set());
  novasChaves    = signal<string[]>([]);
  novaChaveInput = '';

  form = this.fb.group({
    nome:                    [this.data?.nome                    ?? '', Validators.required],
    cnpj:                    [this.data?.cnpj                    ?? ''],
    categoria_fornecedor_id: [this.data?.categoria_fornecedor_id ?? ''],
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
