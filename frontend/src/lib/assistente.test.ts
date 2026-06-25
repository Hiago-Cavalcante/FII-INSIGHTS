import { describe, it, expect } from "vitest";
import { ultimasTrocas, type Mensagem } from "./assistente";

const msgs: Mensagem[] = [
  { papel: "usuario", texto: "q1" },
  { papel: "assistente", texto: "a1" },
  { papel: "erro", texto: "x" },
  { papel: "usuario", texto: "q2" },
  { papel: "assistente", texto: "a2" },
  { papel: "usuario", texto: "q3" },
  { papel: "assistente", texto: "a3" },
];

describe("ultimasTrocas", () => {
  it("retorna as últimas n trocas, sem bolhas de erro", () => {
    expect(ultimasTrocas(msgs, 2)).toEqual([
      { papel: "usuario", texto: "q2" },
      { papel: "assistente", texto: "a2" },
      { papel: "usuario", texto: "q3" },
      { papel: "assistente", texto: "a3" },
    ]);
  });
  it("ignora erros e não quebra com poucas mensagens", () => {
    expect(ultimasTrocas([{ papel: "erro", texto: "x" }], 3)).toEqual([]);
  });
});
