import { Routes } from '@angular/router';

export const APURACAO_CRM_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lista-apuracoes/lista-apuracoes.component').then(
        m => m.ListaApuracoesComponent
      ),
  },
];
