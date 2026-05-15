// screens-cashflow.jsx — Fluxo de Caixa (desktop + mobile)

// ─────────────────────────────────────────────────────────────
// Combo chart: barras entradas/saídas + linha de saldo + área de projeção
// ─────────────────────────────────────────────────────────────
const FluxoComboChart = ({ data, projection = [], height = 280 }) => {
  const W = 920, H = height;
  const PAD = { l: 60, r: 30, t: 30, b: 36 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const all = [...data, ...projection];
  const max = Math.max(...all.map(d => Math.max(d.in, d.out, d.hi || 0))) * 1.05;
  const min = 0;

  const barGroupW = innerW / all.length;
  const barW = Math.min(16, barGroupW * 0.34);
  const barGap = 4;

  const yFor = v => PAD.t + innerH - ((v - min) / (max - min)) * innerH;
  const xCenter = i => PAD.l + barGroupW * i + barGroupW / 2;

  // Saldo (in - out)
  const saldo = all.map(d => d.in - d.out);
  const linePts = saldo.map((s, i) => `${xCenter(i)},${yFor(s)}`).join(' ');

  // Tick lines
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => min + ((max - min) * i / ticks));

  const projectionStart = data.length;
  const projectionX = PAD.l + barGroupW * projectionStart;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="grIn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--ok)" stopOpacity="0.95"/>
          <stop offset="100%" stopColor="var(--ok)" stopOpacity="0.75"/>
        </linearGradient>
        <linearGradient id="grOut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--bordo)"  stopOpacity="0.95"/>
          <stop offset="100%" stopColor="var(--bordo-2)" stopOpacity="0.75"/>
        </linearGradient>
        <pattern id="projPattern" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--text-4)" strokeWidth="1" opacity="0.18"/>
        </pattern>
      </defs>

      {/* Projection zone background */}
      {projection.length > 0 && (
        <g>
          <rect x={projectionX} y={PAD.t} width={innerW - barGroupW * data.length} height={innerH}
                fill="url(#projPattern)"/>
          <text x={projectionX + 10} y={PAD.t + 16} fontSize="10" fill="var(--text-3)"
                fontWeight="700" letterSpacing="1.4">PROJEÇÃO</text>
        </g>
      )}

      {/* Grid lines + Y axis labels */}
      {tickVals.map((v, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={W - PAD.r} y1={yFor(v)} y2={yFor(v)}
                stroke="var(--line)" strokeDasharray={i === 0 ? '0' : '2 4'}/>
          <text x={PAD.l - 10} y={yFor(v) + 4} fontSize="10" fill="var(--text-3)" textAnchor="end">
            {v >= 1000 ? `${Math.round(v / 1000)}k` : v}
          </text>
        </g>
      ))}

      {/* Bars */}
      {all.map((d, i) => {
        const proj = i >= data.length;
        const cx = xCenter(i);
        const inX = cx - barW - barGap / 2;
        const outX = cx + barGap / 2;
        return (
          <g key={i}>
            <rect x={inX} y={yFor(d.in)} width={barW} height={Math.max(2, yFor(0) - yFor(d.in))}
                  rx="3" fill="url(#grIn)" opacity={proj ? 0.55 : 1}/>
            <rect x={outX} y={yFor(d.out)} width={barW} height={Math.max(2, yFor(0) - yFor(d.out))}
                  rx="3" fill="url(#grOut)" opacity={proj ? 0.55 : 1}/>
          </g>
        );
      })}

      {/* Saldo line */}
      <polyline points={linePts} fill="none" stroke="var(--gold)" strokeWidth="2.5"
                strokeLinejoin="round" strokeLinecap="round" strokeDasharray={projection.length ? `${innerW * data.length / all.length},${innerW * projection.length / all.length}` : '0'}/>
      {/* Saldo line (projection dashed) */}
      {projection.length > 0 && (
        <polyline points={saldo.slice(data.length - 1).map((s, i) => `${xCenter(data.length - 1 + i)},${yFor(s)}`).join(' ')}
                  fill="none" stroke="var(--gold)" strokeWidth="2.5"
                  strokeLinejoin="round" strokeDasharray="4 4"/>
      )}
      {/* Saldo dots */}
      {saldo.map((s, i) => (
        <circle key={i} cx={xCenter(i)} cy={yFor(s)} r="3.5"
                fill="var(--surface)" stroke="var(--gold)" strokeWidth="2"/>
      ))}

      {/* X axis labels */}
      {all.map((d, i) => (
        <text key={i} x={xCenter(i)} y={H - 14} fontSize="11"
              fill={i >= data.length ? 'var(--text-3)' : 'var(--text-2)'}
              fontWeight={i === data.length - 1 ? 700 : 500} textAnchor="middle">
          {d.m}{i === 0 || d.m === 'Jan' ? `/${d.y}` : ''}
        </text>
      ))}

      {/* Highlight current month */}
      <line x1={xCenter(data.length - 1)} y1={PAD.t} x2={xCenter(data.length - 1)} y2={PAD.t + innerH}
            stroke="var(--bordo)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"/>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Donut chart for despesas por categoria
