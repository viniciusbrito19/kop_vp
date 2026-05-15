// components.jsx — shared UI primitives for Kop VP

// ─────────────────────────────────────────────────────────────
// Icons (24px stroke). Hand-curated to keep weight consistent.
// ─────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, stroke = 1.6, style }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', style };
  switch (name) {
    case 'orders':       return <svg {...props}><path d="M8 4h9l4 4v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M17 4v4h4"/><path d="M10 12h8M10 16h6M10 8h3"/></svg>;
    case 'suppliers':    return <svg {...props}><path d="M3 9 5 4h14l2 5"/><path d="M3 9v11h18V9"/><path d="M3 9h18"/><path d="M9 9v3a3 3 0 0 0 6 0V9"/></svg>;
    case 'stock':        return <svg {...props}><path d="M3 7h18v13H3z"/><path d="M3 7l3-4h12l3 4"/><path d="M10 12h4"/></svg>;
    case 'finance':      return <svg {...props}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v.01M18 14v.01"/></svg>;
    case 'tags':         return <svg {...props}><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z"/><circle cx="8" cy="8" r="1.5"/></svg>;
    case 'dashboard':    return <svg {...props}><rect x="3" y="3" width="8" height="9" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="14" width="8" height="7" rx="1.5"/></svg>;
    case 'search':       return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'plus':         return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'chev-right':   return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case 'chev-down':    return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case 'chev-left':    return <svg {...props}><path d="m15 6-6 6 6 6"/></svg>;
    case 'arrow-left':   return <svg {...props}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
    case 'arrow-up-right': return <svg {...props}><path d="M7 17 17 7M9 7h8v8"/></svg>;
    case 'arrow-down-right': return <svg {...props}><path d="M7 7l10 10M17 9v8H9"/></svg>;
    case 'kebab':        return <svg {...props}><circle cx="12" cy="5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="19" r="1.3" fill="currentColor"/></svg>;
    case 'calendar':     return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>;
    case 'filter':       return <svg {...props}><path d="M3 5h18l-7 9v5l-4 2v-7L3 5Z"/></svg>;
    case 'download':     return <svg {...props}><path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14"/></svg>;
    case 'upload':       return <svg {...props}><path d="M12 20V8m0 0-4 4m4-4 4 4M5 4h14"/></svg>;
    case 'check':        return <svg {...props}><path d="m5 12 5 5 9-11"/></svg>;
    case 'x':            return <svg {...props}><path d="M6 6l12 12M6 18 18 6"/></svg>;
    case 'edit':         return <svg {...props}><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m14.5 5.5 4 4"/></svg>;
    case 'trash':        return <svg {...props}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14"/></svg>;
    case 'paid':         return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>;
    case 'pending':      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'overdue':      return <svg {...props}><path d="M12 3 22 20H2L12 3Z"/><path d="M12 10v4M12 17v.01"/></svg>;
    case 'note':         return <svg {...props}><path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M8 10h8M8 14h6"/></svg>;
    case 'truck':        return <svg {...props}><path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>;
    case 'cocoa':        return <svg {...props}><path d="M5 12c0-4 3-7 7-7s7 3 7 7-3 7-7 7-7-3-7-7Z"/><path d="M9 9c.8 1 2 1.5 3 1.5s2.2-.5 3-1.5M9 14c.8 1 2 1.5 3 1.5s2.2-.5 3-1.5"/></svg>;
    case 'bell':         return <svg {...props}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case 'menu':         return <svg {...props}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
    case 'collapse':     return <svg {...props}><path d="M9 4v16"/><path d="m16 9-3 3 3 3"/></svg>;
    case 'expand':       return <svg {...props}><path d="M9 4v16"/><path d="m13 9 3 3-3 3"/></svg>;
    case 'sun':          return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    case 'moon':         return <svg {...props}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>;
    case 'home':         return <svg {...props}><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/></svg>;
    case 'trend':        return <svg {...props}><path d="M3 17 9 11l4 4 8-8"/><path d="M14 7h7v7"/></svg>;
    case 'repeat':       return <svg {...props}><path d="M17 2l3 3-3 3"/><path d="M4 12V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 12v3a4 4 0 0 1-4 4H4"/></svg>;
    case 'wallet':       return <svg {...props}><path d="M3 7v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3"/><path d="M21 12V8a1 1 0 0 0-1-1H5a2 2 0 0 1 0-4h15v4"/><circle cx="17" cy="13" r="1.4" fill="currentColor"/></svg>;
    case 'lightning':    return <svg {...props}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>;
    case 'target':       return <svg {...props}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>;
    default: return null;
  }
};

// ─────────────────────────────────────────────────────────────
// Logo — chocolate bar mark in bordô + dourado
// ─────────────────────────────────────────────────────────────
const KopLogo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id="kopg" x1="0" y1="0" x2="40" y2="40">
        <stop offset="0%" stopColor="#C2965A"/>
        <stop offset="100%" stopColor="#82622F"/>
      </linearGradient>
    </defs>
    {/* outer chocolate bar */}
    <rect x="3" y="7" width="28" height="28" rx="6" transform="rotate(-12 17 21)" fill="#7A1F2B"/>
    <rect x="3" y="7" width="28" height="28" rx="6" transform="rotate(-12 17 21)" fill="url(#kopg)" opacity="0.18"/>
    {/* inner grid lines (chocolate squares) */}
    <g transform="rotate(-12 17 21)" stroke="#FAEFE0" strokeWidth="1" opacity="0.32">
      <line x1="12" y1="7" x2="12" y2="35"/>
      <line x1="22" y1="7" x2="22" y2="35"/>
      <line x1="3" y1="16" x2="31" y2="16"/>
      <line x1="3" y1="26" x2="31" y2="26"/>
    </g>
    {/* gold inlay */}
    <rect x="18" y="3" width="20" height="20" rx="4" transform="rotate(8 28 13)" fill="url(#kopg)"/>
    <text x="28" y="18" textAnchor="middle" fill="#5A1620" fontFamily="Instrument Serif, Georgia" fontSize="14" fontStyle="italic" transform="rotate(8 28 13)">k</text>
  </svg>
);

