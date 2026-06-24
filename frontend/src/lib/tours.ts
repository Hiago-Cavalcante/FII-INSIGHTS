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
  /** Rótulo da aba para o índice. */
  aba: string;
  /** Rota onde o tour roda. */
  rota: string;
  /** Sub-aba (quando a tela tem abas internas). */
  tab?: string;
  passos: PassoTour[];
}

export const TOURS: Tour[] = [
  {
    id: "inicio", titulo: "Tela inicial", descricao: "Entenda seu resumo e a navegação.",
    aba: "Início", rota: "/",
    passos: [
      { titulo: "Bem-vindo ao FII Insights", conteudo: "Um guia rápido da tela inicial. Em 30 segundos você entende o essencial." },
      { alvo: '[data-tour="inicio-patrimonio"]', titulo: "Seu patrimônio", conteudo: "Quanto você tem investido, somando FIIs e FIAGROs. Toque para ver sua carteira." },
      { alvo: '[data-tour="inicio-renda"]', titulo: "Renda mensal estimada", conteudo: "A média de proventos que sua carteira tende a gerar por mês, pelos últimos 12 meses." },
      { alvo: '[data-tour="inicio-destaques"]', titulo: "Destaques para você", conteudo: "Os fundos mais bem avaliados pelo scoring, já ajustados ao seu perfil." },
      { alvo: '[data-tour="nav-principal"]', titulo: "Navegação", conteudo: "Use estas abas para ir entre as telas. Em qualquer uma, toque no “?” no topo para um guia como este." },
    ],
  },
  {
    id: "carteira-posicoes", titulo: "Posições", descricao: "Cadastre e acompanhe seus fundos.",
    aba: "Carteira", rota: "/carteira", tab: "posicoes",
    passos: [
      { titulo: "Suas posições", conteudo: "Aqui você cadastra e acompanha os fundos que possui." },
      { alvo: '[data-tour="carteira-add"]', titulo: "Adicionar posição", conteudo: "Informe o fundo, a quantidade de cotas e o preço médio pago. Dá para editar depois." },
      { alvo: '[data-tour="carteira-total"]', titulo: "Total investido", conteudo: "A soma do que você aplicou — base do seu patrimônio e das projeções." },
    ],
  },
  {
    id: "carteira-dividendos", titulo: "Dividendos", descricao: "Acompanhe os proventos recebidos.",
    aba: "Carteira", rota: "/carteira", tab: "dividendos",
    passos: [
      { titulo: "Dividendos", conteudo: "Acompanhe os proventos que seus fundos pagaram." },
      { alvo: '[data-tour="dividendos-grafico"]', titulo: "Histórico de proventos", conteudo: "Quanto você recebeu mês a mês. Útil para ver a consistência da renda." },
    ],
  },
  {
    id: "carteira-simulador", titulo: "Simulador", descricao: "Projete sua renda futura.",
    aba: "Carteira", rota: "/carteira", tab: "simulador",
    passos: [
      { titulo: "Simulador de renda", conteudo: "Projete quanto sua carteira pode render no futuro." },
      { alvo: '[data-tour="simulador-controles"]', titulo: "Ajuste os parâmetros", conteudo: "Defina aportes mensais e reinvestimento. O efeito “bola de neve” reinveste os proventos para acelerar a renda." },
    ],
  },
  {
    id: "carteira-recomendacoes", titulo: "Recomendações", descricao: "Sugestões pela sua carteira e perfil.",
    aba: "Carteira", rota: "/carteira", tab: "recomendacoes",
    passos: [
      { titulo: "Recomendações", conteudo: "Sugestões personalizadas pela sua carteira e perfil." },
      { alvo: '[data-tour="recomendacoes-precoteto"]', titulo: "Preço-teto", conteudo: "O preço máximo sugerido para comprar sem pagar caro (método Bazin), dado o rendimento." },
      { alvo: '[data-tour="recomendacoes-rebalance"]', titulo: "Rebalanceamento", conteudo: "Mostra se sua carteira está concentrada demais e como equilibrar FIIs e FIAGROs." },
    ],
  },
  {
    id: "analise-ranking", titulo: "Ranking", descricao: "Fundos ordenados pelo scoring.",
    aba: "Análise", rota: "/analise", tab: "ranking",
    passos: [
      { titulo: "Ranking de fundos", conteudo: "Fundos ordenados por uma nota de 0 a 100 (o scoring)." },
      { alvo: '[data-tour="ranking-score"]', titulo: "Score e classificação", conteudo: "A nota combina rentabilidade, valuation, risco e estrutura: Excelente, Bom, Regular ou Evitar." },
      { alvo: '[data-tour="ranking-perfil"]', titulo: "Ajustado ao seu perfil", conteudo: "Os pesos da nota mudam conforme seu perfil (conservador, moderado, arrojado)." },
      { titulo: "Entenda cada indicador", conteudo: "Em qualquer indicador, toque no “?” ao lado para uma explicação simples, sem jargão." },
    ],
  },
  {
    id: "analise-clusters", titulo: "Clusters", descricao: "Agrupamento automático de fundos.",
    aba: "Análise", rota: "/analise", tab: "clusters",
    passos: [
      { titulo: "Clusters", conteudo: "Agrupamos fundos parecidos automaticamente (K-Means)." },
      { alvo: '[data-tour="clusters-grupos"]', titulo: "Grupos de perfil", conteudo: "Cada grupo reúne fundos com risco e rendimento semelhantes — ajuda a diversificar sem repetir o mesmo tipo." },
    ],
  },
  {
    id: "analise-comparar", titulo: "Comparar", descricao: "Fundos lado a lado.",
    aba: "Análise", rota: "/analise", tab: "comparar",
    passos: [
      { titulo: "Comparar fundos", conteudo: "Coloque fundos lado a lado para decidir." },
      { alvo: '[data-tour="comparar-selecao"]', titulo: "Escolha os fundos", conteudo: "Selecione dois ou mais fundos para ver indicadores e score na mesma tela." },
    ],
  },
  {
    id: "ia", titulo: "Assistente de IA", descricao: "Tire dúvidas em linguagem simples.",
    aba: "IA", rota: "/ia",
    passos: [
      { titulo: "Assistente de IA", conteudo: "Tire dúvidas sobre os fundos em linguagem simples." },
      { alvo: '[data-tour="ia-input"]', titulo: "Pergunte aqui", conteudo: "Pergunte por que um fundo tem certa nota. O assistente explica o score calculado — ele não inventa números." },
    ],
  },
  {
    id: "perfil", titulo: "Perfil", descricao: "Personalize suas recomendações.",
    aba: "Perfil", rota: "/perfil",
    passos: [
      { titulo: "Seu perfil", conteudo: "Personalize as recomendações ao seu jeito de investir." },
      { alvo: '[data-tour="perfil-tipo"]', titulo: "Tipo de investidor", conteudo: "Conservador, moderado ou arrojado — muda o peso de cada indicador na nota." },
      { alvo: '[data-tour="perfil-pesos"]', titulo: "Pesos personalizados", conteudo: "Quer ir além? Ajuste o peso de cada indicador (a soma precisa dar 100%)." },
    ],
  },
];

const ORDEM_ABAS = ["Início", "Carteira", "Análise", "IA", "Perfil"];

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
