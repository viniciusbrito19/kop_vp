import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, AbstractControl } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { PedidosService } from '../../services/pedidos.service';
import { PdfExtractorService } from '../../services/pdf-extractor.service';
import { StorageService } from '../../../../core/services/storage.service';
import { FornecedoresService } from '../../../fornecedores/services/fornecedores.service';
import { TiposPedidoService } from '../../../tipos-pedido/services/tipos-pedido.service';
import { Fornecedor } from '../../../fornecedores/models/fornecedor.model';
import { TipoPedido } from '../../../tipos-pedido/models/tipo-pedido.model';
import { DadosExtraidosPdf } from '../../models/pedido.model';

@Component({
  selector: 'app-novo-pedido',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule,
  ],
  templateUrl: './novo-pedido.component.html',
  styleUrl: './novo-pedido.component.scss',
})
export class NovoPedidoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private pedidosService = inject(PedidosService);
  private pdfExtractor = inject(PdfExtractorService);
  private storage = inject(StorageService);
  private fornecedoresService = inject(FornecedoresService);
  private tiposPedidoService = inject(TiposPedidoService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  fornecedores = signal<Fornecedor[]>([]);
  tiposPedido = signal<TipoPedido[]>([]);
  extraindo = signal(false);
  salvando = signal(false);
  arquivoPdf: File | null = null;

  form = this.fb.group({
    codigo: ['', [Validators.pattern(/^\d{7}KPN$/)]],
    data_limite: [''],
    fornecedor_id: [''],
    tipo_pedido_id: [''],
    numero_nf: ['', [Validators.pattern(/^\d{9}-\d$/)]],
    data_emissao: [''],
    valor_total: [null as number | null],
    status: ['recebido'],
    observacoes: [''],
    itens: this.fb.array([]),
  });

  get itens(): FormArray { return this.form.get('itens') as FormArray; }

  async ngOnInit() {
    const [fornecedores, tiposPedido] = await Promise.all([
      this.fornecedoresService.listar(),
      this.tiposPedidoService.listar(true),
    ]);
    this.fornecedores.set(fornecedores);
    this.tiposPedido.set(tiposPedido);
  }

  aplicarMascaraNf(event: Event) {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '').substring(0, 10);
    if (valor.length > 9) {
      valor = valor.substring(0, 9) + '-' + valor.substring(9);
    }
    this.form.get('numero_nf')!.setValue(valor, { emitEvent: false });
    input.value = valor;
  }

  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.arquivoPdf = file;
    this.extraindo.set(true);
    try {
      const dados = await this.pdfExtractor.extrair(file);
      this.preencherComDados(dados);
      this.snack.open('Dados extraídos com sucesso!', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Não foi possível extrair dados do PDF. Preencha manualmente.', 'OK', { duration: 4000 });
    } finally {
      this.extraindo.set(false);
    }
  }

  private preencherComDados(dados: DadosExtraidosPdf) {
    this.form.patchValue({
      codigo:       dados.codigo ?? '',
      numero_nf:    dados.numero_nf ?? '',
      data_emissao: dados.data_emissao ?? '',
      valor_total:  dados.valor_total,
    });
    this.itens.clear();
    for (const item of dados.itens) this.adicionarItem(item);
    if (dados.cnpj_emitente) {
      const cnpjLimpo = dados.cnpj_emitente.replace(/\D/g, '');
      const f = this.fornecedores().find(
        f => f.cnpj?.replace(/\D/g, '') === cnpjLimpo
      );
      if (f) this.form.patchValue({ fornecedor_id: f.id });
    }
  }

  adicionarItem(valores?: any) {
    this.itens.push(this.fb.group({
      descricao: [valores?.descricao ?? '', Validators.required],
      quantidade: [valores?.quantidade ?? null],
      unidade: [valores?.unidade ?? ''],
      valor_unitario: [valores?.valor_unitario ?? null],
      valor_total: [valores?.valor_total ?? null],
    }));
  }

  removerItem(index: number) { this.itens.removeAt(index); }

  async salvar() {
    this.salvando.set(true);
    try {
      let pdfUrl: string | null = null;
      if (this.arquivoPdf) {
        pdfUrl = await this.storage.uploadPdf(
          this.arquivoPdf,
          `${Date.now()}_${this.arquivoPdf.name}`
        );
      }
      const v = this.form.value;
      await this.pedidosService.salvar(
        {
          codigo: v.codigo || null,
          data_limite: v.data_limite || null,
          fornecedor_id: v.fornecedor_id || null,
          tipo_pedido_id: v.tipo_pedido_id || null,
          numero_nf: v.numero_nf || null,
          data_emissao: v.data_emissao || null,
          valor_total: v.valor_total ?? null,
          status: (v.status as any) ?? 'recebido',
          observacoes: v.observacoes || null,
          pdf_url: pdfUrl,
        },
        (v.itens as any[]) ?? []
      );
      this.snack.open('Pedido salvo com sucesso!', 'OK', { duration: 3000 });
      this.router.navigate(['/pedidos']);
    } catch {
      this.snack.open('Erro ao salvar pedido.', 'OK', { duration: 4000 });
    } finally {
      this.salvando.set(false);
    }
  }
}
