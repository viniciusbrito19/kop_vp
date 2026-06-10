import { Injectable } from '@angular/core';
import { DadosExtraidosPdf, ItemPedidoForm } from '../models/pedido.model';

@Injectable({ providedIn: 'root' })
export class PdfExtractorService {

  async extrair(file: File): Promise<DadosExtraidosPdf> {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    let textoCompleto = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      textoCompleto += this.reconstruirLinhas(content.items as any[]) + '\n\n';
    }

    console.log('[PdfExtractor] Texto extraído:\n', textoCompleto);
    return this.parseTexto(textoCompleto);
  }

  private reconstruirLinhas(items: any[]): string {
    const porLinha = new Map<number, string[]>();
    for (const item of items) {
      const y = Math.round(item.transform[5]);
      if (!porLinha.has(y)) porLinha.set(y, []);
      porLinha.get(y)!.push(item.str);
    }
    return Array.from(porLinha.keys())
      .sort((a, b) => b - a)
      .map(y => porLinha.get(y)!.join(' '))
      .join('\n');
  }

  private parseTexto(texto: string): DadosExtraidosPdf {
    return {
      codigo:        this.extrairCodigo(texto),
      data_limite:   null,
      numero_nf:     this.extrairNumeroNf(texto),
      data_emissao:  this.extrairData(texto),
      valor_total:   this.extrairValorTotal(texto),
      nome_emitente: this.extrairNomeEmitente(texto),
      cnpj_emitente: this.extrairCnpj(texto),
      itens:         this.extrairItens(texto),
      duplicatas:    [],
    };
  }

  private extrairCodigo(texto: string): string | null {
    const match = texto.match(/(\d{7}KPN)/i);
    return match ? match[1].toUpperCase() : null;
  }

  private extrairNumeroNf(texto: string): string | null {
    const matchNo    = texto.match(/\bN[oº°]\.\s*(\d{1,9})/);
    const matchSerie = texto.match(/\bS[EeÉé]RIE\s*\.?\s*(\d{1,3})/i);
    if (matchNo && matchSerie) {
      return `${matchNo[1].padStart(9, '0')}-${matchSerie[1]}`;
    }
    const fallback = texto.match(/N[º°]\s+(\d+)\s+S[EeÉé]RIE\s+(\d+)/i);
    if (fallback) {
      return `${fallback[1].padStart(9, '0')}-${fallback[2]}`;
    }
    return null;
  }

  // "DATA DA EMISSÃO" é o último cabeçalho da linha; seu valor é o último date da linha seguinte
  private extrairData(texto: string): string | null {
    const m = texto.match(/DATA\s+DA\s+EMISS[ÃA]O[^\n]*\n([^\n]+)/i) ??
              texto.match(/DATA\s+DE\s+EMISS[ÃA]O[^\n]*\n([^\n]+)/i);
    if (!m) return null;
    const datas = m[1].match(/\d{2}[.\/]\d{2}[.\/]\d{4}/g);
    if (!datas?.length) return null;
    // Primeira data da linha de valores = emissão (saída/entrada vem na próxima linha)
    const [dia, mes, ano] = datas[0].split(/[.\/]/);
    return `${ano}-${mes}-${dia}`;
  }

  // "VALOR TOTAL DA NF" é o último cabeçalho; pega o último valor monetário da linha seguinte
  private extrairValorTotal(texto: string): number | null {
    const m = texto.match(/VALOR\s+TOTAL\s+DA\s+NF[^\n]*\n([^\n]+)/i);
    if (!m) return null;
    const numeros = m[1].match(/\d{1,3}(?:\.\d{3})*,\d{2}/g);
    if (!numeros?.length) return null;
    return this.parseMoeda(numeros[numeros.length - 1]);
  }

  // Primeiro cabeçalho "CNPJ" = seção do emitente; a linha seguinte contém o número formatado
  private extrairCnpj(texto: string): string | null {
    const m = texto.match(/\bCNPJ\b[^\n]*\n([^\n]+)/i);
    if (!m) return null;
    const cnpj = m[1].match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    return cnpj ? cnpj[0].replace(/\D/g, '') : null;
  }

  private extrairNomeEmitente(texto: string): string | null {
    // Faixa de recebimento: "RECEBEMOS DE [nome] LT OS PRODUTOS"
    const recebemos = texto.match(/RECEBEMOS\s+DE\s+(.+?)\s+(?:LT\b|OS\s+PRODUTOS)/i);
    if (recebemos) return recebemos[1].trim().substring(0, 100);
    return null;
  }

  // Itens do DANFE — âncora no NCM (XXXX.XX.XX)
  // Usa [\d.,]+ para capturar valores com separador de milhar (ex.: 2.308,15)
  private extrairItens(texto: string): ItemPedidoForm[] {
    const itens: ItemPedidoForm[] = [];
    const unidades = 'UN|KG|CX|PC|LT|M|PAR|GR|MT|TON|L|ML|FD|SC|BD|CT|DZ|PT|RL|VD|AMP|BIS|CAP|ENV|FR|TB';
    const regex = new RegExp(
      `(\\d{7,13})\\s+(.+?)\\s+\\d{4}\\.\\d{2}\\.\\d{2}\\s+\\d{3}\\s+\\d{4}\\s+(${unidades})\\s+([\\d.,]+)\\s+([\\d.,]+)\\s+([\\d.,]+)`,
      'g'
    );

    let match;
    while ((match = regex.exec(texto)) !== null) {
      const descricao = match[2].trim();
      if (/^Lote:/i.test(descricao)) continue;

      itens.push({
        c_prod:         null,
        ean:            match[1] || null,
        descricao,
        unidade:        match[3],
        quantidade:     this.parseMoeda(match[4]),
        valor_unitario: this.parseMoeda(match[5]),
        valor_total:    this.parseMoeda(match[6]),
        venda_unitario: null,
        venda_total:    null,
      });
    }
    return itens;
  }

  private parseMoeda(valor: string): number {
    const temVirgula = valor.includes(',');
    const temPonto   = valor.includes('.');
    if (temVirgula && temPonto) {
      return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
    }
    if (temVirgula) {
      return parseFloat(valor.replace(',', '.')) || 0;
    }
    return parseFloat(valor) || 0;
  }
}
