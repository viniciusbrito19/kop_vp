import { Injectable } from '@angular/core';
import { DadosExtraidosPdf, ItemPedidoForm } from '../models/pedido.model';

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
      itens.push({
        descricao:      f('xProd'),
        quantidade:     parseFloat(f('qCom')) || 0,
        unidade:        f('uCom') || null,
        valor_unitario: parseFloat(f('vUnCom')) || null,
        valor_total:    parseFloat(f('vProd')) || null,
      });
    }

    return {
      codigo:        null,
      numero_nf,
      data_emissao,
      valor_total,
      nome_emitente: this.tag(doc, 'xNome'),
      cnpj_emitente: this.tag(doc, 'CNPJ'),
      itens,
    };
  }
}
