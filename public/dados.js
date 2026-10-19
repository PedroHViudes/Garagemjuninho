// =============================================================
//  DADOS DO SISTEMA  (fica salvo no código / GitHub / Vercel)
//
//  • Na 1ª vez que você abrir o app, tudo daqui é carregado.
//  • Depois, o que você cadastrar no celular fica salvo no aparelho.
//  • Para "gravar no código": no app vá em Ajustes > "Gerar dados.js",
//    e substitua este arquivo no GitHub pelo novo. Aumente a "versao"
//    quando quiser que o celular recarregue daqui.
// =============================================================
window.DADOS = {
  versao: 1,

  config: {
    nomeLoja: 'Pedro Viudes Veículos',
    vendedor: 'Pedro',
    whatsapp: '',               // ex: '43999998888' (só números, com DDD)
    cidade: 'Jacarezinho - PR',
    saldoInicial: 0,            // dinheiro em caixa quando começou a usar
    metaMargem: 10,             // % de lucro que você quer em cada carro
    diasAlerta: 30,             // avisa quando o carro estiver parado há X dias
    diasSemPostar: 5,           // avisa quando ficar X dias sem divulgar
    hashtags: '#carrosusados #seminovos #jacarezinho #nortepioneiro #carros #motos #vendase #troca #financiamento',

    // Canais que aparecem no checklist de divulgação de cada veículo
    canais: [
      'Status WhatsApp', 'Grupos WhatsApp', 'Marketplace', 'Grupos Facebook',
      'Instagram Feed', 'Instagram Reels', 'Stories', 'TikTok', 'OLX', 'Impulsionado Meta'
    ],

    // Seus grupos/páginas (toque no app = copia o texto e abre o grupo)
    grupos: [
      // { nome: 'Grupo Carros Jacarezinho', url: 'https://www.facebook.com/groups/xxxx' },
      // { nome: 'Grupo Zap Vendas Norte Pioneiro', url: 'https://chat.whatsapp.com/xxxx' },
    ],

    // Atalhos de consulta pela placa. {PLACA} vira a placa digitada.
    // A placa é copiada antes de abrir — se o site não preencher, é só colar.
    atalhosPlaca: [
      { nome: 'Placa FIPE', url: 'https://placafipe.com/placa/{PLACA}' },
      { nome: 'KePlaca', url: 'https://www.keplaca.com/placa/{PLACA}' },
      { nome: 'Detran-PR', url: 'https://www.detran.pr.gov.br/' },
      { nome: 'Tabela FIPE oficial', url: 'https://veiculos.fipe.org.br/' },
    ],

    // Apps de consulta (abre a loja do celular; se já tiver instalado aparece "Abrir")
    // ios = link da App Store · android = link da Play Store (vazio = busca pelo nome)
    appsPlaca: [
      { nome: 'Consulta Placa Veículo e Fipe', ios: 'https://apps.apple.com/br/app/id6461690442', android: '' },
      { nome: 'PrecifiCAR (ex iFipe)', ios: 'https://apps.apple.com/br/app/id857096045', android: '' },
      { nome: 'Fipe Placa: Tabela e IPVA', ios: 'https://apps.apple.com/br/app/id1599556747', android: '' },
      { nome: 'Tabela FIPE: Consultar Veículo', ios: 'https://apps.apple.com/br/app/id1598601141', android: '' },
      { nome: 'Consultar Placa: Veículo carro', ios: 'https://apps.apple.com/br/app/id1617660632', android: '' },
      { nome: 'Consulta Placa Fácil', ios: 'https://apps.apple.com/br/app/id1590962565', android: '' },
    ],
  },

  // ---------------------------------------------------------
  //  VEÍCULOS  (cadastre aqui ou direto pelo app)
  //  tipo: 'carro' | 'moto'
  //  status: 'disponivel' | 'reservado' | 'vendido'
  //  midiasCodigo: fotos/vídeos que você subir na pasta public/midias
  // ---------------------------------------------------------
  veiculos: [
    // {
    //   id: 'civic-2019',
    //   tipo: 'carro', marca: 'Honda', modelo: 'Civic EXL 2.0', anoFab: 2018, anoMod: 2019,
    //   km: 65000, cor: 'Prata', combustivel: 'Flex', cambio: 'Automático', placa: 'ABC1D23',
    //   opcionais: 'Banco de couro, multimídia, câmera de ré',
    //   descricao: 'Único dono, revisado.',
    //   status: 'disponivel', aceitaTroca: true, financia: true,
    //   precoAnuncio: 98900, precoMinimo: 95000,
    //   compra: { valor: 85000, data: '2026-10-01', pagoCaixa: true },
    //   despesas: [ { desc: 'Polimento', valor: 350, data: '2026-10-03' } ],
    //   fipe: { valor: 101000, ref: 'outubro/2026' },
    //   linkAlbum: '',
    //   midiasCodigo: ['midias/civic-2019/01.jpg'],
    // },
  ],

  // Entradas/saídas avulsas do caixa (fora compra/venda de veículo)
  lancamentos: [],
};
