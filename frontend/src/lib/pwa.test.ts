import { describe, it, expect } from "vitest";
import { decidirConviteInstalar, ehIOS, BACKOFF_DISPENSA_MS } from "./pwa";

describe("decidirConviteInstalar", () => {
  const base = {
    jaInstalado: false,
    promptDisponivel: false,
    ehIOS: false,
    dispensadoEm: null as number | null,
    agora: 1_000_000_000,
  };

  it("fica oculto quando o app já está instalado", () => {
    expect(
      decidirConviteInstalar({ ...base, jaInstalado: true, promptDisponivel: true })
    ).toBe("oculto");
  });

  it("mostra 'android' quando há prompt nativo disponível", () => {
    expect(decidirConviteInstalar({ ...base, promptDisponivel: true })).toBe("android");
  });

  it("mostra 'ios' no iOS sem prompt nativo", () => {
    expect(decidirConviteInstalar({ ...base, ehIOS: true })).toBe("ios");
  });

  it("fica oculto se foi dispensado há menos que o backoff", () => {
    expect(
      decidirConviteInstalar({
        ...base,
        promptDisponivel: true,
        dispensadoEm: base.agora - 1000,
      })
    ).toBe("oculto");
  });

  it("volta a mostrar depois de passado o backoff", () => {
    expect(
      decidirConviteInstalar({
        ...base,
        promptDisponivel: true,
        dispensadoEm: base.agora - BACKOFF_DISPENSA_MS - 1,
      })
    ).toBe("android");
  });

  it("fica oculto em desktop sem prompt e fora do iOS", () => {
    expect(decidirConviteInstalar(base)).toBe("oculto");
  });
});

describe("ehIOS", () => {
  it("detecta iPhone", () => {
    expect(ehIOS("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
  });
  it("detecta iPad", () => {
    expect(ehIOS("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe(true);
  });
  it("é falso no Android", () => {
    expect(ehIOS("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe(false);
  });
});
