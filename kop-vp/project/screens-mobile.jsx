// screens-mobile.jsx — iPhone screens for Kop VP (dono revisando fora da loja)

// ─────────────────────────────────────────────────────────────
// Shared mobile chrome (header, tabbar, search)
// ─────────────────────────────────────────────────────────────
const MobileTopBar = ({ greet = false }) => (
  <div className="row" style={{ padding: '10px 18px 6px', alignItems: 'center', gap: 12 }}>
    <KopLogo size={32}/>
    <div className="col" style={{ flex: 1 }}>
      <span style={{ fontFamily: 'Instrument Serif, Georgia', fontSize: 18, lineHeight: 1, color: 'var(--bordo)' }}>Kop VP</span>
      <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-4)' }}>Chocolataria</span>
    </div>
    <button style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', position: 'relative' }}>
      <Icon name="bell" size={18}/>
      <span style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 999, background: 'var(--bad)', border: '2px solid var(--surface)' }}/>
    </button>
    <div className="sb-avatar" style={{ width: 38, height: 38, fontSize: 13 }}>VP</div>
  </div>
);

const MobileTabBar = ({ active = 'pedidos' }) => (
  <div className="m-tabbar">
    {[
      { id: 'home',    icon: 'home',       label: 'Início'  },
      { id: 'pedidos', icon: 'orders',     label: 'Pedidos' },
      { id: 'forn',    icon: 'suppliers',  label: 'Fornec.' },
      { id: 'fin',     icon: 'finance',    label: 'Financ.' },
    ].map(t => (
      <a key={t.id} className={t.id === active ? 'on' : ''}>
        <Icon name={t.icon} size={20} stroke={t.id === active ? 2.1 : 1.6}/>
        <span>{t.label}</span>
      </a>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Mobile · Home (dashboard de quem revisa fora da loja)
// ─────────────────────────────────────────────────────────────
const MobileHome = () => {
  const overdue = fmtSplit(28960);
  const next = PEDIDOS.filter(p => p.status !== 'pago').slice(0, 3);
  return (
    <div className="kop mobile" data-screen-label="Mobile · Home" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <MobileTopBar greet/>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 18px 90px' }}>
        <div className="m-greet">
          <div>
            <div className="who-name">Olá, <span style={{ color: 'var(--bordo)', fontStyle: 'italic' }}>Valéria</span></div>
            <div className="who-sub">Quarta-feira, 13 de maio</div>
          </div>
        </div>

        <div className="m-search" style={{ marginBottom: 14 }}>
          <Icon name="search" size={15}/>
          <span style={{ flex: 1 }}>Buscar pedido, fornecedor…</span>
          <span style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="filter" size={13}/></span>
        </div>

        <div className="m-kpi-row">
          <div className="m-kpi m-kpi-large">
            <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="l">Em atraso · 1 pedido</span>
              <span className="pill" style={{ background: 'rgba(255,255,255,0.18)', color: '#FAEFE0', fontSize: 10 }}>
                <span className="dot" style={{ background: '#FAEFE0' }}/> vence hoje
              </span>
            </div>
            <div className="v">R$ {overdue.reais}<span style={{ fontSize: 20, opacity: 0.7 }}>,{overdue.cents}</span></div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 8 }}>NIBS Participações · Linha Páscoa 2026</div>
          </div>
          <div className="m-kpi">
            <div className="l">A pagar (30d)</div>
            <div className="v">R$ 17.236</div>
            <div className="row gap-2" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              <span style={{ color: 'var(--bad)' }}>↑ 12%</span> vs abril
            </div>
          </div>
          <div className="m-kpi">
            <div className="l">Pago no mês</div>
            <div className="v">R$ 8.514</div>
            <div className="row gap-2" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              <span style={{ color: 'var(--ok)' }}>↑ 11,8%</span> ritmo +
            </div>
          </div>
        </div>

        <div className="m-section-h">
          <h2>Próximos vencimentos</h2>
          <a>Ver todos →</a>
        </div>

        <div className="col gap-3">
          {next.map(p => {
            const v = fmtSplit(p.valor - p.pago);
            const overdueP = p.status === 'atrasado';
            return (
              <div key={p.id} className="m-card" style={overdueP ? { borderColor: 'var(--bad-soft)' } : {}}>
                <div className="toprow">
                  <span className={'data-date ' + (overdueP ? 'overdue' : '')} style={{ fontSize: 11 }}>{p.dataLimite}</span>
                  <StatusChip status={p.status} size="sm"/>
                  <span className="spacer" style={{ flex: 1 }}/>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-4)' }}>{p.codigo}</span>
                </div>
                <div className="body">
                  <div className="left">
                    <div className="name">{p.fornecedor}</div>
                    <div className="meta">NF {p.nf} · {p.tipo}</div>
                  </div>
                  <div className="amount-col">
                    <div className="amount">R$ {v.reais}<span style={{ fontSize: 10, color: 'var(--text-3)' }}>,{v.cents}</span></div>
                    <div className="amount-sub">{p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="m-section-h">
          <h2>Atalhos</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            { ic: 'plus',     bg: 'var(--bordo)',    fg: '#fff',          lbl: 'Novo pedido',     sub: 'enviar NF / XML' },
            { ic: 'finance',  bg: 'var(--gold-soft)', fg: 'var(--gold-2)', lbl: 'Extrato',         sub: 'fluxo do dia' },
            { ic: 'suppliers',bg: 'var(--surface-2)', fg: 'var(--text)',  lbl: 'Fornecedores',    sub: '6 ativos' },
          ].map((q, i) => (
            <div key={i} className="m-card" style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: q.bg, color: q.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <Icon name={q.ic} size={18} stroke={2}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{q.lbl}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{q.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <MobileTabBar active="home"/>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Mobile · Pedidos (lista filtrável)
// ─────────────────────────────────────────────────────────────
const MobilePedidos = () => {
  return (
    <div className="kop mobile" data-screen-label="Mobile · Pedidos" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ padding: '12px 18px 6px' }}>
        <div className="row" style={{ alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <button style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow-left" size={18}/>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'Instrument Serif, Georgia', fontSize: 26, margin: 0, lineHeight: 1, fontWeight: 400 }}>Pedidos</h1>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>8 abertos · 1 atrasado</div>
          </div>
          <button className="btn primary sm" style={{ height: 36, padding: '0 14px' }}>
            <Icon name="plus" size={14} stroke={2.4}/> Novo
          </button>
        </div>
      </div>

      <div style={{ padding: '6px 18px 12px' }}>
        <div className="m-search">
          <Icon name="search" size={15}/>
          <span style={{ flex: 1 }}>Buscar NF, fornecedor…</span>
          <span style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="filter" size={13}/></span>
        </div>
      </div>

      <div style={{ padding: '0 18px 10px', overflowX: 'auto' }}>
        <div className="row gap-2" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
          {[
            { lbl: 'Todos', n: 12, on: true },
            { lbl: 'Atrasados', n: 1 },
            { lbl: 'Em aberto', n: 2 },
            { lbl: 'Parcial', n: 1 },
            { lbl: 'Pagos', n: 4 },
          ].map((t, i) => (
            <button key={i} className="pill" style={{
              flex: '0 0 auto', height: 32, padding: '0 14px',
              background: t.on ? 'var(--bordo)' : 'var(--surface)',
              color: t.on ? '#fff' : 'var(--text-2)',
              border: t.on ? 'none' : '1px solid var(--line)',
              fontWeight: 600,
            }}>{t.lbl} <span style={{ opacity: 0.65 }}>{t.n}</span></button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 18px 100px' }}>
        <div className="col gap-3">
          {PEDIDOS.map(p => {
            const v = fmtSplit(p.valor);
            const vp = fmtSplit(p.pago);
            const overdueP = p.status === 'atrasado';
            return (
              <div key={p.id} className="m-card">
                <div className="toprow">
                  <span className={'data-date ' + (overdueP ? 'overdue' : '')} style={{ fontSize: 11 }}>{p.dataLimite}</span>
                  <StatusChip status={p.status} size="sm"/>
                  <span style={{ flex: 1 }}/>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-4)' }}>{p.codigo}</span>
                </div>
                <div className="body">
                  <div className="left">
                    <div className="name">{p.fornecedor}</div>
                    <div className="meta">NF {p.nf}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>{p.tipo} · {p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'}</div>
                  </div>
                  <div className="amount-col">
                    <div className="amount">R$ {v.reais}<span style={{ fontSize: 11, color: 'var(--text-3)' }}>,{v.cents}</span></div>
                    {p.pago > 0 && p.pago < p.valor
                      ? <div className="amount-sub" style={{ color: 'var(--warn)' }}>pago R$ {vp.reais}</div>
                      : p.pago === 0
                      ? <div className="amount-sub" style={{ color: 'var(--bad)' }}>a pagar</div>
                      : <div className="amount-sub" style={{ color: 'var(--ok)' }}>pago</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <MobileTabBar active="pedidos"/>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Mobile · Detalhe do pedido
// ─────────────────────────────────────────────────────────────
const MobilePedidoDetail = () => {
  const p = PEDIDOS[0];
  return (
    <div className="kop mobile" data-screen-label="Mobile · Detalhe" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header com hero */}
      <div style={{ background: 'linear-gradient(180deg, var(--bordo) 0%, var(--bordo-2) 100%)', color: '#FAEFE0', padding: '14px 18px 26px' }}>
        <div className="row" style={{ marginBottom: 14 }}>
          <button style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.14)', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow-left" size={18}/>
          </button>
          <div style={{ flex: 1 }}/>
          <button style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.14)', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="kebab" size={18}/>
          </button>
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>NF {p.nf}</div>
        <h1 style={{ fontFamily: 'Instrument Serif, Georgia', fontSize: 28, margin: '4px 0 4px', fontWeight: 400, lineHeight: 1.1 }}>{p.fornecedor}</h1>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{p.sub}</div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.14em' }}>Valor Total</div>
          <div style={{ fontFamily: 'Instrument Serif, Georgia', fontSize: 40, fontWeight: 400, lineHeight: 1.1, marginTop: 2 }}>
            {fmt(p.valor)}
          </div>
          <div className="row gap-2" style={{ marginTop: 10 }}>
            <span className="pill" style={{ background: 'rgba(244,230,208,0.16)', color: '#FAEFE0' }}>
              <Icon name="check" size={11} stroke={2.4}/> Pago
            </span>
            <span className="pill" style={{ background: 'rgba(244,230,208,0.16)', color: '#FAEFE0' }}>
              <Icon name="truck" size={11} stroke={2}/> Recebido
            </span>
          </div>
        </div>
      </div>

      {/* Floating card with quick info */}
      <div style={{ padding: '0 18px', marginTop: -16 }}>
        <div className="card" style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { l: 'Emissão',  v: p.dataEmissao.slice(0, 5), mono: true },
            { l: 'Limite',   v: p.dataLimite.slice(0, 5),  mono: true },
            { l: 'Código',   v: p.codigo,                  mono: true },
          ].map((c, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--text-4)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{c.l}</div>
              <div className={c.mono ? 'mono' : ''} style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{c.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '18px 18px 100px' }}>
        <h3 className="serif" style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 400 }}>Itens da Nota <span style={{ color: 'var(--text-4)' }}>· {p.itens.length}</span></h3>
        <div className="col gap-2">
          {p.itens.map((it, i) => (
            <div key={i} className="m-card" style={{ padding: 14 }}>
              <div className="row" style={{ gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{it.desc}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4 }}>{it.cod}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="serif" style={{ fontSize: 16 }}>{fmt(it.vt)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{it.qtd} {it.un} × {fmt(it.vu)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h3 className="serif" style={{ margin: '22px 0 10px', fontSize: 20, fontWeight: 400 }}>Observações</h3>
        <div className="card-soft" style={{ padding: 14, fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)' }}>
          {p.observacao || 'Sem observações.'}
        </div>
      </div>

      <div style={{ padding: 14, borderTop: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', gap: 10 }}>
        <button className="btn outline" style={{ flex: 1 }}><Icon name="edit" size={16}/> Editar</button>
        <button className="btn primary" style={{ flex: 1 }}><Icon name="download" size={16}/> Baixar NF</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Mobile · Novo Pedido (bottom-sheet style first step)
// ─────────────────────────────────────────────────────────────
const MobileNovoPedido = () => (
  <div className="kop mobile" data-screen-label="Mobile · Novo Pedido" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(20,9,11,0.55)', position: 'relative' }}>
    {/* Backdrop content */}
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', filter: 'blur(0px)' }}>
      <MobileTopBar/>
      <div style={{ padding: '8px 18px 90px' }}>
        <div className="m-greet">
          <div><div className="who-name" style={{ color: 'var(--text-4)' }}>Olá, Valéria</div></div>
        </div>
      </div>
    </div>
    {/* Dark scrim */}
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,9,11,0.55)', backdropFilter: 'blur(2px)' }}/>

    {/* Sheet */}
    <div className="bsheet" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85%', overflow: 'auto' }}>
      <div className="grab"/>
      <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-4)', fontWeight: 700 }}>Novo pedido</div>
          <h2 className="serif" style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 400 }}>Como prefere começar?</h2>
        </div>
        <button style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--surface-2)', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={16}/></button>
      </div>

      <div className="col gap-3">
        <button style={{ padding: 16, borderRadius: 16, background: 'var(--bordo)', color: '#fff', border: 0, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
            <Icon name="upload" size={20} stroke={2.2}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Importar XML / PDF da NF</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>preenche automaticamente · recomendado</div>
          </div>
          <Icon name="chev-right" size={18}/>
        </button>

        <button className="m-card" style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, border: '1px solid var(--line)', background: 'var(--surface)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
            <Icon name="edit" size={20}/>
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Preencher manualmente</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>cadastrar passo a passo</div>
          </div>
          <Icon name="chev-right" size={18}/>
        </button>

        <button className="m-card" style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, border: '1px solid var(--line)', background: 'var(--surface)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--gold-soft)', color: 'var(--gold-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="orders" size={20}/>
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Repetir pedido anterior</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>copiar de pedido já existente</div>
          </div>
          <Icon name="chev-right" size={18}/>
        </button>
      </div>

      <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: 'var(--bordo-tint)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <Icon name="note" size={16} style={{ color: 'var(--bordo)' }}/>
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
          CRM aceita PDF · GIMBA aceita XML da NF-e. Detectamos o fornecedor automaticamente.
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, { MobileHome, MobilePedidos, MobilePedidoDetail, MobileNovoPedido, MobileTopBar, MobileTabBar });
