import { Injectable } from '@angular/core';
import { DadosExtraidosPdf, DuplicataExtraida, ItemPedidoForm } from '../models/pedido.model';

@Injectable({ providedIn: 'root' })
export class XmlExtractorService {

  extrair(file: File): Promise<DadosExtraidosPdf> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const doc = new DOMParser().parseFromString(e.target!.result as string, 'text/xml');
          resolve(this.parseDoc(doc));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file, 'utf-8');
    });
  }

  private tag(ctx: Document | Element, nome: string): string | null {
    return (ctx as Document).getElementsByTagNameNS('*', nome)[0]?.textContent?.trim() ?? null;
  }

  private parseDoc(doc: Document): DadosExtraidosPdf {
    const nNF  = this.tag(doc, 'nNF');
    const serie = this.tag(doc, 'serie');
    const numero_nf = nNF && serie !== null
      ? `${nNF.padStart(9, '0')}-${serie}`
      : null;

    const dhEmi = this.tag(doc, 'dhEmi');
    const data_emissao = dhEmi ? dhEmi.substring(0, 10) : null;

    const vNF = this.tag(doc, 'vNF');
    const valor_total = vNF ? parseFloat(vNF) : null;

    const dets = doc.getElementsByTagNameNS('*', 'det');
    const itens: ItemPedidoForm[] = [];
    for (let i = 0; i < dets.length; i++) {
      const det = dets[i];
      const f = (t: string) => det.getElementsByTagNameNS('*', t)[0]?.textContent?.trim() ?? '';
      const cEAN = f('cEAN');
      itens.push({
        descricao:      f('xProd'),
        quantidade:     parseFloat(f('qCom')) || 0,
        unidade:        f('uCom') || null,
        valor_unitario: parseFloat(f('vUnCom')) || null,
        valor_total:    parseFloat(f('vProd')) || null,
        ean:            (cEAN && cEAN !== 'SEM GTIN') ? cEAN : null,
        venda_unitario: null,
        venda_total:    null,
      });
    }

    const xPedRaw  = this.tag(doc, 'xPed');
    const xPed     = xPedRaw && /^\d{7}KPN$/i.test(xPedRaw) ? xPedRaw : null;
    const infCpl   = this.tag(doc, 'infCpl');
    const infAdProd = this.tag(doc, 'infAdProd');
    const reqMatch       = infCpl?.match(/\/\/\s*REQ\s+(\d+)/);
    const pedEmpresaMatch = infAdProd?.match(/Pedido Empresa:\s*(\d+)/);
    const codigo   = xPed ?? reqMatch?.[1] ?? pedEmpresaMatch?.[1] ?? null;

    const nFat = this.tag(doc, 'nFat');
    const dupEls = doc.getElementsByTagNameNS('*', 'dup');
    const duplicatas: DuplicataExtraida[] = [];
    for (let i = 0; i < dupEls.length; i++) {
      const dup = dupEls[i];
      const f = (t: string) => dup.getElementsByTagNameNS('*', t)[0]?.textContent?.trim() ?? '';
      const nDup = f('nDup');
      const dVenc = f('dVenc');
      const vDup  = parseFloat(f('vDup')) || 0;
      duplicatas.push({
        codigo:          nFat ? `${nFat}/${nDup}` : nDup,
        data_vencimento: dVenc || null,
        valor:           vDup,
      });
    }

    if (!xPed && reqMatch && duplicatas.length === 0) {
      const pm = infCpl?.match(/PARCELAS:\s*(\d{2})\/(\d{2})\/(\d{2})/);
      duplicatas.push({
        codigo:          `${reqMatch[1]}/001`,
        data_vencimento: pm ? `20${pm[3]}-${pm[2]}-${pm[1]}` : null,
        valor:           valor_total ?? 0,
      });
    }

    return {
      codigo,
      data_limite: xPed ? null : data_emissao,
      numero_nf,
      data_emissao,
      valor_total,
      nome_emitente: this.tag(doc, 'xNome'),
      cnpj_emitente: this.tag(doc, 'CNPJ'),
      itens,
      duplicatas,
    };
  }
}
