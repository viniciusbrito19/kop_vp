import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  navItems: NavItem[] = [
    { label: 'Pedidos', icon: 'receipt_long', route: '/pedidos' },
    { label: 'Fornecedores', icon: 'storefront', route: '/fornecedores' },
    { label: 'Estoque', icon: 'inventory_2', route: '/estoque' },
    { label: 'Financeiro', icon: 'payments', route: '/financeiro' },
    { label: 'Tipos de Pedido', icon: 'category', route: '/tipos-pedido' },
  ];
}
