import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { TiposPedidoService } from '../../services/tipos-pedido.service';
import { TipoPedido } from '../../models/tipo-pedido.model';
import { TipoPedidoDialogComponent } from './tipo-pedido-dialog.component';

@Component({
  selector: 'app-lista-tipos-pedido',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
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
  colunas = ['nome', 'ativo', 'acoes'];

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
