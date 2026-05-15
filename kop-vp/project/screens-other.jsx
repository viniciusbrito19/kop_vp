// screens-other.jsx — Fornecedores, Tipos de Pedido, Financeiro, Estoque (desktop)

// ─────────────────────────────────────────────────────────────
// Fornecedores
// ─────────────────────────────────────────────────────────────
const FornecedoresScreen = ({ collapsedSidebar = false }) => (
  <div className="kop app" data-screen-label="Fornecedores">
    <Sidebar active="forn" collapsed={collapsedSidebar}/>
    <div className="main">
      <Topbar crumbs={['Operação', 'Fornecedores']}/>
      <div className="content">
        <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h1 className="page">Fornecedores</h1>
            <div className="page-sub">6 cadastrados · R$ 122.860,25 em compras nos últimos 6 meses</div>
          </div>
          <div className="row gap-2">
            <button className="btn outline"><Icon name="download" size={16}/> Exportar</button>
            <button className="btn primary"><Icon name="plus" size={16} stroke={2.4}/> Novo Fornecedor</button>
          </div>
        </div>

        <div className="filter-bar" style={{ marginBottom: 18 }}>
          <div className="field" style={{ flex: 1, height: 36, border: 0, background: 'transparent' }}>
            <Icon name="search" size={15}/>
            <input placeholder="Buscar por nome, CNPJ, categoria…"/>
          </div>
          <div className="sep"/>
          <div className="seg">
            {['Todos', 'Mais comprados', 'Inativos'].map(t => (
              <button key={t} className={t === 'Todos' ? 'on' : ''}>{t}</button>
            ))}
          </div>
        </div>

        <div className="forn-grid">
          {FORNECEDORES.map((f, i) => (
            <div key={i} className="forn-card">
              <div className="av">{f.curto}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nm">{f.nome}</div>
                <div className="cn">CNPJ {f.cnpj} · {f.categoria}</div>
                <div className="row gap-2" style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
                  <span className="pill bordo" style={{ fontSize: 10, padding: '2px 8px' }}>{f.pedidos} pedidos</span>
                  <span>Última compra: 12/05</span>
                </div>
              </div>
              <div className="stats">
                <div className="l">total compras</div>
                <div className="v">{fmtCompact(f.total)}</div>
                <button className="btn sm ghost" style={{ marginTop: 4, padding: '0 8px' }}>
                  Ver <Icon name="chev-right" size={12} stroke={2.4}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Tipos de Pedido
// ─────────────────────────────────────────────────────────────
const TiposScreen = ({ collapsedSidebar = false }) => (
  <div className="kop app" data-screen-label="Tipos de Pedido">
    <Sidebar active="tipos" collapsed={collapsedSidebar}/>
    <div className="main">
      <Topbar crumbs={['Configurações', 'Tipos de Pedido']}/>
      <div className="content">
        <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h1 className="page">Tipos de Pedido</h1>
            <div className="page-sub">Categorias usadas para classificar pedidos a fornecedores.</div>
          </div>
          <button className="btn primary"><Icon name="plus" size={16} stroke={2.4}/> Novo Tipo</button>
        </div>

        <div className="tipo-grid">
          {TIPOS.map((t, i) => (
            <div key={i} className={'tipo-card ' + (t.on ? 'on' : 'off')}>
              <div className="ico"><Icon name={t.icon} size={20}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="name">{t.nome}</div>
                <div className="meta">{t.pedidos} pedidos · ativo desde 2024</div>
              </div>
              <button className="btn icon ghost" style={{ marginRight: 4 }}><Icon name="edit" size={14}/></button>
              <div className="toggle"/>
            </div>
          ))}
        </div>

        <div className="card-soft" style={{ marginTop: 22, padding: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--gold-soft)', color: 'var(--gold-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
            <Icon name="cocoa" size={22}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Sazonais aparecem por mês</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Páscoa, Natal e outros tipos sazonais ficam destacados em meses próximos ao evento.</div>
          </div>
          <button className="btn sm outline">Configurar</button>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Financeiro
// ─────────────────────────────────────────────────────────────
const FinanceiroScreen = ({ collapsedSidebar = false }) => (
  <div className="kop app" data-screen-label="Financeiro">
    <Sidebar active="fin" collapsed={collapsedSidebar}/>
    <div className="main">
      <Topbar crumbs={['Operação', 'Extrato Financeiro']}/>
      <div className="content">
        <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h1 className="page">Extrato <span className="accent serif">financeiro</span></h1>
            <div className="page-sub">Entradas e saídas consolidadas · saldo atual R$ 67.819,74</div>
          </div>
          <div className="row gap-2">
            <button className="btn outline"><Icon name="upload" size={16}/> Importar CSV</button>
            <button className="btn outline"><Icon name="download" size={16}/> Exportar</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 14, marginBottom: 22 }}>
          <KPI tone="bordo" icon="arrow-up-right" label="ENTRADAS · 7D" value="R$ 36.218" cents="40" foot="↑ +18,4% vs semana passada"/>
          <KPI label="SAÍDAS · 7D" icon="arrow-down-right" value="R$ 21.494" cents="22" foot="-3,1% vs semana passada" trend={{ dir: 'down', value: '-3,1%' }}/>
          <div className="kpi">
            <div className="kpi-label">FLUXO DA SEMANA</div>
            <div style={{ marginTop: 6 }}>
              <BarChart data={FIN_BARS} height={92}/>
            </div>
            <div className="kpi-foot">
              <span className="row gap-2"><span className="dot" style={{ background: 'var(--ok)' }}/> Entradas</span>
              <span className="row gap-2"><span className="dot" style={{ background: 'var(--bordo)' }}/> Saídas</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="row" style={{ padding: '14px 22px', borderBottom: '1px solid var(--line)', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Movimentações</h3>
            <span className="chip-counter">{FIN_LINHAS.length} lançamentos</span>
            <div className="spacer" style={{ flex: 1 }}/>
            <div className="seg">
              {['Tudo', 'Entradas', 'Saídas'].map(t => (
                <button key={t} className={t === 'Tudo' ? 'on' : ''}>{t}</button>
              ))}
            </div>
            <div className="sep"/>
            <button className="btn sm ghost"><Icon name="calendar" size={14}/> Últimos 7 dias</button>
            <button className="btn sm ghost"><Icon name="filter" size={14}/> Filtros</button>
          </div>
          <div className="fin-rows">
            <div className="fin-row" style={{ background: 'var(--surface-2)', fontSize: 11, color: 'var(--text-4)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 22px' }}>
              <span>Data</span>
              <span>Natureza</span>
              <span>Tipo / Remetente</span>
              <span style={{ textAlign: 'right' }}>Valor</span>
              <span style={{ textAlign: 'right' }}>Saldo</span>
            </div>
            {FIN_LINHAS.map((l, i) => (
              <div key={i} className="fin-row" style={{ padding: '14px 22px' }}>
                <span className="mono" style={{ fontSize: 13 }}>{l.data}</span>
                <span><span className={'pill ' + (l.nat === 'in' ? 'ok' : 'bad')}>
                  <Icon name={l.nat === 'in' ? 'arrow-up-right' : 'arrow-down-right'} size={11} stroke={2.4}/>
                  {l.nat === 'in' ? 'Entrada' : 'Saída'}
                </span></span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{l.tipo}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{l.who}</div>
                </div>
                <span className={'v ' + (l.nat === 'in' ? 'in' : 'out')} style={{ textAlign: 'right', fontSize: 14 }}>
                  {l.nat === 'in' ? '' : ''}{fmt(l.valor)}
                </span>
                <span className="saldo" style={{ textAlign: 'right', fontSize: 13 }}>{fmt(l.saldo)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);


// ─────────────────────────────────────────────────────────────
// Despesas Fixas
// ─────────────────────────────────────────────────────────────
const DespesasScreen = ({ collapsedSidebar = false }) => {
  const fixedTotal = DESPESAS_FIXAS.reduce((a, b) => a + b.valor, 0);
  const fixedPaid  = DESPESAS_FIXAS.filter(d => d.pago).reduce((a, b) => a + b.valor, 0);
  const fixedDue   = fixedTotal - fixedPaid;
  const paidCount  = DESPESAS_FIXAS.filter(d => d.pago).length;
  const dueCount   = DESPESAS_FIXAS.filter(d => !d.pago).length;
  const breakEvenDia = fixedTotal / 30;
  const totalCat   = DESPESAS_CATEGORIAS.reduce((a, b) => a + b.valor, 0);
  const pctPaid    = (fixedPaid / fixedTotal) * 100;

  return (
    <div className="kop app" data-screen-label="Despesas">
      <Sidebar active="despesas" collapsed={collapsedSidebar}/>
      <div className="main">
        <Topbar crumbs={['Financeiro', 'Despesas']}/>
        <div className="content">

          {/* Header */}
          <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
            <div>
              <h1 className="page">Despesas <span className="accent serif">fixas</span></h1>
              <div className="page-sub">O que a loja gasta todo mês para abrir as portas · maio/26</div>
            </div>
            <div className="row gap-2">
              <button className="btn outline"><Icon name="download" size={16}/> Exportar</button>
              <button className="btn primary"><Icon name="plus" size={16} stroke={2.4}/> Nova Despesa</button>
            </div>
          </div>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 14, marginBottom: 22 }}>
            <div className="kpi bordo" style={{ padding: 22 }}>
              <div className="kpi-label"><Icon name="wallet" size={14}/> CUSTO FIXO MENSAL</div>
              <div className="serif" style={{ fontSize: 44, lineHeight: 1.05, marginTop: 4 }}>
                {fmtCompact(fixedTotal)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.78, marginTop: 6, lineHeight: 1.5 }}>
                É quanto a loja gasta todo mês para abrir as portas.<br/>
                <b style={{ opacity: 1 }}>R$ {Math.round(breakEvenDia).toLocaleString('pt-BR')}/dia</b> é o custo diário da operação.
              </div>
              <div style={{ marginTop: 14, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ height: 6, flex: 1, background: 'rgba(255,255,255,0.20)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: pctPaid + '%', height: '100%', background: 'var(--gold)', borderRadius: 999 }}/>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                  {Math.round(pctPaid)}% pago
                </span>
              </div>
            </div>

            <KPI icon="check"    label="PAGAS ESTE MÊS"   value={fmtCompact(fixedPaid)} foot={`${paidCount} de ${DESPESAS_FIXAS.length} categorias`} trend={{ dir: 'up', value: `${Math.round(pctPaid)}%` }}/>
            <KPI tone="danger"   icon="overdue"            label="A VENCER"              value={fmtCompact(fixedDue)}  foot={`${dueCount} categorias pendentes`}/>
            <KPI tone="gold"     icon="lightning"          label="BREAK-EVEN / DIA"      value={'R$ ' + Math.round(breakEvenDia).toLocaleString('pt-BR')} foot="meta diária de faturamento"/>
          </div>

          {/* Main 2-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22 }}>

            {/* Left: despesas list */}
            <div className="card" style={{ padding: 22 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18, alignItems: 'flex-start' }}>
                <div>
                  <h3 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>Despesas recorrentes</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {paidCount} pagas · {dueCount} a vencer · vencimentos em maio
                  </div>
                </div>
                <div className="row gap-2">
                  <div className="seg">
                    {['Todas', 'A vencer', 'Pagas'].map(t => (
                      <button key={t} className={t === 'Todas' ? 'on' : ''}>{t}</button>
                    ))}
                  </div>
                  <button className="btn sm ghost"><Icon name="filter" size={14}/></button>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 22, padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-3)' }}>Progresso do mês</span>
                  <span style={{ fontWeight: 700 }}>
                    <span style={{ color: 'var(--ok)' }}>{fmtCompact(fixedPaid)}</span>
                    <span style={{ color: 'var(--text-3)' }}> de {fmtCompact(fixedTotal)}</span>
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--line-2)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, width: pctPaid + '%', background: 'linear-gradient(90deg, var(--bordo) 0%, var(--bordo-2) 100%)', borderRadius: 999 }}/>
                </div>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
                  <span>{Math.round(pctPaid)}% liquidado</span>
                  <span style={{ color: 'var(--bad)', fontWeight: 600 }}>faltam {fmtCompact(fixedDue)}</span>
                </div>
              </div>

              {/* List */}
              <div>
                {DESPESAS_FIXAS.map((d, i) => (
                  <div key={i} className="row gap-3" style={{ padding: '12px 0', borderTop: i ? '1px solid var(--line)' : 0, alignItems: 'center' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 11,
                      background: d.cor + '1F', color: d.cor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
                    }}>
                      <Icon name={d.icon} size={18}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{d.categoria}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                        vence dia <span className="mono" style={{ fontWeight: 700 }}>{d.dia}</span> · mensal recorrente
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="serif" style={{ fontSize: 16, lineHeight: 1.1 }}>{fmt(d.valor)}</div>
                      <div style={{ marginTop: 5 }}>
                        {d.pago
                          ? <span className="pill ok"   style={{ fontSize: 10, padding: '2px 8px' }}><Icon name="check"   size={10} stroke={2.4}/> pago</span>
                          : <span className="pill warn" style={{ fontSize: 10, padding: '2px 8px' }}><Icon name="pending" size={10} stroke={2}/> a vencer</span>
                        }
                      </div>
                    </div>
                    <button className="btn icon ghost" style={{ width: 30, height: 30, flex: '0 0 auto' }}>
                      <Icon name="kebab" size={14}/>
                    </button>
                  </div>
                ))}
              </div>

              {/* Total footer */}
              <div className="row" style={{ marginTop: 14, paddingTop: 14, borderTop: '2px solid var(--bordo-tint)' }}>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>Total mensal recorrente</div>
                <div className="serif" style={{ fontSize: 26, color: 'var(--bordo)' }}>{fmt(fixedTotal)}</div>
              </div>
            </div>

            {/* Right column */}
            <div className="col gap-4">

              {/* Donut por categoria */}
              <div className="card" style={{ padding: 22 }}>
                <h3 className="serif" style={{ margin: 0, fontSize: 20, fontWeight: 400 }}>Por categoria</h3>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, marginBottom: 18 }}>onde o dinheiro vai · maio/26</div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <DonutChart data={DESPESAS_CATEGORIAS} size={180} thickness={26}
                              label={fmtCompact(totalCat)} sub="TOTAL"/>
                </div>

                <div className="col gap-2">
                  {DESPESAS_CATEGORIAS.map((c, i) => {
                    const pct = (c.valor / totalCat) * 100;
                    return (
                      <div key={i} className="row gap-3" style={{ alignItems: 'center' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: c.cor, flex: '0 0 auto' }}/>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{c.nome}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 28, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                          {fmtCompact(c.valor)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Próximas a vencer */}
              <div className="card" style={{ padding: 22 }}>
                <h3 className="serif" style={{ margin: 0, fontSize: 20, fontWeight: 400, marginBottom: 14 }}>Próximas a vencer</h3>

                <div className="col gap-3">
                  {DESPESAS_FIXAS.filter(d => !d.pago).map((d, i) => (
                    <div key={i} className="row gap-3" style={{ alignItems: 'center', padding: '8px 0', borderTop: i ? '1px dashed var(--line)' : 0 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'var(--warn-soft)', color: 'var(--warn)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
                      }}>
                        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7 }}>MAI</span>
                        <span className="serif" style={{ fontSize: 18, lineHeight: 1 }}>{d.dia}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{d.categoria}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>vence dia {d.dia}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="serif" style={{ fontSize: 16 }}>{fmt(d.valor)}</div>
                        <button className="btn sm ghost" style={{ marginTop: 2, padding: '0 8px', height: 24, fontSize: 11 }}>Pagar</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Insight */}
                <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, var(--gold-soft) 0%, var(--bordo-tint) 100%)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bordo)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                    <Icon name="lightning" size={16}/>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                      {fmtCompact(fixedDue)} vencem nos próximos dias
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>
                      Impostos (dia 25) é o maior item. Garanta que o caixa cobre antes do vencimento.
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

Object.assign(window, { FornecedoresScreen, TiposScreen, FinanceiroScreen, DespesasScreen });
