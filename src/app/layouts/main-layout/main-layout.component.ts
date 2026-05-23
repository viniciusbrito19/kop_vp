import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';

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
  finance:   icon('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v.01M18 14v.01"/>'),
  wallet:    icon('<path d="M3 7v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3"/><path d="M21 12V8a1 1 0 0 0-1-1H5a2 2 0 0 1 0-4h15v4"/><circle cx="17" cy="13" r="1.4" fill="currentColor"/>'),
  trend:     icon('<path d="M3 17 9 11l4 4 8-8"/><path d="M14 7h7v7"/>'),
  tags:      icon('<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z"/><circle cx="8" cy="8" r="1.5"/>'),
  receive:   icon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),
  layers:    icon('<path d="m2 7 10-5 10 5-10 5-10-5Z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/>'),
  box:       icon('<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'),
  calculate: icon('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/>'),
};

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);
  private auth = inject(AuthService);

  collapsed = false;
  darkMode = false;
  loggingOut = signal(false);

  displayName = signal('');
  initials   = signal('');
  firstName  = signal('');
  dateLabel  = signal('');

  async ngOnInit(): Promise<void> {
    const user = await this.auth.getUser();
    const name: string = user?.user_metadata?.['display_name'] ?? user?.email ?? '';
    this.displayName.set(name);
    this.initials.set(this.toInitials(name));
    this.firstName.set(this.toFirstName(name));
    this.dateLabel.set(this.buildDateLabel());
  }

  private toInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private toFirstName(name: string): string {
    const raw = name.trim().split(/\s+/)[0] ?? '';
    return raw.includes('@') ? raw.split('@')[0] : raw;
  }

  private buildDateLabel(): string {
    const now = new Date();
    const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });
    const day     = now.getDate();
    const month   = now.toLocaleDateString('pt-BR', { month: 'long' });
    return weekday.charAt(0).toUpperCase() + weekday.slice(1) + ', ' + day + ' de ' + month;
  }

  navOperacao: NavItem[] = [
    { label: 'Pedidos',        route: '/pedidos',        iconSvg: this.safe(ICONS['orders'])     },
    { label: 'Receitas',       route: '/receitas',       iconSvg: this.safe(ICONS['receive'])    },
    { label: 'Despesas',       route: '/despesas',       iconSvg: this.safe(ICONS['wallet'])     },
    { label: 'Financeiro',     route: '/financeiro',     iconSvg: this.safe(ICONS['finance'])    },
    { label: 'Fluxo de Caixa', route: '/fluxo-caixa',   iconSvg: this.safe(ICONS['trend'])      },
    { label: 'Apuração CRM',   route: '/apuracao-crm',  iconSvg: this.safe(ICONS['calculate'])  },
  ];

  navConfiguracoes: NavItem[] = [
    { label: 'Fornecedores',    route: '/fornecedores',          iconSvg: this.safe(ICONS['suppliers']) },
    { label: 'Produtos',        route: '/produtos',              iconSvg: this.safe(ICONS['box'])        },
    { label: 'Categorias',      route: '/categorias-fornecedor', iconSvg: this.safe(ICONS['layers'])    },
    { label: 'Tipos de Pedido', route: '/tipos-pedido',          iconSvg: this.safe(ICONS['tags'])      },
  ];

  get allNavItems(): NavItem[] {
    return [...this.navOperacao, ...this.navConfiguracoes];
  }

  private safe(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    try {
      await this.auth.logout();
    } catch {
      this.loggingOut.set(false);
    }
  }
}
