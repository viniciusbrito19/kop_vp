import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
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
        path: 'receitas',
        loadChildren: () =>
          import('./features/receitas/receitas.routes').then(m => m.receitasRoutes),
      },
      {
        path: 'fluxo-caixa',
        loadChildren: () =>
          import('./features/fluxo-caixa/fluxo-caixa.routes').then(
            m => m.fluxoCaixaRoutes
          ),
      },
      {
        path: 'categorias-fornecedor',
        loadChildren: () =>
          import('./features/categorias-fornecedor/categorias-fornecedor.routes').then(
            m => m.categoriasFornecedorRoutes
          ),
      },
      {
        path: 'produtos',
        loadChildren: () =>
          import('./features/produtos/produtos.routes').then(m => m.produtosRoutes),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
