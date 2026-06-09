import { Component, inject, signal } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProdutosService } from '../../services/produtos.service';
import { Item } from '../../models/produto.model';

export interface ImportarProdutosResult {
  inseridos: number;
  ignorados: number;
  novosItens: Item[];
}

@Component({
  selector: 'app-importar-produtos-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Importar Produtos</h2>

    <mat-dialog-content>

      <p class="instrucao">
        Insira aqui o Relatório 5301 em formato TXT exportado do CISSLive
        com separador ponto-e-vírgula e cabeçalho.
      </p>
      <a
        href="https://kophyei.cisslive.com.br/#report/relatorio/manter/RelatorioManterView/5301"
        target="_blank"
        rel="noopener noreferrer"
        class="link-cisslive"
      >
        <mat-icon>open_in_new</mat-icon>
        Abrir Relatório 5301 no CISSLive
      </a>

      <label class="upload-zone" style="margin-top:20px">
        <input type="file" accept=".txt,.csv" hidden (change)="onFile($event)" />

        @if (importando()) {
          <mat-spinner diameter="28" />
          <span class="uz-main">Importando produtos…</span>
        } @else if (arquivo()) {
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="color:var(--ok)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 12 18 15 15"/></svg>
          <span class="uz-main" style="color:var(--ok)">{{ arquivo()!.name }}</span>
          <span class="uz-sub">Clique para trocar o arquivo</span>
        } @else {
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="color:var(--bordo);opacity:0.6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span class="uz-main">Arraste ou clique para selecionar</span>
          <span class="uz-sub">Arquivo TXT do CISSLive (separador ponto-e-vírgula)</span>
        }
      </label>

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button class="btn ghost" [mat-dialog-close]="null" [disabled]="importando() || null">
        Cancelar
      </button>
      <button
        class="btn primary"
        [disabled]="!arquivo() || importando() || null"
        (click)="importar()"
      >
        Importar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .instrucao {
      font-size: 13px;
      color: var(--text-2);
      line-height: 1.65;
      margin: 0 0 12px;
    }

    .link-cisslive {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 13px;
      font-weight: 600;
      color: var(--bordo);
      text-decoration: none;
    }
    .link-cisslive mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .link-cisslive:hover { text-decoration: underline; }

    .upload-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 32px;
      border: 1.5px dashed var(--line-2);
      border-radius: var(--r-md);
      background: var(--surface-2);
      cursor: pointer;
      text-align: center;
      transition: border-color 0.15s, background 0.15s;
    }
    .upload-zone:hover {
      border-color: var(--bordo);
      background: var(--bordo-tint, color-mix(in srgb, var(--bordo) 6%, transparent));
    }

    .uz-main { font-size: 14px; font-weight: 500; color: var(--text-2); }
    .uz-sub  { font-size: 12px; color: var(--text-4); }
  `],
})
export class ImportarProdutosDialogComponent {
  private svc     = inject(ProdutosService);
  private ref     = inject(MatDialogRef<ImportarProdutosDialogComponent>);
  readonly data   = inject<{ existentes: Item[] }>(MAT_DIALOG_DATA);

  arquivo    = signal<File | null>(null);
  importando = signal(false);

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.arquivo.set(input.files?.[0] ?? null);
  }

  async importar() {
    const file = this.arquivo();
    if (!file) return;

    this.importando.set(true);
    try {
      const result = await this.svc.importarCsv(file, this.data.existentes);
      this.ref.close(result);
    } catch (e: any) {
      this.ref.close({ erro: e?.message ?? 'Erro ao importar arquivo.' });
    } finally {
      this.importando.set(false);
    }
  }
}
