import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { PedidosService } from '../../services/pedidos.service';
import { Pedido, ItemPedido, StatusPedido } from '../../models/pedido.model';

@Component({
  selector: 'app-detalhe-pedido',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    CurrencyPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './detalhe-pedido.component.html',
  styleUrl: './detalhe-pedido.component.scss',
})
export class DetalhePedidoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(PedidosService);

  pedido = signal<Pedido | null>(null);
  itens = signal<ItemPedido[]>([]);
  carregando = signal(true);
  colunasItens = ['descricao', 'quantidade', 'unidade', 'valor_unitario', 'valor_total', 'venda_unitario', 'venda_total'];

  private statusLabel: Record<StatusPedido, string> = {
    recebido: 'Recebido',
    pendente: 'Pendente',
    cancelado: 'Cancelado',
  };

  private statusColor: Record<StatusPedido, string> = {
    recebido: 'primary',
    pendente: 'accent',
    cancelado: 'warn',
  };

  getStatusLabel(status: string): string {
    return this.statusLabel[status as StatusPedido] ?? status;
  }

  getStatusColor(status: string): string {
    return this.statusColor[status as StatusPedido] ?? '';
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    try {
      const [pedido, itens] = await Promise.all([
        this.service.buscarPorId(id),
        this.service.buscarItens(id),
      ]);
      this.pedido.set(pedido);
      this.itens.set(itens);
    } finally {
      this.carregando.set(false);
    }
  }
}
