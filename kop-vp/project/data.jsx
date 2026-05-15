// data.jsx — sample data for Kop VP

const PEDIDOS = [
  {
    id: 1, codigo: '2630618', nf: '000202645-1', tipo: 'Suprimentos',
    fornecedor: 'FITAS PROGRESSO', sub: 'Detallia Fitas Texteis Ltda',
    dataLimite: '06/04/2026', dataEmissao: '06/04/2026', cadastro: '13/05/2026 16:23',
    valor: 2560.16, pago: 2560.16, status: 'pago',
    observacao: 'Pedidos 005444 e 005445',
    itens: [
      { desc: 'FITA METALIZADA M057-003A 3mm COR 203', cod: '2000000201 CAR 100m', qtd: 5, un: 'CR', vu: 25.40, vt: 127.00 },
      { desc: 'LAÇO LA685 209 — Pronto Vermelho Tamanho M', cod: '2000000201 SAC 100un', qtd: 20, un: 'SC', vu: 89.90, vt: 1798.00 },
      { desc: 'FITA EASGB015S 15mm COR 003 Vermelha', cod: '2000000201 ROL 100m', qtd: 7, un: 'RL', vu: 38.61, vt: 270.27 },
      { desc: 'FITA EASGB020S 20mm COR 004 Vermelha', cod: '2000000201 ROL 100m', qtd: 7, un: 'RL', vu: 44.06, vt: 308.42 },
    ],
  },
  {
    id: 2, codigo: '1269372', nf: '008084792-0', tipo: 'Suprimentos',
    fornecedor: 'GIMBA', sub: 'Supricorp Suprimentos Ltda',
    dataLimite: '18/02/2026', dataEmissao: '11/02/2026', cadastro: '12/02/2026 10:11',
    valor: 400.04, pago: 400.04, status: 'pago',
    itens: [
      { desc: 'Papel A4 Sulfite 75g', cod: 'GMB-PAP-A4', qtd: 5, un: 'CX', vu: 32.50, vt: 162.50 },
      { desc: 'Caixa para presente 15x15 dourada', cod: 'GMB-CXP-15D', qtd: 50, un: 'UN', vu: 4.75, vt: 237.54 },
    ],
  },
  {
    id: 3, codigo: '679', nf: '000051303-1', tipo: '—',
    fornecedor: 'MOOD', sub: 'Kruna Comercio Importação e Exportação',
    dataLimite: '28/01/2026', dataEmissao: '20/01/2026', cadastro: '20/01/2026 14:02',
    valor: 2015.99, pago: 2015.99, status: 'pago',
    itens: [
      { desc: 'Embalagem premium colecionável', cod: 'MD-EMB-PRM', qtd: 100, un: 'UN', vu: 20.16, vt: 2015.99 },
    ],
  },
  {
    id: 4, codigo: '1221183', nf: '007986951-0', tipo: 'Suprimentos',
    fornecedor: 'GIMBA', sub: 'Supricorp Suprimentos Ltda',
    dataLimite: '28/12/2025', dataEmissao: '20/12/2025', cadastro: '20/12/2025 09:15',
    valor: 542.44, pago: 542.44, status: 'pago',
    itens: [
      { desc: 'Sacola kraft personalizada média', cod: 'GMB-SAC-M', qtd: 200, un: 'UN', vu: 2.71, vt: 542.44 },
    ],
  },
  {
    id: 5, codigo: '2474684KPN', nf: '002312552-2', tipo: 'Produtos de linha',
    fornecedor: 'CRM Indústria e Comércio de Alimentos', sub: 'Linha clássica · trufas e bombons',
    dataLimite: '19/12/2025', dataEmissao: '12/12/2025', cadastro: '12/12/2025 08:42',
    valor: 5196.18, pago: 2598.09, status: 'parcial',
    observacao: '50% pago na entrada · saldo em 19/12',
    itens: [
      { desc: 'Bombom CRM ao leite 1kg', cod: 'CRM-BL-1000', qtd: 30, un: 'CX', vu: 87.60, vt: 2628.00 },
      { desc: 'Trufa cremosa 24un display', cod: 'CRM-TR-24', qtd: 24, un: 'DP', vu: 107.00, vt: 2568.18 },
    ],
  },
  {
    id: 6, codigo: '2474785KPN', nf: '002312553-1', tipo: 'Cafeteria',
    fornecedor: 'CRM Indústria e Comércio de Alimentos', sub: 'Insumos cafeteria',
    dataLimite: '15/05/2026', dataEmissao: '08/05/2026', cadastro: '08/05/2026 11:30',
    valor: 1840.50, pago: 0, status: 'aberto',
    itens: [
      { desc: 'Pó de cacau alcalino 25kg', cod: 'CRM-CAC-25', qtd: 4, un: 'SC', vu: 285.00, vt: 1140.00 },
      { desc: 'Leite condensado 5kg', cod: 'CRM-LC-5K', qtd: 10, un: 'UN', vu: 70.05, vt: 700.50 },
    ],
  },
  {
    id: 7, codigo: '885231', nf: '004421889-2', tipo: 'Páscoa',
    fornecedor: 'NIBS Participações S.A.', sub: 'Linha Páscoa 2026',
    dataLimite: '02/05/2026', dataEmissao: '20/04/2026', cadastro: '20/04/2026 13:00',
    valor: 12480.00, pago: 0, status: 'atrasado',
    observacao: '⚠ Vencido em 11 dias · contatar financeiro',
    itens: [
      { desc: 'Ovo de Páscoa 350g recheado', cod: 'NIB-OP-350', qtd: 80, un: 'UN', vu: 89.00, vt: 7120.00 },
      { desc: 'Mini ovo 50g sortido', cod: 'NIB-MN-50', qtd: 320, un: 'UN', vu: 16.75, vt: 5360.00 },
    ],
  },
  {
    id: 8, codigo: '776002', nf: '003391024-0', tipo: 'Copos térmicos e garrafas',
    fornecedor: 'MOOD', sub: 'Acessórios premium importados',
    dataLimite: '22/05/2026', dataEmissao: '08/05/2026', cadastro: '08/05/2026 09:00',
    valor: 3820.00, pago: 0, status: 'aberto',
    itens: [
      { desc: 'Garrafa térmica 500ml ouro escovado', cod: 'MD-GTM-500', qtd: 40, un: 'UN', vu: 95.50, vt: 3820.00 },
    ],
  },
];

