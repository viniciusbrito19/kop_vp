import { Routes } from '@angular/router';

export const visaoGeralRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/visao-geral/visao-geral.component').then(m => m.VisaoGeralComponent),
  },
];
