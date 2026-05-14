import { MatPaginatorIntl } from '@angular/material/paginator';

export function ptBrPaginatorIntl(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  intl.itemsPerPageLabel = 'Itens por página:';
  intl.nextPageLabel     = 'Próxima página';
  intl.previousPageLabel = 'Página anterior';
  intl.firstPageLabel    = 'Primeira página';
  intl.lastPageLabel     = 'Última página';
  intl.getRangeLabel     = (page, pageSize, length) => {
    if (length === 0) return '0 de 0';
    const start = page * pageSize + 1;
    const end   = Math.min((page + 1) * pageSize, length);
    return `${start}–${end} de ${length}`;
  };
  return intl;
}
