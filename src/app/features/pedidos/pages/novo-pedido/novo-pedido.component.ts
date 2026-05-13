import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
import { XmlExtractorService } from '../../services/xml-extractor.service';
import { StorageService } from '../../../../core/services/storage.service';
import { FornecedoresService } from '../../../fornecedores/services/fornecedores.service';
import { TiposPedidoService } from '../../../tipos-pedido/services/tipos-pedido.service';
import { TitulosService } from '../../services/titulos.service';
import { Fornecedor } from '../../../fornecedores/models/fornecedor.model';
import { TipoPedido } from '../../../tipos-pedido/models/tipo-pedido.model';
import { DadosExtraidosPdf, DuplicataExtraida } from '../../models/pedido.model';

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
  private xmlExtractor = inject(XmlExtractorService);
  private storage = inject(StorageService);
  private titulosService = inject(TitulosService);
  private fornecedoresService = inject(FornecedoresService);
  private tiposPedidoService = inject(TiposPedidoService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  fornecedores = signal<Fornecedor[]>([]);
  tiposPedido = signal<TipoPedido[]>([]);
  extraindo = signal(false);
  salvando = signal(false);
  modoEdicao = signal(false);
  pedidoId: string | null = null;
  pdfAtualUrl = signal<string | null>(null);
  arquivoPdf: File | null = null;
  private duplicatasExtraidas: DuplicataExtraida[] = [];

  form = this.fb.group({
    codigo: ['', [Validators.pattern(/^(\d{7}KPN|\d+)$/)]],
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
    this.pedidoId = this.route.snapshot.paramMap.get('id');
    this.modoEdicao.set(!!this.pedidoId);

    const [fornecedores, tiposPedido] = await Promise.all([
      this.fornecedoresService.listar(),
      this.tiposPedidoService.listar(true),
    ]);
    this.fornecedores.set(fornecedores);
    this.tiposPedido.set(tiposPedido);

    if (this.pedidoId) {
      try {
        const [pedido, itens] = await Promise.all([
          this.pedidosService.buscarPorId(this.pedidoId),
          this.pedidosService.buscarItens(this.pedidoId),
        ]);
        this.pdfAtualUrl.set(pedido.pdf_url);
        this.form.patchValue({
          codigo:         pedido.codigo ?? '',
          data_limite:    pedido.data_limite ?? '',
          fornecedor_id:  pedido.fornecedor_id ?? '',
          tipo_pedido_id: pedido.tipo_pedido_id ?? '',
          numero_nf:      pedido.numero_nf ?? '',
          data_emissao:   pedido.data_emissao ?? '',
          valor_total:    pedido.valor_total,
          status:         pedido.status,
          observacoes:    pedido.observacoes ?? '',
        });
        this.itens.clear();
        for (const item of itens) this.adicionarItem(item);
      } catch {
        this.snack.open('Erro ao carregar pedido.', 'OK', { duration: 4000 });
        this.router.navigate(['/pedidos']);
      }
    }
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
      const isXml = file.name.toLowerCase().endsWith('.xml');
      const dados = isXml
        ? await this.xmlExtractor.extrair(file)
        : await this.pdfExtractor.extrair(file);
      this.preencherComDados(dados);
      this.snack.open('Dados extraídos com sucesso!', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Não foi possível extrair dados do arquivo. Preencha manualmente.', 'OK', { duration: 4000 });
    } finally {
      this.extraindo.set(false);
    }
  }

  private preencherComDados(dados: DadosExtraidosPdf) {
    this.form.patchValue({
      codigo:       dados.codigo ?? '',
      data_limite:  dados.data_limite ?? '',
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
    this.duplicatasExtraidas = dados.duplicatas;
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
      let pdfUrl: string | null = this.modoEdicao() ? (this.pdfAtualUrl() ?? null) : null;
      const isPdf = this.arquivoPdf && !this.arquivoPdf.name.toLowerCase().endsWith('.xml');
      if (isPdf) {
        pdfUrl = await this.storage.uploadPdf(
          this.arquivoPdf!,
          `${Date.now()}_${this.arquivoPdf!.name}`
        );
      }
      const v = this.form.value;
      const formData = {
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
      };
      const itens = (v.itens as any[]) ?? [];

      if (this.modoEdicao() && this.pedidoId) {
        await this.pedidosService.atualizar(this.pedidoId, formData, itens);
        this.snack.open('Pedido atualizado com sucesso!', 'OK', { duration: 3000 });
      } else {
        const pedido = await this.pedidosService.salvar(formData, itens);
        if (this.duplicatasExtraidas.length > 0) {
          for (const dup of this.duplicatasExtraidas) {
            await this.titulosService.salvar({
              pedido_id:       pedido.id,
              codigo:          dup.codigo,
              data_vencimento: dup.data_vencimento,
              data_pagamento:  null,
              valor:           dup.valor,
            });
          }
          this.snack.open(
            `Pedido salvo com ${this.duplicatasExtraidas.length} título(s) gerado(s) automaticamente.`,
            'OK', { duration: 4000 }
          );
        } else {
          this.snack.open('Pedido salvo com sucesso!', 'OK', { duration: 3000 });
        }
      }
      this.router.navigate(['/pedidos']);
    } catch {
      this.snack.open('Erro ao salvar pedido.', 'OK', { duration: 4000 });
    } finally {
      this.salvando.set(false);
    }
  }
}
