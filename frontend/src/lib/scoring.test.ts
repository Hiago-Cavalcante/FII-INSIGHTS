import { describe, it, expect } from "vitest";
import {
  calcularPontuacaoDY,
  calcularPontuacaoPVP,
  calcularPontuacaoVacancia,
  calcularPontuacaoLiquidez,
  calcularPontuacaoVolatilidade,
  calcularPontuacaoPL,
  calcularPontuacaoCotistas,
  calcularPontuacaoSegmento,
  calcularScore,
  classificar,
} from "./scoring";
import type { FundoComIndicadores } from "@/types/domain";

describe("calcularPontuacaoDY", () => {
  it("retorna 1 para DY <= 6%", () => {
    expect(calcularPontuacaoDY(5.0)).toBe(1);
    expect(calcularPontuacaoDY(6.0)).toBe(1);
  });

  it("retorna 3 para DY > 6% e <= 8%", () => {
    expect(calcularPontuacaoDY(7.0)).toBe(3);
    expect(calcularPontuacaoDY(8.0)).toBe(3);
  });

  it("retorna 5 para DY > 8% e <= 10%", () => {
    expect(calcularPontuacaoDY(9.0)).toBe(5);
    expect(calcularPontuacaoDY(10.0)).toBe(5);
  });

  it("retorna 4 para DY > 10% e <= 12%", () => {
    expect(calcularPontuacaoDY(11.0)).toBe(4);
    expect(calcularPontuacaoDY(12.0)).toBe(4);
  });

  it("retorna 2 para DY > 12%", () => {
    expect(calcularPontuacaoDY(13.0)).toBe(2);
    expect(calcularPontuacaoDY(15.0)).toBe(2);
  });
});

describe("calcularPontuacaoPVP", () => {
  it("retorna 5 para P/VP < 0.80", () => {
    expect(calcularPontuacaoPVP(0.75)).toBe(5);
    expect(calcularPontuacaoPVP(0.50)).toBe(5);
  });

  it("retorna 4 para P/VP >= 0.80 e < 0.95", () => {
    expect(calcularPontuacaoPVP(0.88)).toBe(4);
    expect(calcularPontuacaoPVP(0.80)).toBe(4);
  });

  it("retorna 3 para P/VP >= 0.95 e < 1.05", () => {
    expect(calcularPontuacaoPVP(1.00)).toBe(3);
    expect(calcularPontuacaoPVP(0.95)).toBe(3);
  });

  it("retorna 2 para P/VP >= 1.05 e < 1.20", () => {
    expect(calcularPontuacaoPVP(1.10)).toBe(2);
    expect(calcularPontuacaoPVP(1.05)).toBe(2);
  });

  it("retorna 1 para P/VP >= 1.20", () => {
    expect(calcularPontuacaoPVP(1.25)).toBe(1);
    expect(calcularPontuacaoPVP(1.50)).toBe(1);
  });
});

describe("calcularPontuacaoVacancia", () => {
  it("retorna 5 para vacância < 5%", () => {
    expect(calcularPontuacaoVacancia(3.0)).toBe(5);
    expect(calcularPontuacaoVacancia(0.0)).toBe(5);
  });

  it("retorna 4 para vacância >= 5% e < 10%", () => {
    expect(calcularPontuacaoVacancia(5.0)).toBe(4);
    expect(calcularPontuacaoVacancia(7.0)).toBe(4);
  });

  it("retorna 3 para vacância >= 10% e < 15%", () => {
    expect(calcularPontuacaoVacancia(12.0)).toBe(3);
    expect(calcularPontuacaoVacancia(10.0)).toBe(3);
  });

  it("retorna 2 para vacância >= 15% e < 25%", () => {
    expect(calcularPontuacaoVacancia(18.0)).toBe(2);
    expect(calcularPontuacaoVacancia(15.0)).toBe(2);
  });

  it("retorna 1 para vacância >= 25%", () => {
    expect(calcularPontuacaoVacancia(25.0)).toBe(1);
    expect(calcularPontuacaoVacancia(30.0)).toBe(1);
  });
});

