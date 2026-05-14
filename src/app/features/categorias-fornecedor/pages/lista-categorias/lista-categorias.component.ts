import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { CategoriasFornecedorService } from '../../services/categorias-fornecedor.service';
import { CategoriaFornecedor } from '../../models/categoria-fornecedor.model';

@Component({
  selector: 'app-lista-categorias-fornecedor',
  standalone: true,
  imports: [
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Categorias de Fornecedor</h1>
      </div>

      @if (carregando()) {
        <div class="loading">
          <mat-spinner diameter="40" />
        </div>
      } @else {
        <mat-card class="add-card">
          <div class="add-row">
            <mat-form-field appearance="outline" class="nome-field">
              <mat-label>Nome da categoria</mat-label>
              <input matInput [(ngModel)]="novoNome" (keydown.enter)="salvarNova()"
                     placeholder="Ex: Insumos, Embalagens, Serviços..." />
            </mat-form-field>
            <button mat-flat-button color="primary"
                    [disabled]="!novoNome.trim() || salvando()"
                    (click)="salvarNova()">
              <mat-icon>add</mat-icon> Adicionar
            </button>
          </div>
        </mat-card>

        <mat-card>
          <table mat-table [dataSource]="categorias()" class="full-table">
            <ng-container matColumnDef="nome">
              <th mat-header-cell *matHeaderCellDef>Nome</th>
              <td mat-cell *matCellDef="let c">
                @if (editandoId() === c.id) {
                  <input class="edit-input" [(ngModel)]="editandoNome"
                         (keydown.enter)="confirmarEdicao(c)"
                         (keydown.escape)="cancelarEdicao()" />
                } @else {
                  {{ c.nome }}
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let c" class="acoes-cell">
                @if (editandoId() === c.id) {
                  <button mat-icon-button color="primary"
                          [disabled]="!editandoNome.trim()"
                          (click)="confirmarEdicao(c)" title="Confirmar">
                    <mat-icon>check</mat-icon>
                  </button>
                  <button mat-icon-button (click)="cancelarEdicao()" title="Cancelar">
                    <mat-icon>close</mat-icon>
                  </button>
                } @else {
                  <button mat-icon-button (click)="iniciarEdicao(c)" title="Editar">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="excluir(c.id)" title="Excluir">
                    <mat-icon>delete</mat-icon>
                  </button>
                }
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="colunas"></tr>
            <tr mat-row *matRowDef="let row; columns: colunas;"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell empty-state" colspan="2">
                Nenhuma categoria cadastrada ainda.
              </td>
            </tr>
          </table>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 640px; }
    .page-header { display: flex; align-items: center; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 22px; font-weight: 600; }
    .loading { display: flex; justify-content: center; padding: 48px 0; }
    .full-table { width: 100%; }
    .add-card { margin-bottom: 16px; padding: 16px; }
    .add-row {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .nome-field { flex: 1; }
    .acoes-cell { white-space: nowrap; text-align: right; width: 88px; }
    .empty-state { text-align: center; padding: 24px; color: #888; }
    .edit-input {
      width: 100%;
      height: 32px;
      padding: 0 8px;
      border: 1px solid #90282a;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
    }
  `],
})
export class ListaCategoriasComponent implements OnInit {
  private service = inject(CategoriasFornecedorService);
  private snack   = inject(MatSnackBar);

  categorias  = signal<CategoriaFornecedor[]>([]);
  carregando  = signal(false);
  salvando    = signal(false);
  editandoId  = signal<string | null>(null);
  editandoNome = '';
  novoNome     = '';
  colunas      = ['nome', 'acoes'];

  async ngOnInit() {
    await this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      this.categorias.set(await this.service.listar());
    } finally {
      this.carregando.set(false);
    }
  }

  async salvarNova() {
    const nome = this.novoNome.trim();
    if (!nome) return;
    this.salvando.set(true);
    try {
      await this.service.salvar({ nome });
      this.novoNome = '';
      await this.carregar();
      this.snack.open('Categoria adicionada.', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao salvar categoria.', 'OK', { duration: 4000 });
    } finally {
      this.salvando.set(false);
    }
  }

  iniciarEdicao(c: CategoriaFornecedor) {
    this.editandoId.set(c.id);
    this.editandoNome = c.nome;
  }

  cancelarEdicao() {
    this.editandoId.set(null);
    this.editandoNome = '';
  }

  async confirmarEdicao(c: CategoriaFornecedor) {
    const nome = this.editandoNome.trim();
    if (!nome || nome === c.nome) { this.cancelarEdicao(); return; }
    try {
      await this.service.atualizar(c.id, { nome });
      this.categorias.update(list => list.map(x => x.id === c.id ? { ...x, nome } : x));
      this.cancelarEdicao();
      this.snack.open('Categoria atualizada.', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao atualizar.', 'OK', { duration: 4000 });
    }
  }

  async excluir(id: string) {
    if (!confirm('Confirma a exclusão desta categoria?')) return;
    try {
      await this.service.excluir(id);
      this.categorias.update(list => list.filter(c => c.id !== id));
      this.snack.open('Categoria removida.', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao excluir. Verifique se há fornecedores usando esta categoria.', 'OK', { duration: 5000 });
    }
  }
}
