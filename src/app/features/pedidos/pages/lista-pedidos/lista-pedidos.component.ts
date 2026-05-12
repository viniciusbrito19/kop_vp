import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { lastValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PedidosService } from '../../services/pedidos.service';
import { TitulosService } from '../../services/titulos.service';
import { Pedido } from '../../models/pedido.model';
import { Titulo } from '../../models/titulo.model';
import { TituloDialogComponent } from './titulo-dialog.component';

@Component({
  selector: 'app-lista-pedidos',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    CurrencyPipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
  ],
  templateUrl: './lista-pedidos.component.html',
  styleUrl: './lista-pedidos.component.scss',
})
export class ListaPedidosComponent implements OnInit {
  private service        = inject(PedidosService);
  private titulosSvc     = inject(TitulosService);
  private snack          = inject(MatSnackBar);
  private dialog         = inject(MatDialog);
  private route          = inject(ActivatedRoute);

  pedidos        = signal<Pedido[]>([]);
  carregando     = signal(false);
  expandedIds    = signal<string[]>([]);
  titulosMap     = signal<Partial<Record<string, Titulo[]>>>({});
  carregandoTitulos = signal<string[]>([]);

  colunas = ['expandir', 'data_limite', 'codigo', 'tipo_pedido', 'numero_nf', 'fornecedor', 'valor_total', 'valor_pago', 'acoes'];

  async ngOnInit() {
    await this.carregar();
    const expandir = this.route.snapshot.queryParamMap.get('expandir');
    if (expandir) {
      const pedido = this.pedidos().find(p => p.id === expandir);
      if (pedido) {
        this.expandedIds.update(ids => [...ids, pedido.id]);
        await this.carregarTitulos(pedido.id);
        setTimeout(() => {
          document.querySelector(`[data-pedido-id="${expandir}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }

  async carregar() {
    this.carregando.set(true);
    try { this.pedidos.set(await this.service.listar()); }
    finally { this.carregando.set(false); }
  }

  // ── Expand/collapse ────────────────────────────────────────────────────────

  isExpanded(id: string): boolean {
    return this.expandedIds().includes(id);
  }

  async toggleExpand(pedido: Pedido, event: MouseEvent) {
    event.stopPropagation();
    if (this.isExpanded(pedido.id)) {
      this.expandedIds.update(ids => ids.filter(i => i !== pedido.id));
      return;
    }
    this.expandedIds.update(ids => [...ids, pedido.id]);
    await this.carregarTitulos(pedido.id);
  }

  async carregarTitulos(pedidoId: string) {
    if (this.titulosMap()[pedidoId]) return;
    this.carregandoTitulos.update(ids => [...ids, pedidoId]);
    try {
      const titulos = await this.titulosSvc.listarPorPedido(pedidoId);
      this.titulosMap.update(m => ({ ...m, [pedidoId]: titulos }));
    } finally {
      this.carregandoTitulos.update(ids => ids.filter(i => i !== pedidoId));
    }
  }

  // ── Títulos ─────────────────────────────────────────────────────────────────

  async abrirDialogTitulo(pedidoId: string, event: MouseEvent) {
    event.stopPropagation();
    const ref = this.dialog.open(TituloDialogComponent, {
      width: '420px',
      data: { pedidoId },
    });
    const ok = await lastValueFrom(ref.afterClosed());
    if (ok) {
      this.titulosMap.update(m => { const u = { ...m }; delete u[pedidoId]; return u; });
      await this.carregarTitulos(pedidoId);
    }
  }

  async excluirTitulo(titulo: Titulo, pedidoId: string, event: MouseEvent) {
    event.stopPropagation();
    if (!confirm(`Excluir título ${titulo.codigo}?`)) return;
    try {
      await this.titulosSvc.excluir(titulo.id);
      this.titulosMap.update(m => ({
        ...m,
        [pedidoId]: (m[pedidoId] ?? []).filter(t => t.id !== titulo.id),
      }));
      this.snack.open('Título removido.', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao excluir título.', 'OK', { duration: 4000 });
    }
  }

  valorPago(pedido: Pedido): number {
    return (pedido.titulos ?? [])
      .filter(t => t.data_pagamento)
      .reduce((sum, t) => sum + t.valor, 0);
  }

  vencimentoClass(titulo: Titulo): string {
    if (titulo.data_pagamento) return 'pago';
    if (!titulo.data_vencimento) return '';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const venc = new Date(titulo.data_vencimento + 'T00:00:00');
    return venc < hoje ? 'vencido' : '';
  }

  // ── Pedidos ─────────────────────────────────────────────────────────────────

  dataLimiteClass(dataLimite: string | null): string {
    if (!dataLimite) return '';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const limite = new Date(dataLimite + 'T00:00:00');
    const diff = (limite.getTime() - hoje.getTime()) / 864e5;
    if (diff < 0) return 'vencido';
    if (diff <= 3) return 'urgente';
    return '';
  }

  async excluir(id: string, event: MouseEvent) {
    event.stopPropagation();
    if (!confirm('Confirma a exclusão deste pedido?')) return;
    try {
      await this.service.excluir(id);
      await this.carregar();
      this.snack.open('Pedido removido.', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao excluir pedido.', 'OK', { duration: 4000 });
    }
  }
}
