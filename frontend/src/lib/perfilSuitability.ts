import type { TipoPerfil } from "@/types/domain";

/** Horizonte de tempo declarado no onboarding (RF-43). */
export type Horizonte = "curto" | "medio" | "longo";
/** Objetivo principal declarado no onboarding (RF-43). */
export type Objetivo = "renda" | "equilibrio" | "crescimento";

export interface OpcaoQuiz {
  label: string;
  /** 1 = mais conservador · 2 = moderado · 3 = mais arrojado. */
  pontos: 1 | 2 | 3;
}

export interface PerguntaQuiz {
  id: "horizonte" | "objetivo" | "risco" | "experiencia";
  pergunta: string;
  opcoes: OpcaoQuiz[];
}

export interface ResultadoPerfil {
  tipo: TipoPerfil;
  horizonte: Horizonte;
  objetivo: Objetivo;
}

/**
 * Questionário de suitability do onboarding. A ordem das opções vai do mais
 * conservador (índice 0) ao mais arrojado (índice 2) em todas as perguntas.
 */
export const PERGUNTAS: PerguntaQuiz[] = [
  {
    id: "horizonte",
    pergunta: "Quando pretende usar esse dinheiro?",
    opcoes: [
      { label: "Em até 2 anos", pontos: 1 },
      { label: "Entre 2 e 5 anos", pontos: 2 },
      { label: "Daqui a 5 anos ou mais", pontos: 3 },
    ],
  },
  {
    id: "objetivo",
    pergunta: "O que você mais busca nos FIIs?",
    opcoes: [
      { label: "Renda mensal estável e previsível", pontos: 1 },
      { label: "Equilíbrio entre renda e crescimento", pontos: 2 },
      { label: "Maximizar o retorno, aceitando oscilação", pontos: 3 },
    ],
  },
  {
    id: "risco",
    pergunta: "Se sua carteira caísse 20% em um mês, você:",
    opcoes: [
      { label: "Venderia para evitar perdas maiores", pontos: 1 },
      { label: "Manteria e esperaria recuperar", pontos: 2 },
      { label: "Aproveitaria para comprar mais", pontos: 3 },
    ],
  },
  {
    id: "experiencia",
    pergunta: "Qual sua experiência com investimentos?",
    opcoes: [
      { label: "Estou começando agora", pontos: 1 },
      { label: "Já invisto há algum tempo", pontos: 2 },
      { label: "Invisto há anos e conheço os riscos", pontos: 3 },
    ],
  },
];

const HORIZONTE_POR_INDICE: readonly Horizonte[] = ["curto", "medio", "longo"];
const OBJETIVO_POR_INDICE: readonly Objetivo[] = ["renda", "equilibrio", "crescimento"];

/**
 * Classifica o perfil a partir das opções escolhidas (um índice por pergunta,
 * na ordem de PERGUNTAS). Soma os pontos: 4–6 conservador · 7–9 moderado ·
 * 10–12 arrojado. Horizonte e objetivo vêm das perguntas 1 e 2 (RF-43).
 */
export function avaliarPerfil(selecoes: number[]): ResultadoPerfil {
  const soma = selecoes.reduce(
    (acc, indice, pergunta) => acc + PERGUNTAS[pergunta].opcoes[indice].pontos,
    0
  );
  const tipo: TipoPerfil = soma <= 6 ? "conservador" : soma <= 9 ? "moderado" : "arrojado";
  return {
    tipo,
    horizonte: HORIZONTE_POR_INDICE[selecoes[0]],
    objetivo: OBJETIVO_POR_INDICE[selecoes[1]],
  };
}
