import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PageHeaderService {
  private readonly _subtitle = signal<string | null>(null);
  readonly subtitle = this._subtitle.asReadonly();

  setSubtitle(text: string | null): void {
    this._subtitle.set(text);
  }
}
