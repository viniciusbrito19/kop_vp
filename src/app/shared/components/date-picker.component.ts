import {
  Component, Input, Output, EventEmitter,
  HostListener, ElementRef, inject, computed, signal,
} from '@angular/core';

type Cell = { d: number; iso: string; cur: boolean; today: boolean; sel: boolean };

@Component({
  selector: 'app-date-picker',
  standalone: true,
  template: `
    <input
      class="dp-input"
      type="text"
      [value]="_display()"
      [placeholder]="placeholder"
      maxlength="10"
      (click)="toggleOpen($event)"
      (input)="onType($event)"
    />
    @if (_display()) {
      <button class="dp-clear" (click)="clear($event)" tabindex="-1" type="button">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    }
    @if (_open()) {
      <div class="dp-cal" (click)="$event.stopPropagation()">
        <div class="dp-cal-head">
          <button class="dp-nav" type="button" (click)="prevMonth($event)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span class="dp-cal-title">{{ calTitle() }}</span>
          <button class="dp-nav" type="button" (click)="nextMonth($event)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
        <div class="dp-weekdays">
          @for (d of weekdays; track d) { <span>{{ d }}</span> }
        </div>
        <div class="dp-grid">
          @for (cell of cells(); track cell.iso) {
            <button
              class="dp-cell"
              type="button"
              [class.dp-other]="!cell.cur"
              [class.dp-today]="cell.today"
              [class.dp-sel]="cell.sel"
              (click)="pick(cell, $event)">
              {{ cell.d }}
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      position: relative;
      flex: 1;
      gap: 4px;
    }

    .dp-input {
      flex: 1;
      min-width: 0;
      border: 0;
      background: transparent;
      font-size: 13px;
      color: var(--text-2);
      font-family: inherit;
      outline: none;
      cursor: text;
    }
    .dp-input::placeholder { color: var(--text-4); }

    .dp-clear {
      border: 0;
      background: transparent;
      padding: 2px;
      cursor: pointer;
      color: var(--text-3);
      display: flex;
      align-items: center;
      line-height: 1;
      flex-shrink: 0;
    }
    .dp-clear:hover { color: var(--bad); }

    /* Calendar dropdown */
    .dp-cal {
      position: absolute;
      top: calc(100% + 10px);
      left: 0;
      z-index: 300;
      background: var(--surface);
      border: 1px solid var(--line-2);
      border-radius: 14px;
      box-shadow: var(--shadow-md);
      padding: 14px;
      width: 272px;
    }

    .dp-cal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .dp-cal-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      text-transform: capitalize;
    }
    .dp-nav {
      border: 0;
      background: transparent;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      color: var(--text-3);
      display: flex;
      align-items: center;
    }
    .dp-nav:hover { background: var(--surface-2); color: var(--text); }

    .dp-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      margin-bottom: 4px;
    }
    .dp-weekdays span {
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-4);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 4px 0;
    }

    .dp-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }
    .dp-cell {
      border: 0;
      background: transparent;
      cursor: pointer;
      font-size: 13px;
      color: var(--text);
      font-family: inherit;
      border-radius: 8px;
      padding: 6px 0;
      text-align: center;
      line-height: 1;
      transition: background 0.1s;
    }
    .dp-cell:hover:not(.dp-sel) { background: var(--surface-2); }
    .dp-cell.dp-other { color: var(--text-4); }
    .dp-cell.dp-today:not(.dp-sel) { font-weight: 700; color: var(--bordo); }
    .dp-cell.dp-sel {
      background: var(--bordo);
      color: #fff;
      font-weight: 600;
    }
  `],
})
export class DatePickerComponent {
  private host = inject(ElementRef);

  @Input() placeholder = 'dd/mm/aaaa';
  @Output() valueChange = new EventEmitter<string>();

