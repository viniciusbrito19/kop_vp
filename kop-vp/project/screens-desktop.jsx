// screens-desktop.jsx — Pedidos lista (variação A e B), Detalhe, Novo Pedido drawer

// ─────────────────────────────────────────────────────────────
// Topbar (compartilhada)
// ─────────────────────────────────────────────────────────────
const Topbar = ({ crumbs = ['Pedidos'] }) => (
  <header className="topbar">
    <div className="crumbs row gap-2">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Icon name="chev-right" size={12} stroke={2}/>}
          <span style={{ color: i === crumbs.length - 1 ? 'var(--text)' : 'var(--text-3)', fontWeight: i === crumbs.length - 1 ? 600 : 500 }}>{c}</span>
        </React.Fragment>
      ))}
    </div>
    <div className="spacer"/>
    <div className="field" style={{ width: 320 }}>
      <Icon name="search" size={16}/>
      <input placeholder="Buscar pedido, NF, fornecedor…"/>
      <span className="mono" style={{ fontSize: 11, padding: '3px 7px', background: 'var(--surface-2)', borderRadius: 6, color: 'var(--text-3)' }}>⌘ K</span>
    </div>
    <button className="btn icon outline" title="Notificações"><Icon name="bell" size={16}/></button>
  </header>
);

