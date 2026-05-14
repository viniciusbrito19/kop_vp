import { Routes } from '@angular/router';

export const categoriasFornecedorRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lista-categorias/lista-categorias.component').then(
        m => m.ListaCategoriasComponent
      ),
  },
];
