import { Routes } from '@angular/router';

export const extratoRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lista-extrato/lista-extrato.component').then(
        m => m.ListaExtratoComponent
      ),
  },
];
