import { describe, it, expect } from "vitest";
import { projetarRenda } from "./simulador";

describe("projetarRenda — snowball com aportes", () => {
  it("acumula aporte + reinveste dividendos a cada mês", () => {
    // capital 1000, aporte 100, taxa 1%/mês, 3 meses
    // m1: 1100*0.01=11 -> pat 1111 ; m2: 1211*0.01=12.11 -> pat 1223.11
    // m3: 1323.11*0.01=13.2311 -> pat 1336.3411
    const r = projetarRenda({ capitalInicial: 1000, aporteMensal: 100, taxaMensal: 0.01, meses: 3 });
    expect(r.serie).toHaveLength(3);
    expect(r.serie[0].mes).toBe(1);
    expect(r.serie[0].renda).toBeCloseTo(11, 4);
    expect(r.serie[0].patrimonio).toBeCloseTo(1111, 4);
    expect(r.rendaFinal).toBeCloseTo(13.2311, 4);
    expect(r.patrimonioFinal).toBeCloseTo(1336.3411, 4);
    expect(r.mesMeta).toBeNull();
  });

  it("detecta o primeiro mês que atinge a meta de renda", () => {
    const r = projetarRenda({ capitalInicial: 1000, aporteMensal: 100, taxaMensal: 0.01, meses: 3, rendaAlvo: 12.5 });
    expect(r.mesMeta).toBe(3); // m1=11, m2=12.11, m3=13.2311 >= 12.5
  });

  it("retorna mesMeta null quando a meta não é atingida no horizonte", () => {
    const r = projetarRenda({ capitalInicial: 1000, aporteMensal: 100, taxaMensal: 0.01, meses: 3, rendaAlvo: 1000 });
    expect(r.mesMeta).toBeNull();
  });

  it("capital e aporte zerados produzem renda e patrimônio zero", () => {
    const r = projetarRenda({ capitalInicial: 0, aporteMensal: 0, taxaMensal: 0.01, meses: 2, rendaAlvo: 10 });
    expect(r.rendaFinal).toBe(0);
    expect(r.patrimonioFinal).toBe(0);
    expect(r.mesMeta).toBeNull();
  });

  it("horizonte zero retorna série vazia sem quebrar", () => {
    const r = projetarRenda({ capitalInicial: 500, aporteMensal: 100, taxaMensal: 0.01, meses: 0 });
    expect(r.serie).toEqual([]);
    expect(r.rendaFinal).toBe(0);
    expect(r.patrimonioFinal).toBe(500);
    expect(r.mesMeta).toBeNull();
  });
});