// ─────────────────────────────────────────────────────────────
// KPI Strip
// ─────────────────────────────────────────────────────────────
const PedidosKPIs = () => {
  const toReceive = fmtSplit(28960);
  const toPay = fmtSplit(17236.5);
  return (
    <div className="kpi-grid">
      <KPI tone="bordo"
           icon="overdue"
           label="EM ATRASO"
           value={'R$ ' + toReceive.reais}
           cents={toReceive.cents}
           foot="1 pedido · NIBS"/>
      <KPI label="A PAGAR (30 DIAS)"
           icon="pending"
           value={'R$ ' + toPay.reais}
           cents={toPay.cents}
           foot="6 pedidos abertos"
           trend={{ dir: 'up', value: '+12%' }}/>
      <KPI label="PAGOS NESTE MÊS"
           icon="check"
           value="R$ 8.514"
           cents="63"
           foot="vs R$ 7.612,11 em abr"
           trend={{ dir: 'up', value: '+11,8%' }}/>
      <KPI tone="gold"
           label="TICKET MÉDIO"
           icon="cocoa"
           value="R$ 3.609"
           cents="40"
           foot="últimos 30 dias"/>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Linha de pedido expansível
// ─────────────────────────────────────────────────────────────
const PedidoRow = ({ p, open, onToggle, dataTone }) => {
  const v = fmtSplit(p.valor);
  const vp = fmtSplit(p.pago);
  return (
    <div className={'row-card ' + (open ? 'open' : '')}>
      <div className="row-main" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <span className="chev"><Icon name="chev-right" size={16}/></span>
        <span><span className={'data-date ' + (dataTone || '')}>{p.dataLimite}</span></span>
        <span className="codigo">{p.codigo}</span>
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{p.tipo}</span>
        <div>
          <div className="fornecedor-name">{p.fornecedor}</div>
          <div className="fornecedor-sub">NF {p.nf} · {p.sub}</div>
        </div>
        <div className="valor">{'R$ ' + v.reais},<span style={{ color: 'var(--text-3)' }}>{v.cents}</span></div>
        <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
          <span className={'valor ' + (p.status === 'pago' ? 'pago' : p.status === 'parcial' ? 'parcial' : 'aberto')}>
            {p.pago > 0 ? `R$ ${vp.reais}` : '—'}
          </span>
          <StatusChip status={p.status} size="sm"/>
        </div>
        <button className="kebab" onClick={e => e.stopPropagation()}><Icon name="kebab" size={16}/></button>
      </div>
      {open && (
        <div className="row-expand">
          <div className="row-meta">
            <div>
              <dt>Status</dt>
              <dd><StatusChip status={p.status}/></dd>
            </div>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: 0 }}>
              <div><dt>Data Emissão</dt><dd>{p.dataEmissao}</dd></div>
              <div><dt>Data Limite</dt><dd>{p.dataLimite}</dd></div>
              <div><dt>Cadastrado</dt><dd style={{ fontSize: 12 }}>{p.cadastro}</dd></div>
              <div><dt>Tipo</dt><dd>{p.tipo}</dd></div>
              <div className="full" style={{ gridColumn: '1 / -1' }}><dt>Valor total</dt><dd className="serif" style={{ fontSize: 24, color: 'var(--bordo)' }}>{fmt(p.valor)}</dd></div>
            </dl>
            {p.observacao && (
              <div style={{ padding: 12, background: 'var(--bordo-tint)', borderRadius: 10, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                <div style={{ fontSize: 10, color: 'var(--bordo)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Observações</div>
                {p.observacao}
              </div>
            )}
            <div className="row-actions">
              <button className="btn sm outline"><Icon name="edit" size={14}/> Editar</button>
              <button className="btn sm outline"><Icon name="download" size={14}/> NF</button>
              <button className="btn sm ghost" style={{ color: 'var(--bad)' }}><Icon name="trash" size={14}/></button>
            </div>
          </div>
          <div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Itens da Nota <span style={{ color: 'var(--text-4)', fontWeight: 500 }}>({p.itens.length})</span></h3>
              <span className="chip-counter"><Icon name="note" size={12}/> NF {p.nf}</span>
            </div>
            <table className="items-table">
              <thead><tr>
                <th style={{ width: '50%' }}>Descrição</th>
                <th>Cód.</th>
                <th className="r">Qtd</th>
                <th className="r">Un.</th>
                <th className="r">Vl. Unit.</th>
                <th className="r">Vl. Total</th>
              </tr></thead>
              <tbody>
                {p.itens.map((it, i) => (
                  <tr key={i}>
                    <td className="desc">{it.desc}</td>
                    <td className="mono" style={{ color: 'var(--text-3)', fontSize: 11 }}>{it.cod}</td>
                    <td className="r">{it.qtd}</td>
                    <td className="r mono" style={{ color: 'var(--text-3)' }}>{it.un}</td>
                    <td className="r">{fmt(it.vu)}</td>
                    <td className="r" style={{ fontWeight: 600 }}>{fmt(it.vt)}</td>
                  </tr>
                ))}
                <tr className="items-foot">
                  <td colSpan={5} className="r" style={{ color: 'var(--text-3)' }}>Total</td>
                  <td className="r serif" style={{ fontSize: 18, color: 'var(--bordo)' }}>{fmt(p.valor)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Variação A · Direção principal
//   - Page header serifado, KPIs com cards diversos
//   - Filtros em barra-pill
//   - Lista com cards expansíveis (1 aberto por padrão)
// ─────────────────────────────────────────────────────────────
const PedidosDesktopA = ({ collapsedSidebar = false }) => {
  const [open, setOpen] = React.useState(1);
  const [tab, setTab] = React.useState('todos');
  return (
    <div className="kop app" data-screen-label="Pedidos · A">
      <Sidebar active="pedidos" collapsed={collapsedSidebar}/>
      <div className="main">
        <Topbar crumbs={['Operação', 'Pedidos a Fornecedores']}/>
        <div className="content">
          <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
            <div>
              <h1 className="page">Pedidos a <span className="accent serif">fornecedores</span></h1>
              <div className="page-sub">12 pedidos ativos · próximo vencimento em 3 dias</div>
            </div>
            <div className="row gap-2">
              <button className="btn outline"><Icon name="download" size={16}/> Exportar</button>
              <button className="btn primary"><Icon name="plus" size={16} stroke={2.4}/> Novo Pedido</button>
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <PedidosKPIs/>
          </div>

          <div className="filter-bar" style={{ marginBottom: 14 }}>
            <div className="seg">
              {['todos', 'em atraso', 'em aberto', 'parcial', 'pago'].map(t => (
                <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
              ))}
            </div>
            <div className="sep"/>
            <div className="field" style={{ height: 36, padding: '0 12px', minWidth: 200, border: 0, background: 'transparent' }}>
              <Icon name="calendar" size={15}/>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Últimos 30 dias</span>
              <Icon name="chev-down" size={14}/>
            </div>
            <div className="sep"/>
            <div className="field" style={{ height: 36, padding: '0 12px', minWidth: 180, border: 0, background: 'transparent' }}>
              <Icon name="suppliers" size={15}/>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Todos fornecedores</span>
              <Icon name="chev-down" size={14}/>
            </div>
            <div className="sep"/>
            <button className="btn sm ghost"><Icon name="filter" size={14}/> Mais filtros</button>
            <div className="spacer" style={{ flex: 1 }}/>
            <span className="chip-counter">8 resultados</span>
          </div>

          <div className="list-head">
            <span/>
            <span>Data Limite</span>
            <span>Código</span>
            <span>Tipo</span>
            <span>Fornecedor / NF</span>
            <span style={{ textAlign: 'right' }}>Valor NF</span>
            <span style={{ textAlign: 'right' }}>Pago / Status</span>
            <span/>
          </div>

          <div className="list">
            {PEDIDOS.map(p => {
              const tone = p.status === 'atrasado' ? 'overdue' : p.status === 'aberto' && p.id === 6 ? 'soon' : '';
              return (
                <PedidoRow key={p.id} p={p} open={open === p.id}
                           onToggle={() => setOpen(open === p.id ? null : p.id)}
                           dataTone={tone}/>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Variação B · Layout dashboard com calendário lateral
//   - Tipografia mais discreta, foco em densidade e hierarquia
//   - Mini calendário com vencimentos
// ─────────────────────────────────────────────────────────────
const VencimentoCalendario = () => {
  // 28 dias arbitrários
  const days = Array.from({ length: 35 }, (_, i) => i - 3);
  const hot = { 6: 'atrasado', 13: 'aberto', 19: 'aberto', 22: 'aberto', 25: 'parcial' };
  const today = 15;
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ fontFamily: 'Instrument Serif, Georgia', fontSize: 20, margin: 0, fontWeight: 400 }}>Maio 2026</h3>
        <div className="row gap-2">
          <button className="btn icon ghost" style={{ height: 28, width: 28 }}><Icon name="chev-left" size={14}/></button>
          <button className="btn icon ghost" style={{ height: 28, width: 28 }}><Icon name="chev-right" size={14}/></button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 10, color: 'var(--text-4)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i} style={{ textAlign: 'center' }}>{d}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((d, i) => {
          const valid = d >= 1 && d <= 31;
          const tone = hot[d];
          const isToday = d === today;
          return (
            <div key={i} style={{
              aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600,
              color: !valid ? 'var(--text-4)' : isToday ? '#fff' : tone === 'atrasado' ? 'var(--bad)' : tone ? 'var(--bordo)' : 'var(--text-2)',
              background: isToday ? 'var(--bordo)' : tone === 'atrasado' ? 'var(--bad-soft)' : tone ? 'var(--bordo-tint)' : 'transparent',
              borderRadius: 8, position: 'relative',
            }}>
              {valid ? d : ''}
              {tone && !isToday && <span style={{ position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 999, background: tone === 'atrasado' ? 'var(--bad)' : 'var(--bordo)' }}/>}
            </div>
          );
        })}
      </div>
      <div className="row gap-3" style={{ marginTop: 14, fontSize: 11, color: 'var(--text-3)' }}>
        <span className="row gap-2"><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--bordo)' }}/> vencimentos</span>
        <span className="row gap-2"><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--bad)' }}/> atrasados</span>
      </div>
    </div>
  );
};

const NextDuePanel = () => {
  const next = PEDIDOS.filter(p => p.status !== 'pago').slice(0, 4);
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'Instrument Serif, Georgia', fontSize: 20, margin: 0, fontWeight: 400 }}>Próximos vencimentos</h3>
        <a style={{ color: 'var(--bordo)', fontSize: 12, fontWeight: 600 }}>Ver todos →</a>
      </div>
      <div className="col gap-3">
        {next.map(p => {
          const v = fmtSplit(p.valor - p.pago);
          return (
            <div key={p.id} className="row gap-3" style={{ alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed var(--line)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: p.status === 'atrasado' ? 'var(--bad-soft)' : 'var(--bordo-tint)', color: p.status === 'atrasado' ? 'var(--bad)' : 'var(--bordo)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{p.dataLimite.split('/')[1] === '04' ? 'ABR' : p.dataLimite.split('/')[1] === '05' ? 'MAI' : 'JAN'}</span>
                <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Instrument Serif, Georgia', lineHeight: 1 }}>{p.dataLimite.split('/')[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.fornecedor}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>NF {p.nf} · {p.tipo}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="serif" style={{ fontSize: 16 }}>R$ {v.reais}<span style={{ fontSize: 11, color: 'var(--text-3)' }}>,{v.cents}</span></div>
                <StatusChip status={p.status} size="sm"/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PedidosDesktopB = ({ collapsedSidebar = false }) => {
  const [open, setOpen] = React.useState(null);
  return (
    <div className="kop app" data-screen-label="Pedidos · B">
      <Sidebar active="pedidos" collapsed={collapsedSidebar}/>
      <div className="main">
        <Topbar crumbs={['Operação', 'Pedidos a Fornecedores']}/>
        <div className="content">
          <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
            <div>
              <h1 className="page">Pedidos</h1>
              <div className="page-sub">Acompanhe pagamentos e vencimentos do mês</div>
            </div>
            <div className="row gap-2">
              <button className="btn outline sm"><Icon name="download" size={14}/> Exportar</button>
              <button className="btn primary"><Icon name="plus" size={16} stroke={2.4}/> Novo Pedido</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 22 }}>
            <div className="col gap-4">
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 14 }}>
                <KPI tone="bordo" label="A PAGAR ESTE MÊS" value="R$ 17.236" cents="50" foot="6 pedidos" icon="pending"/>
                <KPI label="EM ATRASO" value="R$ 28.960" cents="00" foot="1 pedido" tone="danger"/>
                <KPI label="PAGOS" value="R$ 8.514" cents="63" foot="este mês" trend={{ dir: 'up', value: '+11,8%' }}/>
              </div>

              <div className="filter-bar">
                <div className="field" style={{ flex: 1, height: 36, border: 0, background: 'transparent' }}>
                  <Icon name="search" size={15}/>
                  <input placeholder="Filtrar pedidos…"/>
                </div>
                <div className="sep"/>
                <div className="seg">
                  {['Todos', 'Pendentes', 'Pagos'].map(t => (
                    <button key={t} className={t === 'Todos' ? 'on' : ''}>{t}</button>
                  ))}
                </div>
                <div className="sep"/>
                <button className="btn sm ghost"><Icon name="filter" size={14}/> Filtros</button>
              </div>

              <div className="list-head">
                <span/>
                <span>Data Limite</span>
                <span>Código</span>
                <span>Tipo</span>
                <span>Fornecedor / NF</span>
                <span style={{ textAlign: 'right' }}>Valor NF</span>
                <span style={{ textAlign: 'right' }}>Pago / Status</span>
                <span/>
              </div>

              <div className="list">
                {PEDIDOS.slice(0, 6).map(p => (
                  <PedidoRow key={p.id} p={p}
                             open={open === p.id}
                             onToggle={() => setOpen(open === p.id ? null : p.id)}
                             dataTone={p.status === 'atrasado' ? 'overdue' : ''}/>
                ))}
              </div>
            </div>

            <div className="col gap-4">
              <VencimentoCalendario/>
              <NextDuePanel/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Detalhe da Nota Fiscal (variação C) — drill-in dedicado
// ─────────────────────────────────────────────────────────────
const PedidoDetalhe = ({ collapsedSidebar = false }) => {
  const p = PEDIDOS[0];
  return (
    <div className="kop app" data-screen-label="Pedido · Detalhe">
      <Sidebar active="pedidos" collapsed={collapsedSidebar}/>
      <div className="main">
        <Topbar crumbs={['Pedidos', 'NF ' + p.nf]}/>
        <div className="content">
          <div className="row gap-3" style={{ marginBottom: 18 }}>
            <button className="btn sm ghost"><Icon name="arrow-left" size={14}/> Voltar</button>
            <div className="spacer" style={{ flex: 1 }}/>
            <button className="btn sm outline"><Icon name="download" size={14}/> Baixar XML</button>
            <button className="btn sm outline"><Icon name="edit" size={14}/> Editar</button>
            <button className="btn primary sm"><Icon name="check" size={14} stroke={2.4}/> Marcar como pago</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 22 }}>
            <div className="col gap-4">
              <div className="card" style={{ padding: 22 }}>
                <span className="pill bordo" style={{ marginBottom: 12 }}>NF · {p.nf}</span>
                <h2 className="serif" style={{ fontSize: 28, margin: '6px 0 4px', lineHeight: 1.1 }}>{p.fornecedor}</h2>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>{p.sub}</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  <StatusChip status="recebido"/>
                  <StatusChip status="pago"/>
                </div>
                <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: 0 }}>
                  <div><dt style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Data Emissão</dt><dd style={{ margin: '4px 0 0', fontSize: 14 }}>06/04/2026</dd></div>
                  <div><dt style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Data Limite</dt><dd style={{ margin: '4px 0 0', fontSize: 14 }}>06/04/2026</dd></div>
                  <div><dt style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Código</dt><dd className="mono" style={{ margin: '4px 0 0', fontSize: 14 }}>{p.codigo}</dd></div>
                  <div><dt style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tipo</dt><dd style={{ margin: '4px 0 0', fontSize: 14 }}>{p.tipo}</dd></div>
                </dl>
                <div style={{ borderTop: '1px dashed var(--line)', marginTop: 18, paddingTop: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Valor Total</div>
                  <div className="serif" style={{ fontSize: 40, color: 'var(--bordo)', lineHeight: 1.1, marginTop: 4 }}>{fmt(p.valor)}</div>
                </div>
              </div>

              <div className="card-soft" style={{ padding: 18 }}>
                <div style={{ fontSize: 11, color: 'var(--bordo)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Observações</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{p.observacao}</div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Histórico</span>
                </div>
                <div className="col gap-3">
                  {[
                    { date: '13/05 · 16:23', text: 'NF recebida e arquivada', who: 'Sistema' },
                    { date: '13/05 · 16:21', text: 'Pagamento confirmado', who: 'Valéria P.' },
                    { date: '06/04 · 09:42', text: 'Pedido cadastrado', who: 'Camila S.' },
                  ].map((h, i) => (
                    <div key={i} className="row gap-3">
                      <span className="ring-dot" style={{ flex: '0 0 auto', marginTop: 6 }}/>
                      <div>
                        <div style={{ fontSize: 13 }}>{h.text}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{h.date} · {h.who}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 22 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 className="serif" style={{ margin: 0, fontSize: 24, fontWeight: 400 }}>Itens da Nota <span style={{ color: 'var(--text-4)' }}>· {p.itens.length}</span></h3>
                <button className="btn sm outline"><Icon name="plus" size={14}/> Adicionar item</button>
              </div>
              <table className="items-table">
                <thead><tr>
                  <th style={{ width: '50%' }}>Descrição</th>
                  <th>Código</th>
                  <th className="r">Qtd</th>
                  <th className="r">Un.</th>
                  <th className="r">Vl. Unit.</th>
                  <th className="r">Vl. Total</th>
                </tr></thead>
                <tbody>
                  {p.itens.map((it, i) => (
                    <tr key={i}>
                      <td className="desc" style={{ paddingTop: 14, paddingBottom: 14 }}>
                        <div style={{ fontWeight: 600 }}>{it.desc}</div>
                      </td>
                      <td className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{it.cod}</td>
                      <td className="r" style={{ fontWeight: 600 }}>{it.qtd}</td>
                      <td className="r mono" style={{ color: 'var(--text-3)' }}>{it.un}</td>
                      <td className="r">{fmt(it.vu)}</td>
                      <td className="r" style={{ fontWeight: 700 }}>{fmt(it.vt)}</td>
                    </tr>
                  ))}
                  <tr className="items-foot">
                    <td colSpan={5} className="r" style={{ color: 'var(--text-3)' }}>Subtotal</td>
                    <td className="r" style={{ fontWeight: 700 }}>{fmt(p.valor)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="r" style={{ color: 'var(--text-3)', borderTop: 0 }}>Impostos</td>
                    <td className="r" style={{ color: 'var(--text-3)', borderTop: 0 }}>—</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="r serif" style={{ fontSize: 18, borderTop: '1px solid var(--line-2)' }}>Total</td>
                    <td className="r serif" style={{ fontSize: 22, color: 'var(--bordo)', borderTop: '1px solid var(--line-2)' }}>{fmt(p.valor)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Novo Pedido (drawer lateral)
// ─────────────────────────────────────────────────────────────
const NovoPedidoDrawer = ({ collapsedSidebar = false }) => (
  <div className="kop app" data-screen-label="Novo Pedido · Drawer">
    <Sidebar active="pedidos" collapsed={collapsedSidebar}/>
    <div className="main" style={{ position: 'relative' }}>
      <Topbar crumbs={['Operação', 'Pedidos a Fornecedores']}/>
      <div className="content" style={{ filter: 'blur(0px)' }}>
        <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h1 className="page">Pedidos a <span className="accent serif">fornecedores</span></h1>
            <div className="page-sub">12 pedidos ativos</div>
          </div>
        </div>
        <PedidosKPIs/>
      </div>

      <div className="drawer-scrim"/>
      <aside className="drawer">
        <div className="drawer-head">
          <div className="col" style={{ flex: 1 }}>
            <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Novo pedido</span>
            <h2 className="serif" style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 400 }}>Adicionar nota fiscal</h2>
          </div>
          <button className="btn icon ghost"><Icon name="x" size={18}/></button>
        </div>
        <div className="drawer-body">
          <div className="step-pills">
            <div className="step done"><span className="n"><Icon name="check" size={11} stroke={2.6}/></span> NF</div>
            <Icon name="chev-right" size={12} stroke={2}/>
            <div className="step active"><span className="n">2</span> Dados</div>
            <Icon name="chev-right" size={12} stroke={2}/>
            <div className="step"><span className="n">3</span> Itens</div>
          </div>

          <div className="upload-zone" style={{ marginBottom: 22, padding: 16, flexDirection: 'row', textAlign: 'left' }}>
            <div className="upload-icon" style={{ width: 40, height: 40 }}><Icon name="check" size={20} stroke={2.4}/></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>NFe-fitasprogresso-202645.xml</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Lido com sucesso · 4 itens identificados</div>
            </div>
            <button className="btn sm ghost"><Icon name="x" size={14}/></button>
          </div>

          <div className="form-grid">
            <label className="input">
              <span>Código do Pedido</span>
              <input defaultValue="2630618"/>
              <span className="hint">CRM: 7 dígitos + KPN · GIMBA: só números</span>
            </label>
            <label className="input">
              <span>Data Limite</span>
              <input type="text" defaultValue="06/04/2026" placeholder="dd/mm/aaaa"/>
            </label>
            <label className="input">
              <span>Fornecedor</span>
              <select defaultValue="fp"><option value="fp">Fitas Progresso · Detallia</option></select>
            </label>
            <label className="input">
              <span>Tipo de Pedido</span>
              <select defaultValue="sup"><option value="sup">Suprimentos</option></select>
            </label>
            <label className="input">
              <span>Número da NF</span>
              <input defaultValue="000202645-1"/>
            </label>
            <label className="input">
              <span>Data de Emissão</span>
              <input type="text" defaultValue="06/04/2026"/>
            </label>
            <label className="input">
              <span>Valor NF (R$)</span>
              <input defaultValue="2.560,16"/>
            </label>
            <label className="input">
              <span>Status</span>
              <select defaultValue="rec"><option value="rec">Recebido</option></select>
            </label>
            <label className="input full" style={{ gridColumn: '1 / -1' }}>
              <span>Observações</span>
              <textarea defaultValue="Pedidos 005444 e 005445"/>
            </label>
          </div>
        </div>
        <div className="drawer-foot">
          <button className="btn ghost">Anterior</button>
          <div style={{ flex: 1 }}/>
          <button className="btn outline">Salvar rascunho</button>
          <button className="btn primary">Próximo <Icon name="chev-right" size={14} stroke={2.4}/></button>
        </div>
      </aside>
    </div>
  </div>
);

Object.assign(window, { PedidosDesktopA, PedidosDesktopB, PedidoDetalhe, NovoPedidoDrawer, PedidosKPIs, Topbar, PedidoRow });
