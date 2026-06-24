import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ConviteInstalarPwa } from "./ConviteInstalarPwa";

const DELAY_MS = 1500;
const uaOriginal = navigator.userAgent;

function definirUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
}

describe("ConviteInstalarPwa", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    definirUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36");
  });
  afterEach(() => {
    vi.useRealTimers();
    definirUserAgent(uaOriginal);
  });

  it("mostra o convite 'Instalar' (Android) quando o prompt nativo aparece", async () => {
    render(<ConviteInstalarPwa />);

    // antes do delay, nada
    expect(screen.queryByRole("dialog")).toBeNull();

    await act(async () => {
      window.dispatchEvent(new Event("beforeinstallprompt"));
      vi.advanceTimersByTime(DELAY_MS);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /instalar/i })).toBeInTheDocument();
  });

  it("mostra instruções de iOS quando não há prompt nativo", async () => {
    definirUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    render(<ConviteInstalarPwa />);

    await act(async () => {
      vi.advanceTimersByTime(DELAY_MS);
    });

    expect(screen.getByRole("dialog")).toHaveTextContent(/adicionar à tela de início/i);
  });

  it("fica oculto quando já foi dispensado recentemente", async () => {
    localStorage.setItem("pwa-convite-dispensado", String(Date.now()));
    render(<ConviteInstalarPwa />);

    await act(async () => {
      window.dispatchEvent(new Event("beforeinstallprompt"));
      vi.advanceTimersByTime(DELAY_MS);
    });

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
