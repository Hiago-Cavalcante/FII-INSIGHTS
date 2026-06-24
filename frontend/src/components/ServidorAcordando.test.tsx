import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LIMIAR_ACORDANDO_MS } from "@/lib/health";

// Mantém classificarEstado/LIMIAR reais; só o ping é controlado no teste.
vi.mock("@/lib/health", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/health")>();
  return { ...actual, acordarServidor: vi.fn() };
});

import { acordarServidor } from "@/lib/health";
import { ServidorAcordando } from "./ServidorAcordando";

const acordarMock = acordarServidor as ReturnType<typeof vi.fn>;

describe("ServidorAcordando", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    acordarMock.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("mostra o aviso quando o ping demora além do limiar", async () => {
    acordarMock.mockReturnValue(new Promise<void>(() => {})); // nunca resolve (servidor dormindo)
    render(<ServidorAcordando />);

    // Antes do limiar: nada na tela.
    expect(screen.queryByRole("status")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(LIMIAR_ACORDANDO_MS);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/acordando o servidor/i);
  });

  it("não mostra nada quando o servidor responde rápido (já quente)", async () => {
    acordarMock.mockResolvedValue(undefined); // responde de imediato
    render(<ServidorAcordando />);

    await act(async () => {
      await Promise.resolve(); // flush do .finally do ping
      vi.advanceTimersByTime(LIMIAR_ACORDANDO_MS * 2);
    });

    expect(screen.queryByRole("status")).toBeNull();
  });
});
