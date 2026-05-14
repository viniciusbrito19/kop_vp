import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PedidosService } from '../../services/pedidos.service';
import { TitulosService } from '../../services/titulos.service';
import { Pedido } from '../../models/pedido.model';
import { Titulo } from '../../models/titulo.model';
import { TituloDialogComponent } from './titulo-dialog.component';

type StatusPedidoCalc = 'pago' | 'parcial' | 'aberto' | 'atrasado';

@Component({
  selector: 'app-lista-pedidos',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    CurrencyPipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDialogModule,
  ],
  templateUrl: './lista-pedidos.component.html',
  styleUrl: './lista-pedidos.component.scss',
})
export class ListaPedidosComponent implements OnInit {
  private service    = inject(PedidosService);
  private titulosSvc = inject(TitulosService);
  private snack      = inject(MatSnackBar);
  private dialog     = inject(MatDialog);
  private route      = inject(ActivatedRoute);

  pedidos           = signal<Pedido[]>([]);
  carregando        = signal(false);
  expandedIds       = signal<string[]>([]);
  titulosMap        = signal<Partial<Record<string, Titulo[]>>>({});
  carregandoTitulos = signal<string[]>([]);
  filtroStatus      = signal<string>('todos');
  busca             = '';

  tabs = [
    { label: 'Todos',     value: 'todos' },
    { label: 'Em atraso', value: 'atrasado' },
    { label: 'Em aberto', value: 'aberto' },
    { label: 'Parcial',   value: 'parcial' },
    { label: 'Pago',      value: 'pago' },
  ];

  // ── Computed / derivados ────────────────────────────────────────────────────

  pedidosFiltrados = computed(() => {
    const status = this.filtroStatus();
    const q = this.busca.toLowerCase();
    return this.pedidos().filter(p => {
      if (status !== 'todos' && this.statusPedido(p) !== status) return false;
      if (q) {
        const haystack = [p.codigo, p.numero_nf, p.fornecedor?.nome, p.tipo_pedido?.nome]
          .join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  });

  kpiAtrasado = computed(() => {
    const lista = this.pedidos().filter(p => this.statusPedido(p) === 'atrasado');
    return {
      count: lista.length,
      total: lista.reduce((s, p) => s + (p.valor_total ?? 0) - this.valorPago(p), 0),
    };
  });

  kpiAPagar = computed(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const limite30 = new Date(hoje); limite30.setDate(hoje.getDate() + 30);
    const lista = this.pedidos().filter(p => {
      const st = this.statusPedido(p);
      if (st === 'pago') return false;
      if (!p.data_limite) return true;
      const dl = new Date(p.data_limite + 'T00:00:00');
      return dl <= limite30;
    });
    return {
      count: lista.length,
      total: lista.reduce((s, p) => s + (p.valor_total ?? 0) - this.valorPago(p), 0),
    };
  });

  kpiPagos = computed(() => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const lista = this.pedidos().filter(p => {
      if (this.statusPedido(p) !== 'pago') return false;
      const criado = new Date(p.created_at);
      return criado >= inicioMes;
    });
    return {
      count: lista.length,
      total: lista.reduce((s, p) => s + (p.valor_total ?? 0), 0),
    };
  });

  ticketMedio = computed(() => {
    const lista = this.pedidos().filter(p => p.valor_total);
    if (!lista.length) return 0;
    return lista.reduce((s, p) => s + (p.valor_total ?? 0), 0) / lista.length;
  });

  proximoVencimento = computed(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const proximo = this.pedidos()
      .filter(p => p.data_limite && this.statusPedido(p) !== 'pago')
      .map(p => new Date(p.data_limite! + 'T00:00:00'))
      .filter(d => d >= hoje)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (!proximo) return '—';
    const diff = Math.round((proximo.getTime() - hoje.getTime()) / 864e5);
    if (diff === 0) return 'hoje';
    if (diff === 1) return 'amanhã';
    return `em ${diff} dias`;
  });

  // ── Lifecycle ───────────────────────────────────────────────────────────────

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

  // ── Status helpers ──────────────────────────────────────────────────────────

  statusPedido(p: Pedido): StatusPedidoCalc {
    const pago  = this.valorPago(p);
    const total = p.valor_total ?? 0;
    if (total > 0 && pago >= total) return 'pago';
    if (pago > 0) return 'parcial';
    if (p.data_limite) {
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      if (new Date(p.data_limite + 'T00:00:00') < hoje) return 'atrasado';
    }
    return 'aberto';
  }

  statusLabel(p: Pedido): string {
    const map: Record<StatusPedidoCalc, string> = {
      pago: 'Pago', parcial: 'Parcial', aberto: 'Em aberto', atrasado: 'Atrasado',
    };
    return map[this.statusPedido(p)];
  }

  statusClass(p: Pedido): string {
    const map: Record<StatusPedidoCalc, string> = {
      pago: 'ok', parcial: 'warn', aberto: 'info', atrasado: 'bad',
    };
    return map[this.statusPedido(p)];
  }

  dataClass(p: Pedido): string {
    if (!p.data_limite) return '';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const limite = new Date(p.data_limite + 'T00:00:00');
    const diff = (limite.getTime() - hoje.getTime()) / 864e5;
    if (diff < 0) return 'overdue';
    if (diff <= 3) return 'soon';
    return '';
  }

  valorClass(p: Pedido): string {
    const st = this.statusPedido(p);
    if (st === 'pago') return 'pago';
    if (st === 'parcial') return 'parcial';
    return 'aberto';
  }

  tituloDateClass(t: Titulo): string {
    if (t.data_pagamento) return '';
    if (!t.data_vencimento) return '';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const venc = new Date(t.data_vencimento + 'T00:00:00');
    if (venc < hoje) return 'overdue';
    const diff = (venc.getTime() - hoje.getTime()) / 864e5;
    if (diff <= 3) return 'soon';
    return '';
  }

  // ── Expand/collapse ─────────────────────────────────────────────────────────

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

  valorPago(pedido: Pedido): number {
    return (pedido.titulos ?? [])
      .filter(t => t.data_pagamento)
      .reduce((sum, t) => sum + t.valor, 0);
  }

  vencimentoClass(titulo: Titulo): string {
    if (titulo.data_pagamento) return 'pago';
    if (!titulo.data_vencimento) return '';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return new Date(titulo.data_vencimento + 'T00:00:00') < hoje ? 'vencido' : '';
  }

  async abrirDialogTitulo(pedidoId: string, event: MouseEvent) {
    event.stopPropagation();
    const ref = this.dialog.open(TituloDialogComponent, { width: '420px', data: { pedidoId } });
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
        ...m, [pedidoId]: (m[pedidoId] ?? []).filter(t => t.id !== titulo.id),
      }));
      this.snack.open('Título removido.', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao excluir título.', 'OK', { duration: 4000 });
    }
  }

  // ── Pedidos ──────────────────────────────────────────────────────────────────

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
