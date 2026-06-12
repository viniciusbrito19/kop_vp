import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface OutrosItem {
  label: string;
  description: string;
  route: string;
  iconPaths: string;
  colorClass: string;
}

interface OutrosSection {
  title: string;
  items: OutrosItem[];
}

const SVG = (paths: string) => paths;

@Component({
  selector: 'app-outros',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './outros.component.html',
  styleUrl: './outros.component.scss',
})
export class OutrosComponent {
  private sanitizer = inject(DomSanitizer);

  readonly sections: OutrosSection[] = [
    {
      title: 'Operação',
      items: [
        {
          label: 'Royalties e FPP',
          description: 'Conciliação de recebíveis de cartão',
          route: '/apuracao-crm',
          iconPaths: SVG('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/>'),
          colorClass: 'c-bordo',
        },
        {
          label: 'Fluxo de Caixa',
          description: 'Projeção de entradas e saídas',
          route: '/fluxo-caixa',
          iconPaths: SVG('<path d="M3 17 9 11l4 4 8-8"/><path d="M14 7h7v7"/>'),
          colorClass: 'c-ok',
        },
      ],
    },
    {
      title: 'Cadastros',
      items: [
        {
          label: 'Fornecedores',
          description: 'Contatos, CNPJ e histórico de compras',
          route: '/fornecedores',
          iconPaths: SVG('<path d="M3 9 5 4h14l2 5"/><path d="M3 9v11h18V9"/><path d="M3 9h18"/><path d="M9 9v3a3 3 0 0 0 6 0V9"/>'),
          colorClass: 'c-gold',
        },
        {
          label: 'Produtos',
          description: 'Itens, custos e ficha técnica',
          route: '/produtos',
          iconPaths: SVG('<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'),
          colorClass: 'c-ok',
        },
        {
          label: 'Categorias',
          description: 'Agrupamento de produtos e despesas',
          route: '/categorias-fornecedor',
          iconPaths: SVG('<path d="m2 7 10-5 10 5-10 5-10-5Z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/>'),
          colorClass: 'c-info',
        },
        {
          label: 'Tipos de Pedido',
          description: 'Classificação dos pedidos a fornecedores',
          route: '/tipos-pedido',
          iconPaths: SVG('<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z"/><circle cx="8" cy="8" r="1.5"/>'),
          colorClass: 'c-warn',
        },
      ],
    },
  ];

  icon(paths: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
    );
  }
}
