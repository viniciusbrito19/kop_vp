import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CurrencyPipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
    CurrencyPipe,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './novo-pedido.component.html',
  styleUrl: './novo-pedido.component.scss',
})
export class NovoPedidoComponent implements OnInit, OnDestroy {
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
  pedidoDuplicado = signal<import('../../models/pedido.model').Pedido | null>(null);
  private duplicatasExtraidas: DuplicataExtraida[] = [];
  private uploadSeq = 0;
  private tipoPedidoSub?: Subscription;

  form = this.fb.group({
    codigo: ['', [Validators.pattern(/^(\d{7}KPN|\d+)$/)]],
    data_limite: [''],
    fornecedor_id: [''],
    tipo_pedido_id: [''],
    percentual_royalties: [null as number | null, [Validators.min(0), Validators.max(100)]],
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

    this.tipoPedidoSub = this.form.get('tipo_pedido_id')!.valueChanges.subscribe(id => {
      const tipo = this.tiposPedido().find(t => t.id === id);
      const pct = tipo?.incide_royalties ? (tipo.percentual_royalties ?? null) : null;
      this.form.get('percentual_royalties')!.setValue(pct, { emitEvent: false });
    });

    if (this.pedidoId) {
      try {
        const [pedido, itens] = await Promise.all([
          this.pedidosService.buscarPorId(this.pedidoId),
          this.pedidosService.buscarItens(this.pedidoId),
        ]);
        this.pdfAtualUrl.set(pedido.pdf_url);
        this.form.patchValue({
          codigo:               pedido.codigo ?? '',
          data_limite:          pedido.data_limite ?? '',
          fornecedor_id:        pedido.fornecedor_id ?? '',
          tipo_pedido_id:       pedido.tipo_pedido_id ?? '',
          percentual_royalties: pedido.percentual_royalties ?? null,
          numero_nf:            pedido.numero_nf ?? '',
          data_emissao:         pedido.data_emissao ?? '',
          valor_total:          pedido.valor_total,
          status:               pedido.status,
          observacoes:          pedido.observacoes ?? '',
        });
        this.itens.clear();
        for (const item of itens) this.adicionarItem(item);
      } catch {
        this.snack.open('Erro ao carregar pedido.', 'OK', { duration: 4000 });
        this.router.navigate(['/pedidos']);
      }
    }
  }

  ngOnDestroy() {
    this.tipoPedidoSub?.unsubscribe();
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
    const seq = ++this.uploadSeq;
    this.arquivoPdf = file;
    this.pedidoDuplicado.set(null);
    this.extraindo.set(true);
    try {
      const isXml = file.name.toLowerCase().endsWith('.xml');
      const dados = isXml
        ? await this.xmlExtractor.extrair(file)
        : await this.pdfExtractor.extrair(file);
      if (seq !== this.uploadSeq) return;
      this.preencherComDados(dados);

      const duplicado = await this.pedidosService.verificarDuplicata(
        dados.numero_nf,
        dados.codigo,
        this.pedidoId,
      );
      if (seq !== this.uploadSeq) return;
      this.pedidoDuplicado.set(duplicado);

      if (duplicado) {
        this.snack.open('Atenção: este pedido já está cadastrado no sistema.', 'OK', { duration: 5000 });
      } else {
        this.snack.open('Dados extraídos com sucesso!', 'OK', { duration: 3000 });
      }
    } catch {
      if (seq === this.uploadSeq) {
        this.snack.open('Não foi possível extrair dados do arquivo. Preencha manualmente.', 'OK', { duration: 4000 });
      }
    } finally {
      if (seq === this.uploadSeq) {
        this.extraindo.set(false);
      }
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
    for (const item of dados.itens) this.itens.push(this.criarItemGroup(item));
    if (dados.cnpj_emitente) {
      const cnpjLimpo = dados.cnpj_emitente.replace(/\D/g, '');
      const f = this.fornecedores().find(
        f => f.cnpj?.replace(/\D/g, '') === cnpjLimpo
      );
      if (f) this.form.patchValue({ fornecedor_id: f.id });
    }
    this.duplicatasExtraidas = dados.duplicatas;
  }

  get totalVenda(): number | null {
    const soma = (this.itens.value as any[]).reduce(
      (acc: number, item: any) => acc + (item.venda_total ?? 0), 0
    );
    return soma > 0 ? soma : null;
  }

  private criarItemGroup(valores?: any) {
    return this.fb.group({
      ean:             [valores?.ean ?? null],
      c_prod:          [valores?.c_prod ?? null],
      descricao:       [valores?.descricao ?? '', Validators.required],
      quantidade:      [valores?.quantidade ?? null],
      unidade:         [valores?.unidade ?? ''],
      valor_unitario:  [valores?.valor_unitario ?? null],
      valor_total:     [valores?.valor_total ?? null],
      venda_unitario: [valores?.venda_unitario ?? null],
      venda_total:    [valores?.venda_total ?? null],
    });
  }

  adicionarItem(valores?: any) {
    this.itens.push(this.criarItemGroup(valores));
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
      const itensRaw = (v.itens as any[]) ?? [];
      const valorVenda = itensRaw.reduce(
        (acc: number, item: any) => acc + (item.venda_total ?? 0), 0
      ) || null;
      const formData = {
        codigo: v.codigo || null,
        data_limite: v.data_limite || null,
        fornecedor_id: v.fornecedor_id || null,
        tipo_pedido_id: v.tipo_pedido_id || null,
        percentual_royalties: v.percentual_royalties ?? null,
        numero_nf: v.numero_nf || null,
        data_emissao: v.data_emissao || null,
        valor_total: v.valor_total ?? null,
        valor_venda: valorVenda,
        status: (v.status as any) ?? 'recebido',
        observacoes: v.observacoes || null,
        pdf_url: pdfUrl,
      };
      const itens = itensRaw;

      if (this.modoEdicao() && this.pedidoId) {
        await this.pedidosService.atualizar(this.pedidoId, formData, itens);
        this.snack.open('Pedido atualizado com sucesso!', 'OK', { duration: 3000 });
      } else {
        const pedido = await this.pedidosService.salvar(formData, itens);

        const tipo = this.tiposPedido().find(t => t.id === v.tipo_pedido_id);
        const isKopClub = tipo?.nome?.toLowerCase() === 'kop club';

        if (isKopClub && formData.valor_total && formData.data_limite) {
          const base = formData.numero_nf ?? formData.codigo ?? 'SEM-NF';
          await this.titulosService.salvar({
            pedido_id:       pedido.id,
            codigo:          `${base}/001`,
            data_vencimento: formData.data_limite,
            data_pagamento:  formData.data_limite,
            valor:           formData.valor_total,
          });
          this.snack.open('Pedido Kop club salvo e quitado automaticamente.', 'OK', { duration: 3000 });
        } else if (this.duplicatasExtraidas.length > 0) {
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
