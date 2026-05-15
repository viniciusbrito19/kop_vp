import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TiposPedidoService } from '../../services/tipos-pedido.service';
import { TipoPedido } from '../../models/tipo-pedido.model';
import { TipoPedidoDialogComponent } from './tipo-pedido-dialog.component';

@Component({
  selector: 'app-lista-tipos-pedido',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './lista-tipos-pedido.component.html',
  styleUrl: './lista-tipos-pedido.component.scss',
})
export class ListaTiposPedidoComponent implements OnInit {
  private service = inject(TiposPedidoService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  tipos = signal<TipoPedido[]>([]);
  carregando = signal(false);
  busca = signal('');

  tiposFiltrados = computed(() => {
    const q = this.busca().toLowerCase().trim();
    if (!q) return this.tipos();
    return this.tipos().filter(t => t.nome.toLowerCase().includes(q));
  });

  async ngOnInit() {
    await this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      this.tipos.set(await this.service.listar());
    } finally {
      this.carregando.set(false);
    }
  }

  abrirDialog(tipo?: TipoPedido) {
    const ref = this.dialog.open(TipoPedidoDialogComponent, {
      width: '400px',
      panelClass: 'kop-dialog',
      data: tipo ?? null,
    });
    ref.afterClosed().subscribe(async (salvo) => {
      if (salvo) {
        await this.carregar();
        this.snack.open('Tipo salvo com sucesso!', 'OK', { duration: 3000 });
      }
    });
  }

  async alternarAtivo(tipo: TipoPedido) {
    await this.service.atualizar(tipo.id, { ativo: !tipo.ativo });
    await this.carregar();
  }

  async excluir(id: string) {
    if (!confirm('Confirma a exclusão deste tipo de pedido?')) return;
    try {
      await this.service.excluir(id);
      await this.carregar();
      this.snack.open('Tipo removido.', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao excluir. Verifique se não há pedidos vinculados.', 'OK', { duration: 4000 });
    }
  }
}
