import { Routes } from '@angular/router';

export const fluxoCaixaRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/fluxo-caixa/fluxo-caixa.component').then(
        m => m.FluxoCaixaComponent
      ),
  },
];
