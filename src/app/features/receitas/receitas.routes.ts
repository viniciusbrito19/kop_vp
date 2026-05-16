import { Routes } from '@angular/router';

export const receitasRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/receitas-futuras/receitas-futuras.component').then(
        m => m.ReceitasFuturasComponent
      ),
  },
];
