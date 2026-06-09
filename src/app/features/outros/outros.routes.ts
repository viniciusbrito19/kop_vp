import { Routes } from '@angular/router';

export const outrosRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./outros.component').then(m => m.OutrosComponent),
  },
];