  @Input() set value(iso: string) {
    if (!iso) { this._display.set(''); this._selected.set(''); return; }
    if (iso === this._selected()) return;
    this._selected.set(iso);
    const [y, m, d] = iso.split('-');
    this._display.set(`${d}/${m}/${y}`);
    this._viewYear.set(+y);
    this._viewMonth.set(+m - 1);
  }

  _display   = signal('');
  _selected  = signal('');
  _open      = signal(false);
  _viewYear  = signal(new Date().getFullYear());
  _viewMonth = signal(new Date().getMonth());

  readonly weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  readonly calTitle = computed(() =>
    new Date(this._viewYear(), this._viewMonth(), 1)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  );

  readonly cells = computed((): Cell[] => {
    const y = this._viewYear(), m = this._viewMonth(), sel = this._selected();
    const todayIso = new Date().toISOString().slice(0, 10);
    const pad = (n: number) => String(n).padStart(2, '0');
    const mkIso = (yr: number, mo: number, day: number) =>
      `${yr}-${pad(mo + 1)}-${pad(day)}`;

    const firstDow    = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev  = new Date(y, m, 0).getDate();
    const result: Cell[] = [];

    for (let i = firstDow - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const [py, pm] = m === 0 ? [y - 1, 11] : [y, m - 1];
      const iso = mkIso(py, pm, d);
      result.push({ d, iso, cur: false, today: iso === todayIso, sel: iso === sel });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = mkIso(y, m, d);
      result.push({ d, iso, cur: true, today: iso === todayIso, sel: iso === sel });
    }
    for (let d = 1; result.length < 42; d++) {
      const [ny, nm] = m === 11 ? [y + 1, 0] : [y, m + 1];
      const iso = mkIso(ny, nm, d);
      result.push({ d, iso, cur: false, today: iso === todayIso, sel: iso === sel });
    }
    return result;
  });

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.host.nativeElement.contains(e.target)) this._open.set(false);
  }

  toggleOpen(e: MouseEvent) { e.stopPropagation(); this._open.update(v => !v); }

  prevMonth(e: MouseEvent) {
    e.stopPropagation();
    if (this._viewMonth() === 0) { this._viewMonth.set(11); this._viewYear.update(y => y - 1); }
    else this._viewMonth.update(m => m - 1);
  }

  nextMonth(e: MouseEvent) {
    e.stopPropagation();
    if (this._viewMonth() === 11) { this._viewMonth.set(0); this._viewYear.update(y => y + 1); }
    else this._viewMonth.update(m => m + 1);
  }

  pick(cell: Cell, e: MouseEvent) {
    e.stopPropagation();
    this._selected.set(cell.iso);
    const [y, m, d] = cell.iso.split('-');
    this._display.set(`${d}/${m}/${y}`);
    this.valueChange.emit(cell.iso);
    this._open.set(false);
  }

  onType(e: Event) {
    const inp = e.target as HTMLInputElement;
    const raw = inp.value.replace(/\D/g, '').slice(0, 8);
    let fmt = '';
    if (raw.length > 0) fmt = raw.slice(0, 2);
    if (raw.length > 2) fmt += '/' + raw.slice(2, 4);
    if (raw.length > 4) fmt += '/' + raw.slice(4, 8);
    this._display.set(fmt);
    inp.value = fmt;

    if (raw.length === 8) {
      const dd = +raw.slice(0, 2), mm = +raw.slice(2, 4) - 1, yyyy = +raw.slice(4, 8);
      const date = new Date(yyyy, mm, dd);
      if (date.getFullYear() === yyyy && date.getMonth() === mm && date.getDate() === dd) {
        const iso = `${yyyy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        this._selected.set(iso);
        this._viewYear.set(yyyy);
        this._viewMonth.set(mm);
        this.valueChange.emit(iso);
      }
    } else if (raw.length === 0) {
      this._selected.set('');
      this.valueChange.emit('');
    }
  }

  clear(e: MouseEvent) {
    e.stopPropagation();
    this._display.set('');
    this._selected.set('');
    this.valueChange.emit('');
    this._open.set(false);
  }
}
