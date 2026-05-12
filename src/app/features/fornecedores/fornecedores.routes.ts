import { Routes } from '@angular/router';

export const fornecedoresRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lista-fornecedores/lista-fornecedores.component').then(
        m => m.ListaFornecedoresComponent
      ),
  },
];
