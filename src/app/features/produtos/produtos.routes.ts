import { Routes } from '@angular/router';

export const produtosRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lista-produtos/lista-produtos.component').then(
        m => m.ListaProdutosComponent
      ),
  },
];
