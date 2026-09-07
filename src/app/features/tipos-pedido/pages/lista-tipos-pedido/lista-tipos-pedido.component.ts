import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TiposPedidoService } from '../../services/tipos-pedido.service';
import { TipoPedido, PERCENTUAL_ROYALTIES_PADRAO } from '../../models/tipo-pedido.model';
import { TipoPedidoDialogComponent } from './tipo-pedido-dialog.component';
import { PageHeaderService } from '../../../../core/services/page-header.service';

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
  private pageHeader = inject(PageHeaderService);

  tipos = signal<TipoPedido[]>([]);
  carregando = signal(false);
  busca = signal('');

  tiposFiltrados = computed(() => {
    const q = this.busca().toLowerCase().trim();
    if (!q) return this.tipos();
    return this.tipos().filter(t => t.nome.toLowerCase().includes(q));
  });

  constructor() {
    effect(() => {
      const n = this.tiposFiltrados().length;
      this.pageHeader.setSubtitle(`${n} tipo${n !== 1 ? 's' : ''} cadastrado${n !== 1 ? 's' : ''}`);
    });
  }

  /**
   * Rótulo da badge de royalties: tipo + percentual efetivamente cobrado para aquele tipo de pedido,
   * caindo no percentual padrão do tipo quando ele não define um próprio.
   */
  labelRoyalties(t: TipoPedido): string {
    const tipo = t.tipo_royalties === 'linha' ? 'linha' : 'sazonal';
    const pct  = t.percentual_royalties ?? PERCENTUAL_ROYALTIES_PADRAO[tipo];
    const nome = tipo === 'linha' ? 'Linha' : 'Sazonal';
    return `${nome} ${pct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
  }

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
