import { Routes } from '@angular/router';

export const despesasRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lista-despesas/lista-despesas.component').then(
        m => m.ListaDespesasComponent
      ),
  },
];
