import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FornecedoresService } from '../../services/fornecedores.service';
import { Fornecedor } from '../../models/fornecedor.model';
import { FornecedorDialogComponent } from './fornecedor-dialog.component';

@Component({
  selector: 'app-lista-fornecedores',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './lista-fornecedores.component.html',
  styleUrl: './lista-fornecedores.component.scss',
})
export class ListaFornecedoresComponent implements OnInit {
  private service = inject(FornecedoresService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  fornecedores = signal<Fornecedor[]>([]);
  carregando = signal(false);
  busca = signal('');

  fornecedoresFiltrados = computed(() => {
    const q = this.busca().toLowerCase().trim();
    if (!q) return this.fornecedores();
    return this.fornecedores().filter(f =>
      f.nome.toLowerCase().includes(q) ||
      (f.cnpj ?? '').toLowerCase().includes(q) ||
      (f.categoria_fornecedor?.nome ?? '').toLowerCase().includes(q) ||
      (f.chaves ?? []).some(c => c.chave.toLowerCase().includes(q))
    );
  });

  async ngOnInit() {
    await this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      this.fornecedores.set(await this.service.listar());
    } finally {
      this.carregando.set(false);
    }
  }

  abrirDialog(fornecedor?: Fornecedor) {
    const ref = this.dialog.open(FornecedorDialogComponent, {
      width: '480px',
      panelClass: 'kop-dialog',
      data: fornecedor ?? null,
    });
    ref.afterClosed().subscribe(async (salvo) => {
      if (salvo) {
        await this.carregar();
        this.snack.open('Fornecedor salvo com sucesso!', 'OK', { duration: 3000 });
      }
    });
  }

  async excluir(id: string) {
    if (!confirm('Confirma a exclusão deste fornecedor?')) return;
    try {
      await this.service.excluir(id);
      await this.carregar();
      this.snack.open('Fornecedor removido.', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao excluir fornecedor.', 'OK', { duration: 4000 });
    }
  }
}
