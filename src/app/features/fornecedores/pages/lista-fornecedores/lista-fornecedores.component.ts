import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { FornecedoresService } from '../../services/fornecedores.service';
import { Fornecedor } from '../../models/fornecedor.model';
import { FornecedorDialogComponent } from './fornecedor-dialog.component';

@Component({
  selector: 'app-lista-fornecedores',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
  ],
  templateUrl: './lista-fornecedores.component.html',
  styleUrl: './lista-fornecedores.component.scss',
})
export class ListaFornecedoresComponent implements OnInit {
  private service = inject(FornecedoresService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  fornecedores = signal<Fornecedor[]>([]);
  carregando = signal(false);
  colunas = ['nome', 'cnpj', 'acoes'];

  async ngOnInit() {
    await this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      this.fornecedores.set(await this.service.listar());
    } finally {
      this.carregando.set(false);
    }
  }

  abrirDialog(fornecedor?: Fornecedor) {
    const ref = this.dialog.open(FornecedorDialogComponent, {
      width: '440px',
      data: fornecedor ?? null,
    });
    ref.afterClosed().subscribe(async (salvo) => {
      if (salvo) {
        await this.carregar();
        this.snack.open('Fornecedor salvo com sucesso!', 'OK', { duration: 3000 });
      }
    });
  }

  async excluir(id: string) {
    if (!confirm('Confirma a exclusão deste fornecedor?')) return;
    try {
      await this.service.excluir(id);
      await this.carregar();
      this.snack.open('Fornecedor removido.', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erro ao excluir fornecedor.', 'OK', { duration: 4000 });
    }
  }
}