const FORNECEDORES = [
  { nome: 'CRM Indústria e Comércio de Alimentos', curto: 'CRM', cnpj: '61.158.283/0174-07', categoria: 'Chocolate · Insumos', pedidos: 14, total: 38540.20 },
  { nome: 'Fitas Progresso · Detallia', curto: 'FP', cnpj: '02.327.826/0003-57', categoria: 'Embalagem · Fitas', pedidos: 8, total: 12830.40 },
  { nome: 'Gimba Supricorp', curto: 'GB', cnpj: '54.651.716/0011-50', categoria: 'Suprimentos gerais', pedidos: 22, total: 8475.10 },
  { nome: 'Mood · Kruna Comércio', curto: 'MD', cnpj: '26.202.329/0002-00', categoria: 'Importados · Premium', pedidos: 6, total: 14210.00 },
  { nome: 'NIBS Participações S.A.', curto: 'NB', cnpj: '35.539.362/0001-30', categoria: 'Páscoa · Sazonais', pedidos: 4, total: 28960.00 },
  { nome: 'CocoaLab Brasil', curto: 'CL', cnpj: '18.224.501/0001-12', categoria: 'Cacau · Nibs', pedidos: 11, total: 19840.55 },
];

const TIPOS = [
  { nome: 'Suprimentos',              icon: 'stock',    pedidos: 84, on: true },
  { nome: 'Produtos de linha',        icon: 'cocoa',    pedidos: 56, on: true },
  { nome: 'Cafeteria',                icon: 'cocoa',    pedidos: 31, on: true },
  { nome: 'Bebida láctea',            icon: 'cocoa',    pedidos: 12, on: true },
  { nome: 'Kop Club',                 icon: 'tags',     pedidos:  9, on: true },
  { nome: 'Natal',                    icon: 'tags',     pedidos:  4, on: true },
  { nome: 'Páscoa',                   icon: 'tags',     pedidos:  6, on: true },
  { nome: 'Pelúcia',                  icon: 'tags',     pedidos:  3, on: true },
  { nome: 'Copos térmicos e garrafas', icon: 'tags',    pedidos:  7, on: true },
];

const FIN_LINHAS = [
  { data: '12/05/2026', nat: 'in',  tipo: 'Recebimento cartão', who: 'Cartao de Credito — Fiserv Filial', valor:  533.32, saldo: 67819.74 },
  { data: '12/05/2026', nat: 'in',  tipo: 'Recebimento cartão', who: 'Cartao de Credito — Fiserv Filial', valor:  555.44, saldo: 67286.42 },
  { data: '12/05/2026', nat: 'in',  tipo: 'Recebimento cartão', who: 'Cartao de Credito — Fiserv Filial', valor:   87.56, saldo: 66730.98 },
  { data: '12/05/2026', nat: 'in',  tipo: 'Recebimento cartão', who: 'Cartao de Debito — Fiserv Filial',  valor:  288.44, saldo: 66643.42 },
  { data: '12/05/2026', nat: 'out', tipo: 'Outros pagamentos',  who: 'CEB Brasília',                       valor: -2573.70, saldo: 66354.98 },
  { data: '11/05/2026', nat: 'in',  tipo: 'Pix recebido',       who: 'HYEI Comércio de Chocolates Ltda',  valor:  102.89, saldo: 68928.68 },
  { data: '11/05/2026', nat: 'out', tipo: 'Pagamento efetuado', who: '2ID Music Branding',                valor:   -27.98, saldo: 68825.79 },
  { data: '11/05/2026', nat: 'out', tipo: 'Pagamento efetuado', who: 'CRM Indústria e Com Alim Ltda',     valor: -7080.69, saldo: 68853.77 },
  { data: '11/05/2026', nat: 'out', tipo: 'Pagamento efetuado', who: 'Kruna Comercio Importacao e E',     valor: -4167.09, saldo: 75934.46 },
];

