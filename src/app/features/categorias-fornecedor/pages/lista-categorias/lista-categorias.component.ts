import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CategoriasFornecedorService } from '../../services/categorias-fornecedor.service';
import { CategoriaFornecedor } from '../../models/categoria-fornecedor.model';

@Component({
  selector: 'app-lista-categorias-fornecedor',
  standalone: true,
  imports: [
    FormsModule,
    MatSnackBarModule,
  ],
  template: `
    <!-- ===== Topbar ===== -->
    <header class="topbar">
      <div class="crumbs row gap-2">
        <span>Configurações</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>
        <b>Categorias de Fornecedor</b>
      </div>
      <div class="spacer"></div>
      <div class="field" style="width:240px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input [ngModel]="busca()" (ngModelChange)="busca.set($event)" placeholder="Buscar categoria…" />
      </div>
    </header>

    <!-- ===== Content ===== -->
    <div class="content">

      <!-- Page heading -->
      <div style="margin-bottom:28px">
        <h1 class="page">Categorias de <span class="accent serif">fornecedor</span></h1>
        <div class="page-sub">{{ categoriasFiltradas().length }} categoria{{ categoriasFiltradas().length !== 1 ? 's' : '' }} cadastrada{{ categoriasFiltradas().length !== 1 ? 's' : '' }}</div>
      </div>

      <!-- Add form -->
      <div class="add-form">
        <div class="field" style="flex:1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          <input [(ngModel)]="novoNome" (keydown.enter)="salvarNova()"
                 placeholder="Ex: Insumos, Embalagens, Serviços…" />
        </div>
        <button class="btn primary" [disabled]="!novoNome.trim() || salvando()" (click)="salvarNova()">
          @if (salvando()) {
            <svg class="spin-ring" width="16" height="16" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
              <path d="M18 3 A15 15 0 0 1 33 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
            </svg>
          } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Adicionar
          }
        </button>
      </div>

      <!-- Loading state -->
      @if (carregando()) {
        <div class="load-wrap">
          <svg class="spin-ring" width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="15" stroke="var(--line-2)" stroke-width="3"/>
            <path d="M18 3 A15 15 0 0 1 33 18" stroke="var(--bordo)" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>

      } @else if (!categoriasFiltradas().length) {
        <div class="empty-wrap">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          @if (busca()) {
            <p>Nenhuma categoria encontrada para "<b>{{ busca() }}</b>".</p>
          } @else {
            <p>Nenhuma categoria cadastrada ainda.</p>
            <p class="hint-text">Use o campo acima para adicionar a primeira categoria.</p>
          }
        </div>

      } @else {
        <div class="list">
          <div class="list-head cat-grid">
            <span>Nome</span>
            <span></span>
          </div>

          @for (c of categoriasFiltradas(); track c.id) {
            <div class="row-card" [class.editing]="editandoId() === c.id">
              <div class="row-main cat-grid">

                @if (editandoId() === c.id) {
                  <input class="inline-edit" [(ngModel)]="editandoNome"
                         (keydown.enter)="confirmarEdicao(c)"
                         (keydown.escape)="cancelarEdicao()"
                         autofocus />
                } @else {
                  <span class="cat-name">{{ c.nome }}</span>
                }

                <div class="row-actions-cell">
                  @if (editandoId() === c.id) {
                    <button class="btn ghost icon sm ok-btn"
                            [disabled]="!editandoNome.trim()"
                            (click)="confirmarEdicao(c)" title="Confirmar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </button>
                    <button class="btn ghost icon sm" (click)="cancelarEdicao()" title="Cancelar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  } @else {
                    <button class="btn ghost icon sm" (click)="iniciarEdicao(c)" title="Editar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button class="btn ghost icon sm del-btn" (click)="excluir(c.id)" title="Excluir">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  }
                </div>

              </div>
            </div>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .add-form {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 20px;
    }

    .cat-grid {
      grid-template-columns: 1fr 80px;
    }

    .row-main.cat-grid {
      cursor: default;
    }

    .row-card.editing {
      border-color: var(--bordo);
      box-shadow: var(--shadow-sm);
    }

    .cat-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text);
    }

    .inline-edit {
      width: 100%;
      height: 34px;
      padding: 0 10px;
      border: 1.5px solid var(--bordo);
      border-radius: var(--r-sm);
      font-size: 14px;
      font-family: inherit;
      color: var(--text);
      background: var(--surface);
      outline: none;
      box-shadow: 0 0 0 3px var(--bordo-tint);
    }

    .row-actions-cell {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }

    .ok-btn {
      color: var(--ok);
      &:hover { background: var(--ok-soft) !important; }
    }

    .del-btn {
      color: var(--bad);
      &:hover { background: var(--bad-soft) !important; }
    }

    .load-wrap {
      display: flex;
      justify-content: center;
      padding: 64px;
    }

    .spin-ring {
      animation: spin 0.9s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 64px;
      color: var(--text-3);

      p { margin: 0; font-size: 14px; }
      .hint-text { color: var(--text-4); font-size: 13px; }
    }
  `],
})
export class ListaCategoriasComponent implements OnInit {
  private service = inject(CategoriasFornecedorService);
  private snack   = inject(MatSnackBar);

  categorias   = signal<CategoriaFornecedor[]>([]);
  carregando   = signal(false);
  salvando     = signal(false);
  editandoId   = signal<string | null>(null);
  busca        = signal('');
  editandoNome = '';
  novoNome     = '';

  categoriasFiltradas = computed(() => {
    const q = this.busca().toLowerCase().trim();
    if (!q) return this.categorias();
    return this.categorias().filter(c => c.nome.toLowerCase().includes(q));
  });

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
