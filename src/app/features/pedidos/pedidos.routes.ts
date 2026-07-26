import { Routes } from '@angular/router';

export const pedidosRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lista-pedidos/lista-pedidos.component').then(
        m => m.ListaPedidosComponent
      ),
  },
  {
    path: 'novo',
    loadComponent: () =>
      import('./pages/novo-pedido/novo-pedido.component').then(
        m => m.NovoPedidoComponent
      ),
  },
  {
    path: 'simular',
    loadComponent: () =>
      import('./pages/simulacao-pedido/simulacao-pedido.component').then(
        m => m.SimulacaoPedidoComponent
      ),
  },
  {
    path: 'simular/:id',
    loadComponent: () =>
      import('./pages/simulacao-pedido/simulacao-pedido.component').then(
        m => m.SimulacaoPedidoComponent
      ),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./pages/novo-pedido/novo-pedido.component').then(
        m => m.NovoPedidoComponent
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/detalhe-pedido/detalhe-pedido.component').then(
        m => m.DetalhePedidoComponent
      ),
  },
];