const FIN_BARS = [
  { label: 'Sex', in: 4280, out: 2100 },
  { label: 'Sáb', in: 8120, out: 3400 },
  { label: 'Dom', in: 6890, out:  900 },
  { label: 'Seg', in: 3220, out: 4800 },
  { label: 'Ter', in: 3990, out: 2200 },
  { label: 'Qua', in: 5170, out: 6100 },
  { label: 'Qui', in: 4520, out: 1980 },
];

// ─────────────────────────────────────────────────────────────
// Cash flow — 12 meses (jun/25 → mai/26)
// ─────────────────────────────────────────────────────────────
const FLUXO_MESES = [
  { m: 'Jun', y: '25', in:  86420, out: 71210 },
  { m: 'Jul', y: '25', in:  92180, out: 73840 },
  { m: 'Ago', y: '25', in:  88950, out: 72600 },
  { m: 'Set', y: '25', in:  94300, out: 78110 },
  { m: 'Out', y: '25', in: 102780, out: 81450 },
  { m: 'Nov', y: '25', in: 118620, out: 89230 },
  { m: 'Dez', y: '25', in: 168940, out: 112800 },
  { m: 'Jan', y: '26', in:  79420, out: 76310 },
  { m: 'Fev', y: '26', in:  88180, out: 72500 },
  { m: 'Mar', y: '26', in: 142360, out: 96200 },
  { m: 'Abr', y: '26', in:  91540, out: 78890 },
  { m: 'Mai', y: '26', in:  96820, out: 81240 },
];

// Projeção 3 meses (jun → ago/26)
const FLUXO_PROJ = [
  { m: 'Jun', y: '26', in:  92450, out: 79800, lo:  85200, hi:  99800 },
  { m: 'Jul', y: '26', in:  97300, out: 82400, lo:  89600, hi: 106200 },
  { m: 'Ago', y: '26', in:  94600, out: 80100, lo:  86800, hi: 103400 },
];

// Custo fixo: o que a loja gasta todo mês para abrir as portas
const DESPESAS_FIXAS = [
  { categoria: 'Aluguel',                  valor: 18500, dia: 5,  pago: true,  cor: '#7A1F2B', icon: 'home' },
  { categoria: 'Folha de Pagamento',       valor: 24800, dia: 5,  pago: true,  cor: '#A03548', icon: 'suppliers' },
  { categoria: 'Energia & Água',           valor:  3850, dia: 12, pago: true,  cor: '#A07A3F', icon: 'lightning' },
  { categoria: 'Internet & Telefonia',     valor:   780, dia: 15, pago: true,  cor: '#C2965A', icon: 'wallet' },
  { categoria: 'Sistema & Software',       valor:   650, dia: 8,  pago: true,  cor: '#82622F', icon: 'dashboard' },
  { categoria: 'Contabilidade',            valor:   980, dia: 20, pago: false, cor: '#B07A1C', icon: 'note' },
  { categoria: 'Impostos & Taxas',         valor:  6420, dia: 25, pago: false, cor: '#5A1620', icon: 'finance' },
  { categoria: 'Marketing recorrente',     valor:  2200, dia: 10, pago: true,  cor: '#D4AF7A', icon: 'tags' },
  { categoria: 'Limpeza & Manutenção',     valor:  1480, dia: 18, pago: false, cor: '#967333', icon: 'truck' },
];

// Categorias de despesa (vista por categoria, mês corrente)
const DESPESAS_CATEGORIAS = [
  { nome: 'Fornecedores',           valor: 32480, cor: '#7A1F2B' },
  { nome: 'Folha + encargos',       valor: 24800, cor: '#A03548' },
  { nome: 'Aluguel + condomínio',   valor: 18500, cor: '#C24655' },
  { nome: 'Impostos',               valor:  6420, cor: '#82622F' },
  { nome: 'Energia & Água',         valor:  3850, cor: '#A07A3F' },
  { nome: 'Marketing',              valor:  2200, cor: '#C2965A' },
  { nome: 'Outros',                 valor:  2990, cor: '#D4AF7A' },
];


const fmt = (n) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCompact = (n) => 'R$ ' + Math.round(n).toLocaleString('pt-BR');
const fmtSplit = (n) => {
  const [r, c] = n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split(',');
  return { reais: r, cents: c };
};

Object.assign(window, {
  PEDIDOS, FORNECEDORES, TIPOS, FIN_LINHAS, FIN_BARS,
  FLUXO_MESES, FLUXO_PROJ, DESPESAS_FIXAS, DESPESAS_CATEGORIAS,
  fmt, fmtCompact, fmtSplit,
});