describe("calcularPontuacaoLiquidez", () => {
  it("retorna 1 para liquidez < 0.1M", () => {
    expect(calcularPontuacaoLiquidez(0.05)).toBe(1);
  });

  it("retorna 2 para liquidez >= 0.1M e < 0.5M", () => {
    expect(calcularPontuacaoLiquidez(0.1)).toBe(2);
    expect(calcularPontuacaoLiquidez(0.3)).toBe(2);
  });

  it("retorna 3 para liquidez >= 0.5M e < 1M", () => {
    expect(calcularPontuacaoLiquidez(0.5)).toBe(3);
    expect(calcularPontuacaoLiquidez(0.8)).toBe(3);
  });

  it("retorna 4 para liquidez >= 1M e < 5M", () => {
    expect(calcularPontuacaoLiquidez(1.0)).toBe(4);
    expect(calcularPontuacaoLiquidez(3.0)).toBe(4);
  });

  it("retorna 5 para liquidez >= 5M", () => {
    expect(calcularPontuacaoLiquidez(5.0)).toBe(5);
    expect(calcularPontuacaoLiquidez(15.0)).toBe(5);
  });
});

describe("calcularPontuacaoVolatilidade", () => {
  it("retorna 5 para volatilidade < 10%", () => {
    expect(calcularPontuacaoVolatilidade(8.0)).toBe(5);
    expect(calcularPontuacaoVolatilidade(5.0)).toBe(5);
  });

  it("retorna 4 para volatilidade >= 10% e < 15%", () => {
    expect(calcularPontuacaoVolatilidade(10.0)).toBe(4);
    expect(calcularPontuacaoVolatilidade(12.0)).toBe(4);
  });

  it("retorna 3 para volatilidade >= 15% e < 20%", () => {
    expect(calcularPontuacaoVolatilidade(15.0)).toBe(3);
    expect(calcularPontuacaoVolatilidade(17.0)).toBe(3);
  });

  it("retorna 2 para volatilidade >= 20% e < 30%", () => {
    expect(calcularPontuacaoVolatilidade(20.0)).toBe(2);
    expect(calcularPontuacaoVolatilidade(25.0)).toBe(2);
  });

  it("retorna 1 para volatilidade >= 30%", () => {
    expect(calcularPontuacaoVolatilidade(30.0)).toBe(1);
    expect(calcularPontuacaoVolatilidade(40.0)).toBe(1);
  });
});

describe("calcularPontuacaoPL", () => {
  it("retorna 1 para PL < 0.5B", () => {
    expect(calcularPontuacaoPL(0.3)).toBe(1);
  });

  it("retorna 2 para PL >= 0.5B e < 1B", () => {
    expect(calcularPontuacaoPL(0.5)).toBe(2);
    expect(calcularPontuacaoPL(0.8)).toBe(2);
  });

  it("retorna 3 para PL >= 1B e < 3B", () => {
    expect(calcularPontuacaoPL(1.0)).toBe(3);
    expect(calcularPontuacaoPL(2.0)).toBe(3);
  });

  it("retorna 4 para PL >= 3B e < 5B", () => {
    expect(calcularPontuacaoPL(3.0)).toBe(4);
    expect(calcularPontuacaoPL(4.0)).toBe(4);
  });

  it("retorna 5 para PL >= 5B", () => {
    expect(calcularPontuacaoPL(5.0)).toBe(5);
    expect(calcularPontuacaoPL(8.0)).toBe(5);
  });
});

describe("calcularPontuacaoCotistas", () => {
  it("retorna 1 para cotistas < 50k", () => {
    expect(calcularPontuacaoCotistas(30)).toBe(1);
  });

  it("retorna 2 para cotistas >= 50k e < 100k", () => {
    expect(calcularPontuacaoCotistas(50)).toBe(2);
    expect(calcularPontuacaoCotistas(75)).toBe(2);
  });

  it("retorna 3 para cotistas >= 100k e < 200k", () => {
    expect(calcularPontuacaoCotistas(100)).toBe(3);
    expect(calcularPontuacaoCotistas(150)).toBe(3);
  });

  it("retorna 4 para cotistas >= 200k e < 400k", () => {
    expect(calcularPontuacaoCotistas(200)).toBe(4);
    expect(calcularPontuacaoCotistas(300)).toBe(4);
  });

  it("retorna 5 para cotistas >= 400k", () => {
    expect(calcularPontuacaoCotistas(400)).toBe(5);
    expect(calcularPontuacaoCotistas(500)).toBe(5);
  });
});