// ─────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', icon: 'dashboard', label: 'Visão Geral' },
  { id: 'pedidos',   icon: 'orders',    label: 'Pedidos', badge: '12' },
  { id: 'forn',      icon: 'suppliers', label: 'Fornecedores' },
{ id: 'fin',       icon: 'finance',   label: 'Financeiro' },
  { id: 'despesas',  icon: 'wallet',    label: 'Despesas' },
  { id: 'fluxo',     icon: 'trend',     label: 'Fluxo de Caixa' },
  { id: 'tipos',     icon: 'tags',      label: 'Tipos de Pedido' },
];

const Sidebar = ({ active = 'pedidos', collapsed = false }) => (
  <aside className={'sb ' + (collapsed ? 'collapsed' : '')} style={{ width: collapsed ? 72 : 232, flex: '0 0 auto', borderRight: '1px solid var(--sb-rule)' }}>
    <div className="sb-brand">
      <KopLogo size={collapsed ? 34 : 38}/>
      {!collapsed && (
        <div className="col">
          <span className="sb-brand-name">Kop VP</span>
          <span className="sb-brand-tag">Chocolataria</span>
        </div>
      )}
    </div>
    <div className="sb-section-label">Operação</div>
    <nav className="sb-nav">
      {NAV.map(n => (
        <div key={n.id} className={'sb-item ' + (n.id === active ? 'active' : '')}>
          <Icon name={n.icon} size={18}/>
          <span className="lbl">{n.label}</span>
          {n.badge && <span className="badge">{n.badge}</span>}
        </div>
      ))}
    </nav>
    <div className="sb-footer">
      <div className="sb-avatar">VP</div>
      {!collapsed && (
        <div className="col who">
          <span style={{ fontSize: 13, fontWeight: 600 }}>Valéria P.</span>
          <span style={{ fontSize: 11, color: 'var(--sb-fg-dim)' }}>Proprietária</span>
        </div>
      )}
    </div>
  </aside>
);

// ─────────────────────────────────────────────────────────────
// Status chip — pago / parcial / aberto / atrasado
// ─────────────────────────────────────────────────────────────
const StatusChip = ({ status, size = 'md' }) => {
  const map = {
    pago:     { cls: 'ok',   label: 'Pago',     icon: 'check' },
    parcial:  { cls: 'warn', label: 'Parcial',  icon: 'pending' },
    aberto:   { cls: 'info', label: 'Em aberto', icon: 'pending' },
    atrasado: { cls: 'bad',  label: 'Atrasado', icon: 'overdue' },
    recebido: { cls: 'ok',   label: 'Recebido', icon: 'check' },
    pendente: { cls: 'warn', label: 'A receber', icon: 'truck' },
  };
  const s = map[status] || map.aberto;
  return (
    <span className={'pill ' + s.cls} style={{ fontSize: size === 'sm' ? 11 : 12 }}>
      <Icon name={s.icon} size={size === 'sm' ? 11 : 13} stroke={2}/>
      {s.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// KPI card
// ─────────────────────────────────────────────────────────────
const KPI = ({ label, value, cents, foot, trend, icon, tone = 'default' }) => (
  <div className={'kpi ' + (tone === 'bordo' ? 'bordo' : tone === 'gold' ? 'gold' : tone === 'danger' ? 'danger' : '')}>
    <div className="kpi-label">
      {icon && <Icon name={icon} size={14}/>}
      {label}
    </div>
    <div className="kpi-value">
      {value}{cents && <span className="cents">,{cents}</span>}
    </div>
    {foot && (
      <div className="kpi-foot">
        {trend && (
          <span className={'trend ' + trend.dir}>
            <Icon name={trend.dir === 'up' ? 'arrow-up-right' : 'arrow-down-right'} size={12} stroke={2.4}/>
            {' '}{trend.value}
          </span>
        )}
        <span>{foot}</span>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Mini sparkline / bar chart for finance section
// ─────────────────────────────────────────────────────────────
const Sparkline = ({ data, height = 56, color = 'var(--bordo)' }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 100; const h = 100;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <polygon points={area} fill={color} opacity="0.12"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Tiny bar chart
// ─────────────────────────────────────────────────────────────
const BarChart = ({ data, height = 140 }) => {
  const max = Math.max(...data.map(d => Math.max(d.in, d.out)));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: 12, alignItems: 'end', height }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4, width: '100%', justifyContent: 'center' }}>
            <div style={{ width: 12, height: `${(d.in / max) * 100}%`, background: 'var(--ok)', borderRadius: 4 }}/>
            <div style={{ width: 12, height: `${(d.out / max) * 100}%`, background: 'var(--bordo)', borderRadius: 4 }}/>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 600 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

Object.assign(window, { Icon, KopLogo, Sidebar, NAV, StatusChip, KPI, Sparkline, BarChart });
