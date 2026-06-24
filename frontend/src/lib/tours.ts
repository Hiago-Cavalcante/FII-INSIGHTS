export interface PassoTour {
  /** Seletor do elemento a destacar (ex.: '[data-tour="inicio-renda"]'). Ausente = passo centrado. */
  alvo?: string;
  titulo: string;
  conteudo: string;
}

export interface Tour {
  id: string;
  titulo: string;
  descricao: string;
  /** Rotulo da aba para o indice. */
  aba: string;
  /** Rota onde o tour roda. */
  rota: string;
  /** Sub-aba (quando a tela tem abas internas). */
  tab?: string;
  passos: PassoTour[];
}

export const TOURS: Tour[] = [
  {
    id: "inicio", titulo: "Tela inicial", descricao: "Entenda seu resumo e a navegacao.",
    aba: "Inicio", rota: "/",
    passos: [
      { titulo: "Bem-vindo ao FII Insights", conteudo: "Um guia rapido da tela inicial. Em 30 segundos voce entende o essencial." },
      { alvo: '[data-tour="inicio-patrimonio"]', titulo: "Seu patrimonio", conteudo: "Quanto voce tem investido, somando FIIs e FIAGROs. Toque para ver sua carteira." },
      { alvo: '[data-tour="inicio-renda"]', titulo: "Renda mensal estimada", conteudo: "A media de proventos que sua carteira tende a gerar por mes, pelos ultimos 12 meses." },
      { alvo: '[data-tour="inicio-destaques"]', titulo: "Destaques para voce", conteudo: "Os fundos mais bem avaliados pelo scoring, ja ajustados ao seu perfil." },
      { alvo: '[data-tour="nav-principal"]', titulo: "Navegacao", conteudo: "Use estas abas para ir entre as telas. Em qualquer uma, toque no ? no topo para um guia como este." },
    ],
  },
  {
    id: "carteira-posicoes", titulo: "Posicoes", descricao: "Cadastre e acompanhe seus fundos.",
    aba: "Carteira", rota: "/carteira", tab: "posicoes",
    passos: [
      { titulo: "Suas posicoes", conteudo: "Aqui voce cadastra e acompanha os fundos que possui." },
      { alvo: '[data-tour="carteira-add"]', titulo: "Adicionar posicao", conteudo: "Informe o fundo, a quantidade de cotas e o preco medio pago. Da para editar depois." },
      { alvo: '[data-tour="carteira-total"]', titulo: "Total investido", conteudo: "A soma do que voce aplicou - base do seu patrimonio e das projacoes." },
    ],
  },
  {
    id: "carteira-dividendos", titulo: "Dividendos", descricao: "Acompanhe os proventos recebidos.",
    aba: "Carteira", rota: "/carteira", tab: "dividendos",
    passos: [
      { titulo: "Dividendos", conteudo: "Acompanhe os proventos que seus fundos pagaram." },
      { alvo: '[data-tour="dividendos-grafico"]', titulo: "Historico de proventos", conteudo: "Quanto voce recebeu mes a mes. Util para ver a consistencia da renda." },
    ],
  },
  {
    id: "carteira-simulador", titulo: "Simulador", descricao: "Projete sua renda futura.",
    aba: "Carteira", rota: "/carteira", tab: "simulador",
    passos: [
      { titulo: "Simulador de renda", conteudo: "Projete quanto sua carteira pode render no futuro." },
      { alvo: '[data-tour="simulador-controles"]', titulo: "Ajuste os parametros", conteudo: "Defina aportes mensais e reinvestimento. O efeito bola de neve reinveste os proventos para acelerar a renda." },
    ],
  },
  {
    id: "carteira-recomendacoes", titulo: "Recomendacoes", descricao: "Sugestoes pela sua carteira e perfil.",
    aba: "Carteira", rota: "/carteira", tab: "recomendacoes",
    passos: [
      { titulo: "Recomendacoes", conteudo: "Sugestoes personalizadas pela sua carteira e perfil." },
      { alvo: '[data-tour="recomendacoes-precoteto"]', titulo: "Preco-teto", conteudo: "O preco maximo sugerido para comprar sem pagar caro (metodo Bazin), dado o rendimento." },
      { alvo: '[data-tour="recomendacoes-rebalance"]', titulo: "Rebalanceamento", conteudo: "Mostra se sua carteira esta concentrada demais e como equilibrar FIIs e FIAGROs." },
    ],
  },
  {
    id: "analise-ranking", titulo: "Ranking", descricao: "Fundos ordenados pelo scoring.",
    aba: "Analise", rota: "/analise", tab: "ranking",
    passos: [
      { titulo: "Ranking de fundos", conteudo: "Fundos ordenados por uma nota de 0 a 100 (o scoring)." },
      { alvo: '[data-tour="ranking-score"]', titulo: "Score e classificacao", conteudo: "A nota combina rentabilidade, valuation, risco e estrutura: Excelente, Bom, Regular ou Evitar." },
      { alvo: '[data-tour="ranking-perfil"]', titulo: "Ajustado ao seu perfil", conteudo: "Os pesos da nota mudam conforme seu perfil (conservador, moderado, arrojado)." },
      { titulo: "Entenda cada indicador", conteudo: "Em qualquer indicador, toque no ? ao lado para uma explicacao simples, sem jargao." },
    ],
  },
  {
    id: "analise-clusters", titulo: "Clusters", descricao: "Agrupamento automatico de fundos.",
    aba: "Analise", rota: "/analise", tab: "clusters",
    passos: [
      { titulo: "Clusters", conteudo: "Agrupamos fundos parecidos automaticamente (K-Means)." },
      { alvo: '[data-tour="clusters-grupos"]', titulo: "Grupos de perfil", conteudo: "Cada grupo reune fundos com risco e rendimento semelhantes - ajuda a diversificar sem repetir o mesmo tipo." },
    ],
  },
  {
    id: "analise-comparar", titulo: "Comparar", descricao: "Fundos lado a lado.",
    aba: "Analise", rota: "/analise", tab: "comparar",
    passos: [
      { titulo: "Comparar fundos", conteudo: "Coloque fundos lado a lado para decidir." },
      { alvo: '[data-tour="comparar-selecao"]', titulo: "Escolha os fundos", conteudo: "Selecione dois ou mais fundos para ver indicadores e score na mesma tela." },
    ],
  },
  {
    id: "ia", titulo: "Assistente de IA", descricao: "Tire duvidas em linguagem simples.",
    aba: "IA", rota: "/ia",
    passos: [
      { titulo: "Assistente de IA", conteudo: "Tire duvidas sobre os fundos em linguagem simples." },
      { alvo: '[data-tour="ia-input"]', titulo: "Pergunte aqui", conteudo: "Pergunte por que um fundo tem certa nota. O assistente explica o score calculado - ele nao inventa numeros." },
    ],
  },
  {
    id: "perfil", titulo: "Perfil", descricao: "Personalize suas recomendacoes.",
    aba: "Perfil", rota: "/perfil",
    passos: [
      { titulo: "Seu perfil", conteudo: "Personalize as recomendacoes ao seu jeito de investir." },
      { alvo: '[data-tour="perfil-tipo"]', titulo: "Tipo de investidor", conteudo: "Conservador, moderado ou arrojado - muda o peso de cada indicador na nota." },
      { alvo: '[data-tour="perfil-pesos"]', titulo: "Pesos personalizados", conteudo: "Quer ir alem? Ajuste o peso de cada indicador (a soma precisa dar 100%)." },
    ],
  },
];

const ORDEM_ABAS = ["Inicio", "Carteira", "Analise", "IA", "Perfil"];

export function listarTours(): Tour[] {
  return TOURS;
}

export function obterTour(id: string): Tour | null {
  return TOURS.find((t) => t.id === id) ?? null;
}

export function agruparPorAba(): { aba: string; tours: Tour[] }[] {
  return ORDEM_ABAS.map((aba) => ({ aba, tours: TOURS.filter((t) => t.aba === aba) })).filter(
    (g) => g.tours.length > 0
  );
}
