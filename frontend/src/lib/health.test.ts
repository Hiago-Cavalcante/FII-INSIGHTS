import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { classificarEstado, acordarServidor } from "./health";

describe("classificarEstado", () => {
  it("retorna 'pronto' quando o ping resolveu", () => {
    expect(classificarEstado({ resolvido: true, msDecorridos: 0, limiarMs: 2500 })).toBe("pronto");
  });

  it("continua 'pronto' mesmo se demorou (resolvido vence o tempo)", () => {
    expect(classificarEstado({ resolvido: true, msDecorridos: 9999, limiarMs: 2500 })).toBe(
      "pronto"
    );
  });

  it("retorna 'ocioso' enquanto não resolveu e está dentro do limiar", () => {
    expect(classificarEstado({ resolvido: false, msDecorridos: 1000, limiarMs: 2500 })).toBe(
      "ocioso"
    );
  });

  it("retorna 'acordando' quando passou do limiar sem resolver", () => {
    expect(classificarEstado({ resolvido: false, msDecorridos: 4000, limiarMs: 2500 })).toBe(
      "acordando"
    );
  });

  it("no limiar exato já considera 'acordando'", () => {
    expect(classificarEstado({ resolvido: false, msDecorridos: 2500, limiarMs: 2500 })).toBe(
      "acordando"
    );
  });
});

describe("acordarServidor", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dispara um GET no /health", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true } as Response);
    await acordarServidor();
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url.endsWith("/health")).toBe(true);
  });

  it("nunca lança, mesmo se a rede falhar (fire-and-forget)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network down"));
    await expect(acordarServidor()).resolves.toBeUndefined();
  });
});
