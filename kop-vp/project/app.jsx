// app.jsx — composes everything into a DesignCanvas with Tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "sidebar": "expanded"
}/*EDITMODE-END*/;

const PhoneArtboard = ({ children }) => (
  <div style={{ width: 402, height: 874, background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}>
    <IOSStatusBar/>
    <div style={{ position: 'absolute', top: 48, left: 0, right: 0, bottom: 0 }}>
      {children}
    </div>
  </div>
);

const TabletArtboard = ({ children }) => (
  <div style={{ width: 1180, height: 820, background: 'var(--bg)', overflow: 'hidden' }}>
    {children}
  </div>
);

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const collapsed = t.sidebar === 'collapsed';

  // Apply theme to document
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', t.dark ? 'dark' : 'light');
    document.body.style.background = 'var(--bg-elev)';
  }, [t.dark]);

  return (
    <>
      <DesignCanvas>
        <DCSection id="overview" title="Kop VP — sistema redesenhado" subtitle="Bordô + dourado refinado · 3 direções, mobile-first para o dia a dia da Valéria">

          <DCArtboard id="hero-mobile-home" label="01 · Mobile · Início do dono" width={402} height={874}>
            <PhoneArtboard><MobileHome/></PhoneArtboard>
          </DCArtboard>

          <DCArtboard id="hero-desktop-a" label="02 · Desktop · Direção A" width={1320} height={880}>
            <div style={{ width: 1320, height: 880, overflow: 'hidden' }}>
              <PedidosDesktopA collapsedSidebar={collapsed}/>
            </div>
          </DCArtboard>

        </DCSection>

        <DCSection id="pedidos-desktop" title="Pedidos · Desktop" subtitle="Tela principal — duas direções para comparar">

          <DCArtboard id="pedidos-a" label="Direção A · Cards expansíveis com KPIs" width={1320} height={1100}>
            <div style={{ width: 1320, height: 1100, overflow: 'hidden' }}>
              <PedidosDesktopA collapsedSidebar={collapsed}/>
            </div>
          </DCArtboard>

          <DCArtboard id="pedidos-b" label="Direção B · Dashboard com calendário lateral" width={1320} height={1100}>
            <div style={{ width: 1320, height: 1100, overflow: 'hidden' }}>
              <PedidosDesktopB collapsedSidebar={collapsed}/>
            </div>
          </DCArtboard>

          <DCArtboard id="pedido-detalhe" label="Direção C · Detalhe da NF dedicado" width={1320} height={1100}>
            <div style={{ width: 1320, height: 1100, overflow: 'hidden' }}>
              <PedidoDetalhe collapsedSidebar={collapsed}/>
            </div>
          </DCArtboard>

          <DCArtboard id="novo-pedido" label="Novo Pedido · Drawer lateral" width={1320} height={880}>
            <div style={{ width: 1320, height: 880, overflow: 'hidden' }}>
              <NovoPedidoDrawer collapsedSidebar={collapsed}/>
            </div>
          </DCArtboard>

        </DCSection>

        <DCSection id="mobile" title="iPhone · Dono revisando fora da loja" subtitle="Fluxo do dia: olha KPIs, vencimentos, abre detalhe de uma NF, cria pedido novo">

          <DCArtboard id="m-home" label="Home · Resumo do dia" width={402} height={874}>
            <PhoneArtboard><MobileHome/></PhoneArtboard>
          </DCArtboard>

          <DCArtboard id="m-pedidos" label="Lista de Pedidos" width={402} height={874}>
            <PhoneArtboard><MobilePedidos/></PhoneArtboard>
          </DCArtboard>

          <DCArtboard id="m-detail" label="Detalhe da NF" width={402} height={874}>
            <PhoneArtboard><MobilePedidoDetail/></PhoneArtboard>
          </DCArtboard>

          <DCArtboard id="m-novo" label="Novo Pedido · Bottom sheet" width={402} height={874}>
            <PhoneArtboard><MobileNovoPedido/></PhoneArtboard>
          </DCArtboard>

        </DCSection>

        <DCSection id="ipad" title="iPad · Trabalho no balcão" subtitle="Mesma estrutura, otimizada para tela média">

          <DCArtboard id="ipad-pedidos" label="iPad · Pedidos" width={1100} height={780}>
            <TabletArtboard>
              <PedidosDesktopA collapsedSidebar={true}/>
            </TabletArtboard>
          </DCArtboard>

          <DCArtboard id="ipad-detalhe" label="iPad · Detalhe" width={1100} height={780}>
            <TabletArtboard>
              <PedidoDetalhe collapsedSidebar={true}/>
            </TabletArtboard>
          </DCArtboard>

        </DCSection>

        <DCSection id="fluxo" title="Fluxo de Caixa · Análise" subtitle="Quanto a loja custa por mês · histórico · projeção dos próximos 3 meses">

          <DCArtboard id="fluxo-desktop" label="Desktop · Fluxo de Caixa" width={1320} height={1640}>
            <div style={{ width: 1320, height: 1640, overflow: 'hidden' }}>
              <FluxoCaixaScreen collapsedSidebar={collapsed}/>
            </div>
          </DCArtboard>

          <DCArtboard id="fluxo-mobile" label="Mobile · Fluxo de Caixa" width={402} height={874}>
            <PhoneArtboard><MobileFluxoCaixa/></PhoneArtboard>
          </DCArtboard>

        </DCSection>

        <DCSection id="outras" title="Demais módulos" subtitle="Fornecedores, Financeiro, Despesas e Tipos com a mesma linguagem">

          <DCArtboard id="despesas" label="Despesas Fixas" width={1320} height={980}>
            <div style={{ width: 1320, height: 980, overflow: 'hidden' }}>
              <DespesasScreen collapsedSidebar={collapsed}/>
            </div>
          </DCArtboard>

          <DCArtboard id="fornecedores" label="Fornecedores" width={1320} height={880}>
            <div style={{ width: 1320, height: 880, overflow: 'hidden' }}>
              <FornecedoresScreen collapsedSidebar={collapsed}/>
            </div>
          </DCArtboard>

          <DCArtboard id="financeiro" label="Extrato Financeiro" width={1320} height={1100}>
            <div style={{ width: 1320, height: 1100, overflow: 'hidden' }}>
              <FinanceiroScreen collapsedSidebar={collapsed}/>
            </div>
          </DCArtboard>

          <DCArtboard id="tipos" label="Tipos de Pedido" width={1320} height={880}>
            <div style={{ width: 1320, height: 880, overflow: 'hidden' }}>
              <TiposScreen collapsedSidebar={collapsed}/>
            </div>
          </DCArtboard>

        </DCSection>

        <DCPostIt top={20} left={20} rotate={-3} width={220}>
          Foco mobile: dono revisando vencimentos fora da loja. Toda decisão de hierarquia parte daí.
        </DCPostIt>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Aparência"/>
        <TweakRadio label="Tema" value={t.dark ? 'escuro' : 'claro'}
                    options={['claro', 'escuro']}
                    onChange={(v) => setTweak('dark', v === 'escuro')}/>
        <TweakRadio label="Sidebar" value={t.sidebar}
                    options={['expanded', 'collapsed']}
                    onChange={(v) => setTweak('sidebar', v)}/>
        <TweakSection label="Sobre"/>
        <div style={{ fontSize: 11, color: 'rgba(41,38,27,.6)', lineHeight: 1.5 }}>
          <b>Paleta:</b> bordô #7A1F2B + dourado #A07A3F.<br/>
          <b>Tipografia:</b> Plus Jakarta Sans (UI) + Instrument Serif (display).<br/>
          <br/>
          Clique em qualquer artboard para abrir em foco. Arraste pelo grip para reordenar.
        </div>
      </TweaksPanel>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