// ─────────────────────────────────────────────────────────────
const DonutChart = ({ data, size = 200, thickness = 30, label, sub }) => {
  const total = data.reduce((a, b) => a + b.valor, 0);
  const cx = size / 2, cy = size / 2;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness}/>
      {data.map((d, i) => {
        const frac = d.valor / total;
        const len = frac * circ;
        const dashArr = `${len} ${circ - len}`;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                  stroke={d.cor} strokeWidth={thickness}
                  strokeDasharray={dashArr}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  style={{ transition: 'stroke-dasharray 0.4s ease' }}/>
        );
        offset += len;
        return el;
      })}
      {label && (
        <g>
          <text x={cx} y={cy - 2} textAnchor="middle"
                fontFamily="Instrument Serif, Georgia" fontSize="22" fill="var(--text)">
            {label}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle"
                fontSize="10" fill="var(--text-4)" fontWeight="600" letterSpacing="1.4">
            {sub}
          </text>
        </g>
      )}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Break-even progress: faturamento atual do mês vs custo fixo
// ─────────────────────────────────────────────────────────────
const BreakEvenGauge = ({ revenue, fixedCost }) => {
  const pct = Math.min(100, (revenue / fixedCost) * 100);
  const done = pct >= 100;
  const W = 100, H = 56;
  const cx = W / 2, cy = H - 6;
  const r = 44;
  const start = Math.PI;
  const end = 2 * Math.PI;
  const arc = (frac, color, w) => {
    const a = start + (end - start) * frac;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(a);
    const y2 = cy + r * Math.sin(a);
    return <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x2} ${y2}`}
                 fill="none" stroke={color} strokeWidth={w} strokeLinecap="round"/>;
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 140, height: 78 }}>
        {arc(1, 'var(--surface-2)', 8)}
        {arc(pct / 100, done ? 'var(--ok)' : 'var(--bordo)', 8)}
      </svg>
      <div style={{ fontFamily: 'Instrument Serif, Georgia', fontSize: 28, marginTop: -22, color: done ? 'var(--ok)' : 'var(--bordo)' }}>
        {Math.round(pct)}%
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>do custo fixo coberto</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Tela principal — Fluxo de Caixa (Desktop)
// ─────────────────────────────────────────────────────────────
const FluxoCaixaScreen = ({ collapsedSidebar = false }) => {
  const [period, setPeriod] = React.useState('12m');
  const [view, setView] = React.useState('mensal');

  const fixedTotal = DESPESAS_FIXAS.reduce((a, b) => a + b.valor, 0);
  const fixedPaid = DESPESAS_FIXAS.filter(d => d.pago).reduce((a, b) => a + b.valor, 0);
  const fixedDue = fixedTotal - fixedPaid;

  const last = FLUXO_MESES[FLUXO_MESES.length - 1];
  const prev = FLUXO_MESES[FLUXO_MESES.length - 2];
  const saldoMes = last.in - last.out;
  const saldoMesAnt = prev.in - prev.out;
  const margem = (saldoMes / last.in) * 100;

  const last12 = FLUXO_MESES.reduce((a, b) => ({ in: a.in + b.in, out: a.out + b.out }), { in: 0, out: 0 });
  const ticketDiario = last.in / 30;
  const breakevenDiario = fixedTotal / 30;
  const diasParaBreak = Math.ceil(fixedTotal / ticketDiario);

  const totalDespesas = DESPESAS_CATEGORIAS.reduce((a, b) => a + b.valor, 0);

  return (
    <div className="kop app" data-screen-label="Fluxo de Caixa">
      <Sidebar active="fluxo" collapsed={collapsedSidebar}/>
      <div className="main">
        <Topbar crumbs={['Financeiro', 'Fluxo de Caixa']}/>
        <div className="content">

          {/* Header */}
          <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
            <div>
              <h1 className="page">Fluxo de <span className="accent serif">caixa</span></h1>
              <div className="page-sub">Quanto sua loja custa por mês · o que entra e o que sai · onde você estará daqui a 3 meses</div>
            </div>
            <div className="row gap-2">
              <div className="seg">
                {['3m', '6m', '12m', 'YTD'].map(p => (
                  <button key={p} className={period === p ? 'on' : ''} onClick={() => setPeriod(p)}>{p}</button>
                ))}
              </div>
              <div className="sep"/>
              <button className="btn outline"><Icon name="download" size={16}/> Exportar</button>
            </div>
          </div>

          {/* Hero KPI row — break-even em destaque */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 14, marginBottom: 22 }}>
            <div className="kpi bordo" style={{ padding: 22 }}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 18 }}>
                <div style={{ flex: 1 }}>
                  <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="target" size={14}/> CUSTO FIXO MENSAL
                  </div>
                  <div className="serif" style={{ fontSize: 44, lineHeight: 1.05, marginTop: 4 }}>
                    {fmtCompact(fixedTotal)}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.78, marginTop: 6, lineHeight: 1.5 }}>
                    é quanto a loja gasta todo mês para abrir as portas.<br/>
                    <b style={{ opacity: 1 }}>{fmtCompact(breakevenDiario)}/dia</b> é o break-even diário · meta atingida em <b style={{ opacity: 1 }}>{diasParaBreak} dias</b>
                  </div>
                </div>
                <BreakEvenGauge revenue={last.in} fixedCost={fixedTotal}/>
              </div>
            </div>

            <KPI label="ENTRADAS · MAI"     icon="arrow-up-right"   value={fmtCompact(last.in)}  foot={`vs ${fmtCompact(prev.in)} em abr`} trend={{ dir: 'up', value: `+${Math.round(((last.in / prev.in) - 1) * 100)}%` }}/>
            <KPI label="SAÍDAS · MAI"       icon="arrow-down-right" value={fmtCompact(last.out)} foot={`vs ${fmtCompact(prev.out)} em abr`} trend={{ dir: 'up', value: `+${Math.round(((last.out / prev.out) - 1) * 100)}%` }}/>
            <KPI tone="gold" label="MARGEM OPERACIONAL" icon="lightning"
                 value={Math.round(margem) + '%'}
                 foot={`saldo de ${fmtCompact(saldoMes)} no mês`}
                 trend={{ dir: saldoMes > saldoMesAnt ? 'up' : 'down', value: `${saldoMes > saldoMesAnt ? '+' : '-'}${Math.abs(Math.round(((saldoMes / saldoMesAnt) - 1) * 100))}%` }}/>
          </div>

          {/* Combo chart */}
          <div className="card" style={{ padding: 22, marginBottom: 22 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <h3 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>Histórico & Projeção</h3>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Últimos 12 meses + projeção de 3 meses (intervalo de confiança 85%)</div>
              </div>
              <div className="row gap-3">
                <span className="row gap-2" style={{ fontSize: 12, color: 'var(--text-2)' }}><span className="dot" style={{ background: 'var(--ok)' }}/> Entradas</span>
                <span className="row gap-2" style={{ fontSize: 12, color: 'var(--text-2)' }}><span className="dot" style={{ background: 'var(--bordo)' }}/> Saídas</span>
                <span className="row gap-2" style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  <span style={{ width: 14, height: 2, background: 'var(--gold)', display: 'inline-block', borderRadius: 999 }}/>
                  Saldo
                </span>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <FluxoComboChart data={FLUXO_MESES} projection={FLUXO_PROJ} height={280}/>
            </div>
            {/* Annotations under chart */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Maior mês</div>
                <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>Dez/25</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>R$ 168.940 — pico de Natal</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total 12 meses</div>
                <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>{fmtCompact(last12.in - last12.out)}</div>
                <div style={{ fontSize: 11, color: 'var(--ok)' }}>↑ saldo positivo · margem {Math.round(((last12.in - last12.out) / last12.in) * 100)}%</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Projeção Ago/26</div>
                <div className="serif" style={{ fontSize: 22, marginTop: 2, color: 'var(--bordo)' }}>{fmtCompact(FLUXO_PROJ[2].in - FLUXO_PROJ[2].out)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>com base na sazonalidade</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Reserva de caixa</div>
                <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>2,1 meses</div>
                <div style={{ fontSize: 11, color: 'var(--warn)' }}>↓ recomendado: 3 meses</div>
              </div>
            </div>
          </div>

          {/* Recurring + Categories */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 22 }}>
            {/* Despesas recorrentes */}
            <div className="card" style={{ padding: 22 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>Despesas recorrentes</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {DESPESAS_FIXAS.length} categorias · {DESPESAS_FIXAS.filter(d => d.pago).length} pagas · {DESPESAS_FIXAS.filter(d => !d.pago).length} a vencer
                  </div>
                </div>
                <button className="btn sm outline"><Icon name="plus" size={14}/> Nova despesa</button>
              </div>

              {/* Mini progress bar */}
              <div style={{ marginBottom: 18 }}>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-3)' }}>Progresso do mês</span>
                  <span style={{ fontWeight: 700 }}>
                    <span style={{ color: 'var(--ok)' }}>{fmtCompact(fixedPaid)}</span> de {fmtCompact(fixedTotal)}
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${(fixedPaid / fixedTotal) * 100}%`, background: 'linear-gradient(90deg, var(--bordo) 0%, var(--bordo-2) 100%)', borderRadius: 999 }}/>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                  faltam <b style={{ color: 'var(--bad)' }}>{fmtCompact(fixedDue)}</b> em despesas fixas até o fim do mês
                </div>
              </div>

              <div className="col gap-2">
                {DESPESAS_FIXAS.map((d, i) => (
                  <div key={i} className="row gap-3" style={{ padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: d.cor + '20', color: d.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                      <Icon name={d.icon} size={16}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{d.categoria}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>vence dia {d.dia} · mensal recorrente</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="serif" style={{ fontSize: 16 }}>{fmt(d.valor)}</div>
                      {d.pago
                        ? <span className="pill ok" style={{ fontSize: 10, padding: '2px 8px', marginTop: 4 }}><Icon name="check" size={10} stroke={2.4}/> pago</span>
                        : <span className="pill warn" style={{ fontSize: 10, padding: '2px 8px', marginTop: 4 }}><Icon name="pending" size={10} stroke={2}/> a vencer</span>}
                    </div>
                  </div>
                ))}
                <div className="row" style={{ marginTop: 10, paddingTop: 14, borderTop: '2px solid var(--bordo-tint)' }}>
                  <div style={{ flex: 1, fontSize: 13, color: 'var(--text-2)' }}>Total mensal recorrente</div>
                  <div className="serif" style={{ fontSize: 24, color: 'var(--bordo)' }}>{fmt(fixedTotal)}</div>
                </div>
              </div>
            </div>

            {/* Categorias (donut) */}
            <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
              <h3 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>Despesas por categoria</h3>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, marginBottom: 14 }}>onde o dinheiro foi · maio/26</div>

              <div className="row" style={{ justifyContent: 'center', marginBottom: 18 }}>
                <DonutChart data={DESPESAS_CATEGORIAS} size={200} thickness={28}
                            label={fmtCompact(totalDespesas)} sub="TOTAL DO MÊS"/>
              </div>

              <div className="col gap-2">
                {DESPESAS_CATEGORIAS.map((c, i) => {
                  const pct = (c.valor / totalDespesas) * 100;
                  return (
                    <div key={i} className="row gap-3" style={{ alignItems: 'center' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: c.cor, flex: '0 0 auto' }}/>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{c.nome}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 32, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 80, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtCompact(c.valor)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Projection cards */}
          <div className="card" style={{ padding: 22 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>Projeção dos próximos 3 meses</h3>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>baseada em sazonalidade · tendência dos últimos 12 meses · pedidos já lançados</div>
              </div>
              <span className="pill bordo"><Icon name="target" size={11} stroke={2.4}/> Confiança 85%</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {FLUXO_PROJ.map((p, i) => {
                const saldo = p.in - p.out;
                const acima = saldo > fixedTotal * 0.2;
                return (
                  <div key={i} style={{
                    padding: 18, borderRadius: 14,
                    background: i === 0 ? 'var(--bordo-tint)' : 'var(--surface-2)',
                    border: '1px solid ' + (i === 0 ? 'var(--bordo)' : 'var(--line)'),
                    position: 'relative',
                  }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: i === 0 ? 'var(--bordo)' : 'var(--text-3)' }}>
                        {p.m} / {p.y}
                      </span>
                      <span className={'pill ' + (acima ? 'ok' : 'warn')} style={{ fontSize: 10 }}>
                        {acima ? '↑ acima da meta' : '↓ saldo apertado'}
                      </span>
                    </div>
                    <div className="serif" style={{ fontSize: 32, marginTop: 8, color: 'var(--text)', lineHeight: 1.1 }}>
                      {fmtCompact(saldo)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      saldo projetado · {Math.round((saldo / p.in) * 100)}% de margem
                    </div>

                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed ' + (i === 0 ? 'rgba(122,31,43,0.18)' : 'var(--line)') }}>
                      <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>
                        <span>Faixa esperada</span>
                        <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{fmtCompact(p.lo)} – {fmtCompact(p.hi)}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: `${((p.lo - p.lo) / (p.hi - p.lo)) * 100}%`, right: `${100 - 100}%`, top: 0, bottom: 0, background: 'linear-gradient(90deg, var(--bordo) 0%, var(--gold) 50%, var(--bordo) 100%)', opacity: 0.4 }}/>
                        <div style={{ position: 'absolute', left: `${((p.in - p.lo) / (p.hi - p.lo)) * 100}%`, top: -3, width: 3, height: 12, background: 'var(--bordo)', borderRadius: 2 }}/>
                      </div>
                      <div className="row" style={{ justifyContent: 'space-between', fontSize: 10, color: 'var(--text-4)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                        <span>Entradas {fmtCompact(p.in)}</span>
                        <span>Saídas {fmtCompact(p.out)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Insight bar */}
            <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, var(--gold-soft) 0%, var(--bordo-tint) 100%)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bordo)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <Icon name="lightning" size={18}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Recomendação do Kop VP</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  Sua margem média (15%) é saudável, mas a reserva está em 2,1 meses. Considere separar <b>{fmtCompact(saldoMes * 0.3)}</b> deste saldo até atingir o ideal de 3 meses de custo fixo (<b>{fmtCompact(fixedTotal * 3)}</b>). Jun e Jul costumam ser meses mais tranquilos antes do segundo pico (Dia dos Pais em ago).
                </div>
              </div>
              <button className="btn sm outline" style={{ background: 'var(--surface)' }}>Configurar meta</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Mobile — Fluxo de Caixa
// ─────────────────────────────────────────────────────────────
const MobileFluxoChart = ({ data, projection }) => {
  const W = 320, H = 160;
  const PAD = { l: 6, r: 6, t: 14, b: 18 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const all = [...data.slice(-8), ...projection];
  const max = Math.max(...all.map(d => Math.max(d.in, d.out))) * 1.05;
  const groupW = innerW / all.length;
  const barW = Math.min(8, groupW * 0.32);
  const yFor = v => PAD.t + innerH - (v / max) * innerH;
  const xCenter = i => PAD.l + groupW * i + groupW / 2;
  const saldoPts = all.map((d, i) => `${xCenter(i)},${yFor(d.in - d.out)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 160 }}>
      <line x1={PAD.l} x2={W - PAD.r} y1={yFor(0)} y2={yFor(0)} stroke="var(--line)"/>
      {all.map((d, i) => {
        const cx = xCenter(i);
        const proj = i >= data.slice(-8).length;
        return (
          <g key={i}>
            <rect x={cx - barW - 1} y={yFor(d.in)} width={barW} height={Math.max(2, yFor(0) - yFor(d.in))}
                  rx="1.5" fill="var(--ok)" opacity={proj ? 0.4 : 1}/>
            <rect x={cx + 1} y={yFor(d.out)} width={barW} height={Math.max(2, yFor(0) - yFor(d.out))}
                  rx="1.5" fill="var(--bordo)" opacity={proj ? 0.4 : 1}/>
            <text x={cx} y={H - 4} fontSize="9" fill={proj ? 'var(--text-4)' : 'var(--text-3)'} textAnchor="middle">{d.m}</text>
          </g>
        );
      })}
      <polyline points={saldoPts} fill="none" stroke="var(--gold)" strokeWidth="2"/>
    </svg>
  );
};

const MobileFluxoCaixa = () => {
  const fixedTotal = DESPESAS_FIXAS.reduce((a, b) => a + b.valor, 0);
  const last = FLUXO_MESES[FLUXO_MESES.length - 1];
  const saldoMes = last.in - last.out;
  const cover = Math.round((last.in / fixedTotal) * 100);
  const totalDespesas = DESPESAS_CATEGORIAS.reduce((a, b) => a + b.valor, 0);
  const fixedSplit = fmtSplit(fixedTotal);

  return (
    <div className="kop mobile" data-screen-label="Mobile · Fluxo de Caixa" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ padding: '12px 18px 6px' }}>
        <div className="row" style={{ alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow-left" size={18}/>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'Instrument Serif, Georgia', fontSize: 24, margin: 0, lineHeight: 1, fontWeight: 400 }}>Fluxo de caixa</h1>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>Maio / 2026</div>
          </div>
          <button style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="download" size={16}/>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 18px 100px' }}>
        {/* Hero break-even */}
        <div className="m-kpi m-kpi-large" style={{ padding: 20 }}>
          <div className="l" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="target" size={12}/> SUA LOJA CUSTA POR MÊS
          </div>
          <div className="v" style={{ fontSize: 36, marginTop: 6 }}>
            R$ {fixedSplit.reais}<span style={{ fontSize: 18, opacity: 0.7 }}>,{fixedSplit.cents}</span>
          </div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 8, lineHeight: 1.5 }}>
            Para abrir as portas todo dia. Custa <b style={{ opacity: 1 }}>{fmtCompact(fixedTotal / 30)}/dia</b>.
          </div>

          <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.12)' }}>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
              <span style={{ opacity: 0.85 }}>Coberto este mês</span>
              <span style={{ fontWeight: 700 }}>{cover}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.18)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: Math.min(100, cover) + '%', height: '100%', background: 'var(--gold)' }}/>
            </div>
            <div style={{ fontSize: 10, opacity: 0.75, marginTop: 6 }}>
              Faturamento de {fmtCompact(last.in)} cobre {cover}% do custo fixo
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="m-kpi-row" style={{ marginTop: 12 }}>
          <div className="m-kpi">
            <div className="l">Entradas mai</div>
            <div className="v" style={{ fontSize: 22 }}>{fmtCompact(last.in)}</div>
            <div style={{ fontSize: 10, color: 'var(--ok)', marginTop: 2 }}>↑ +5,8% vs abr</div>
          </div>
          <div className="m-kpi">
            <div className="l">Saídas mai</div>
            <div className="v" style={{ fontSize: 22 }}>{fmtCompact(last.out)}</div>
            <div style={{ fontSize: 10, color: 'var(--bad)', marginTop: 2 }}>↑ +3,0% vs abr</div>
          </div>
          <div className="m-kpi" style={{ gridColumn: '1 / -1', background: 'var(--gold-soft)', border: '1px solid var(--gold-tint)' }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="l">Saldo do mês</div>
                <div className="v" style={{ fontSize: 26, color: 'var(--gold-2)' }}>{fmtCompact(saldoMes)}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>margem operacional 16%</div>
              </div>
              <Icon name="trend" size={32} style={{ color: 'var(--gold-2)' }}/>
            </div>
          </div>
        </div>

        {/* Mini chart */}
        <div className="m-card" style={{ marginTop: 14, padding: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Últimos 8 meses + projeção</div>
            <span style={{ fontSize: 10, color: 'var(--text-4)' }}>15 mai</span>
          </div>
          <MobileFluxoChart data={FLUXO_MESES} projection={FLUXO_PROJ}/>
          <div className="row gap-3" style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
            <span className="row gap-2"><span className="dot" style={{ background: 'var(--ok)', width: 6, height: 6 }}/> Entradas</span>
            <span className="row gap-2"><span className="dot" style={{ background: 'var(--bordo)', width: 6, height: 6 }}/> Saídas</span>
            <span className="row gap-2"><span style={{ width: 12, height: 2, background: 'var(--gold)' }}/> Saldo</span>
          </div>
        </div>

        {/* Donut categories */}
        <div className="m-section-h">
          <h2>Onde o dinheiro foi</h2>
          <a>Detalhar →</a>
        </div>
        <div className="m-card" style={{ padding: 14 }}>
          <div className="row gap-3" style={{ alignItems: 'center' }}>
            <DonutChart data={DESPESAS_CATEGORIAS} size={120} thickness={20}
                        label={fmtCompact(totalDespesas)} sub="TOTAL"/>
            <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
              {DESPESAS_CATEGORIAS.slice(0, 5).map((c, i) => {
                const pct = (c.valor / totalDespesas) * 100;
                return (
                  <div key={i} className="row gap-2" style={{ alignItems: 'center', fontSize: 11 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c.cor, flex: '0 0 auto' }}/>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recurring expenses */}
        <div className="m-section-h">
          <h2>Despesas recorrentes</h2>
          <a>Tudo →</a>
        </div>
        <div className="col gap-2">
          {DESPESAS_FIXAS.slice(0, 5).map((d, i) => (
            <div key={i} className="m-card" style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: d.cor + '20', color: d.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <Icon name={d.icon} size={16}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{d.categoria}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>vence dia {d.dia}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="serif" style={{ fontSize: 15 }}>{fmtCompact(d.valor)}</div>
                <div style={{ fontSize: 10, color: d.pago ? 'var(--ok)' : 'var(--warn)', fontWeight: 700, marginTop: 2 }}>
                  {d.pago ? '● pago' : '● a vencer'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Projection */}
        <div className="m-section-h">
          <h2>Próximos meses</h2>
        </div>
        <div className="col gap-2">
          {FLUXO_PROJ.map((p, i) => {
            const s = p.in - p.out;
            return (
              <div key={i} className="m-card" style={{ padding: 14, background: i === 0 ? 'var(--bordo-tint)' : 'var(--surface)', borderColor: i === 0 ? 'var(--bordo)' : 'var(--line)' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: i === 0 ? 'var(--bordo)' : 'var(--text-3)' }}>{p.m} / {p.y}</span>
                  <span className="pill ok" style={{ fontSize: 10 }}>↑ saudável</span>
                </div>
                <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
                  <div className="serif" style={{ fontSize: 24, lineHeight: 1 }}>{fmtCompact(s)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{fmtCompact(p.in)} ↑ {fmtCompact(p.out)} ↓</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Insight */}
        <div className="m-card" style={{ marginTop: 14, padding: 16, background: 'linear-gradient(135deg, var(--gold-soft) 0%, var(--bordo-tint) 100%)', border: '1px solid var(--gold-tint)' }}>
          <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bordo)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
              <Icon name="lightning" size={16}/>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Reserva atual: 2,1 meses</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>
                Recomendado: 3 meses ({fmtCompact(fixedTotal * 3)}). Separe {fmtCompact(saldoMes * 0.3)} este mês para chegar lá.
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileTabBar active="fin"/>
    </div>
  );
};

Object.assign(window, { FluxoCaixaScreen, MobileFluxoCaixa, FluxoComboChart, DonutChart });
