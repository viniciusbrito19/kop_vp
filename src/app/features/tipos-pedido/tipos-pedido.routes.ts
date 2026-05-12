import { Routes } from '@angular/router';

export const tiposPedidoRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lista-tipos-pedido/lista-tipos-pedido.component').then(
        m => m.ListaTiposPedidoComponent
      ),
  },
];
