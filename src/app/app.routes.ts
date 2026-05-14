import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'pedidos', pathMatch: 'full' },
      {
        path: 'pedidos',
        loadChildren: () =>
          import('./features/pedidos/pedidos.routes').then(m => m.pedidosRoutes),
      },
      {
        path: 'fornecedores',
        loadChildren: () =>
          import('./features/fornecedores/fornecedores.routes').then(
            m => m.fornecedoresRoutes
          ),
      },
      {
        path: 'tipos-pedido',
        loadChildren: () =>
          import('./features/tipos-pedido/tipos-pedido.routes').then(
            m => m.tiposPedidoRoutes
          ),
      },
      {
        path: 'estoque',
        loadComponent: () =>
          import('./features/pedidos/pages/lista-pedidos/lista-pedidos.component').then(
            m => m.ListaPedidosComponent
          ),
      },
      {
        path: 'financeiro',
        loadChildren: () =>
          import('./features/extrato/extrato.routes').then(m => m.extratoRoutes),
      },
      {
        path: 'despesas',
        loadChildren: () =>
          import('./features/despesas/despesas.routes').then(m => m.despesasRoutes),
      },
      {
        path: 'categorias-fornecedor',
        loadChildren: () =>
          import('./features/categorias-fornecedor/categorias-fornecedor.routes').then(
            m => m.categoriasFornecedorRoutes
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
