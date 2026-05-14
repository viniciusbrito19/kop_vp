import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface NavItem {
  label: string;
  route: string;
  iconSvg: SafeHtml;
  badge?: string;
}

const SVG_ATTRS = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

function icon(paths: string): string {
  return `<svg ${SVG_ATTRS}>${paths}</svg>`;
}

const ICONS: Record<string, string> = {
  orders:    icon('<path d="M8 4h9l4 4v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M17 4v4h4"/><path d="M10 12h8M10 16h6M10 8h3"/>'),
  suppliers: icon('<path d="M3 9 5 4h14l2 5"/><path d="M3 9v11h18V9"/><path d="M3 9h18"/><path d="M9 9v3a3 3 0 0 0 6 0V9"/>'),
  stock:     icon('<path d="M3 7h18v13H3z"/><path d="M3 7l3-4h12l3 4"/><path d="M10 12h4"/>'),
  finance:   icon('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v.01M18 14v.01"/>'),
  wallet:    icon('<path d="M3 7v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3"/><path d="M21 12V8a1 1 0 0 0-1-1H5a2 2 0 0 1 0-4h15v4"/><circle cx="17" cy="13" r="1.4" fill="currentColor"/>'),
  trend:     icon('<path d="M3 17 9 11l4 4 8-8"/><path d="M14 7h7v7"/>'),
  tags:      icon('<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z"/><circle cx="8" cy="8" r="1.5"/>'),
};

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private sanitizer = inject(DomSanitizer);

  collapsed = false;
  darkMode = false;

  navItems: NavItem[] = [
    { label: 'Pedidos',         route: '/pedidos',               iconSvg: this.safe(ICONS['orders']),    badge: '12' },
    { label: 'Fornecedores',    route: '/fornecedores',          iconSvg: this.safe(ICONS['suppliers']) },
    { label: 'Estoque',         route: '/estoque',               iconSvg: this.safe(ICONS['stock']) },
    { label: 'Financeiro',      route: '/financeiro',            iconSvg: this.safe(ICONS['finance']) },
    { label: 'Despesas',        route: '/despesas',              iconSvg: this.safe(ICONS['wallet']) },
    { label: 'Fluxo de Caixa',  route: '/fluxo-caixa',          iconSvg: this.safe(ICONS['trend']) },
    { label: 'Tipos de Pedido', route: '/tipos-pedido',          iconSvg: this.safe(ICONS['tags']) },
    { label: 'Cat. Fornecedor', route: '/categorias-fornecedor', iconSvg: this.safe(ICONS['tags']) },
  ];

  private safe(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
  }
}