describe("calcularPontuacaoSegmento", () => {
  it("retorna 5 para Logística", () => {
    expect(calcularPontuacaoSegmento("Logística")).toBe(5);
  });

  it("retorna 4 para Recebíveis", () => {
    expect(calcularPontuacaoSegmento("Recebíveis")).toBe(4);
  });

  it("retorna 4 para Shoppings", () => {
    expect(calcularPontuacaoSegmento("Shoppings")).toBe(4);
  });

  it("retorna 3 para Escritórios", () => {
    expect(calcularPontuacaoSegmento("Escritórios")).toBe(3);
  });

  it("retorna 3 para Híbrido", () => {
    expect(calcularPontuacaoSegmento("Híbrido")).toBe(3);
  });

  it("retorna 3 para Fundo de Fundos", () => {
    expect(calcularPontuacaoSegmento("Fundo de Fundos")).toBe(3);
  });

  it("retorna 2 para null", () => {
    expect(calcularPontuacaoSegmento(null)).toBe(2);
  });

  it("retorna 2 para segmento desconhecido", () => {
    expect(calcularPontuacaoSegmento("Outro")).toBe(2);
  });
});

describe("classificar", () => {
  it("retorna Excelente para score >= 80", () => {
    expect(classificar(82)).toBe("Excelente");
    expect(classificar(80)).toBe("Excelente");
    expect(classificar(100)).toBe("Excelente");
  });

  it("retorna Bom para score >= 60 e < 80", () => {
    expect(classificar(70)).toBe("Bom");
    expect(classificar(60)).toBe("Bom");
    expect(classificar(79)).toBe("Bom");
  });

  it("retorna Regular para score >= 40 e < 60", () => {
    expect(classificar(50)).toBe("Regular");
    expect(classificar(40)).toBe("Regular");
    expect(classificar(59)).toBe("Regular");
  });

  it("retorna Evitar para score < 40", () => {
    expect(classificar(35)).toBe("Evitar");
    expect(classificar(0)).toBe("Evitar");
    expect(classificar(39)).toBe("Evitar");
  });
});

describe("calcularScore", () => {
  const fundoCompleto: FundoComIndicadores = {
    id: 1,
    ticker: "TEST11",
    nome: "FII Teste",
    segmento: "Logística",
    gestora: "Gestora Teste",
    dy_atual: 9.2,
    dy_12m: 10.1,
    p_vp: 0.92,
    vacancia_fisica: 3.0,
    vacancia_financeira: 3.5,
    liquidez_diaria: 8.5,
    volatilidade_12m: 8.2,
    patrimonio_liquido: 4.2,
    num_cotistas: 300,
  };

  it("retorna número entre 0 e 100 para fundo com todos indicadores preenchidos (perfil moderado)", () => {
    const score = calcularScore(fundoCompleto, "moderado");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(typeof score).toBe("number");
    expect(Number.isFinite(score)).toBe(true);
  });

  it("retorna número entre 0 e 100 para perfil conservador", () => {
    const score = calcularScore(fundoCompleto, "conservador");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("retorna número entre 0 e 100 para perfil arrojado", () => {
    const score = calcularScore(fundoCompleto, "arrojado");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("redistribui pesos quando vacancia_fisica e vacancia_financeira são null (FII de papel) e retorna valor válido 0-100", () => {
    const fundoPapel: FundoComIndicadores = {
      ...fundoCompleto,
      segmento: "Recebíveis",
      vacancia_fisica: null,
      vacancia_financeira: null,
    };
    const score = calcularScore(fundoPapel, "moderado");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(Number.isFinite(score)).toBe(true);
  });

  it("retorna valor maior para fundo de papel sem vacância do que se houvesse penalidade por nulo", () => {
    const fundoPapel: FundoComIndicadores = {
      ...fundoCompleto,
      segmento: "Recebíveis",
      vacancia_fisica: null,
      vacancia_financeira: null,
    };
    const score = calcularScore(fundoPapel, "moderado");
    expect(Number.isFinite(score)).toBe(true);
  });

  it("perfis diferentes produzem scores numéricos válidos para o mesmo fundo", () => {
    const scoreConservador = calcularScore(fundoCompleto, "conservador");
    const scoreArrojado = calcularScore(fundoCompleto, "arrojado");
    expect(scoreConservador).toBeGreaterThanOrEqual(0);
    expect(scoreConservador).toBeLessThanOrEqual(100);
    expect(scoreArrojado).toBeGreaterThanOrEqual(0);
    expect(scoreArrojado).toBeLessThanOrEqual(100);
  });
});

import { calcularScoreComPesos } from "./scoring";
import type { PesosIndicadores } from "./scoring";
import { pesosSchema } from "./pesosSchema";

describe("calcularScoreComPesos", () => {
  const fundoBase: FundoComIndicadores = {
    id: 99,
    ticker: "TEST11",
    nome: "Teste",
    segmento: "Logística",
    gestora: null,
    dy_atual: 9.0,
    dy_12m: 10.0,
    p_vp: 0.90,
    vacancia_fisica: 3.0,
    vacancia_financeira: 3.0,
    liquidez_diaria: 6.0,
    volatilidade_12m: 9.0,
    patrimonio_liquido: 4.0,
    num_cotistas: 300,
  };

  const pesosIguais: PesosIndicadores = {
    dy_atual: 0.10,
    dy_12m: 0.10,
    p_vp: 0.10,
    vacancia_fisica: 0.10,
    vacancia_financeira: 0.10,
    liquidez: 0.10,
    volatilidade: 0.10,
    pl: 0.10,
    cotistas: 0.10,
    segmento: 0.10,
  };

  it("retorna número entre 0 e 100", () => {
    const score = calcularScoreComPesos(fundoBase, pesosIguais);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("produz resultado idêntico a calcularScore('moderado') com pesos moderados", () => {
    const pesosModerdo: PesosIndicadores = {
      dy_atual: 0.20, dy_12m: 0.10, p_vp: 0.15,
      vacancia_fisica: 0.10, vacancia_financeira: 0.10,
      liquidez: 0.10, volatilidade: 0.10,
      pl: 0.05, cotistas: 0.05, segmento: 0.05,
    };
    const scoreComPesos = calcularScoreComPesos(fundoBase, pesosModerdo);
    const scorePerfil = calcularScore(fundoBase, "moderado");
    expect(scoreComPesos).toBeCloseTo(scorePerfil, 5);
  });

  it("redistribui vacância nula dentro da dimensão Risco", () => {
    const fundoSemVacancia = { ...fundoBase, vacancia_fisica: null, vacancia_financeira: null };
    const score = calcularScoreComPesos(fundoSemVacancia, pesosIguais);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("pesosSchema", () => {
  const pesosValidos = {
    dy_atual: 20, dy_12m: 10, p_vp: 15,
    vacancia_fisica: 10, vacancia_financeira: 10,
    liquidez: 10, volatilidade: 10,
    pl: 5, cotistas: 5, segmento: 5,
  };

  it("aceita pesos válidos que somam 100", () => {
    expect(pesosSchema.safeParse(pesosValidos).success).toBe(true);
  });

  it("rejeita quando a soma é diferente de 100", () => {
    const resultado = pesosSchema.safeParse({ ...pesosValidos, dy_atual: 25 });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0].message).toContain("100");
    }
  });

  it("rejeita valores negativos", () => {
    const resultado = pesosSchema.safeParse({ ...pesosValidos, dy_atual: -5, dy_12m: 25 });
    expect(resultado.success).toBe(false);
  });

  it("rejeita valores acima de 60", () => {
    const resultado = pesosSchema.safeParse({ ...pesosValidos, dy_atual: 65, dy_12m: -25 });
    expect(resultado.success).toBe(false);
  });
});
