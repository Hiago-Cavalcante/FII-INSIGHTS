import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAuth } from "./useAuth";
import { useAuthStore } from "@/stores/authStore";
import * as authApi from "@/api/endpoints/auth";

vi.mock("@/api/endpoints/auth");

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.getState().logout();
});

describe("useAuth", () => {
  it("login guarda token e usuário no store", async () => {
    vi.mocked(authApi.login).mockResolvedValue({ access_token: "tok", token_type: "bearer" });
    vi.mocked(authApi.me).mockResolvedValue({ id: 1, email: "a@b.com", nome: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("a@b.com", "segredo123");
    });
    await waitFor(() => expect(useAuthStore.getState().token).toBe("tok"));
    expect(useAuthStore.getState().user?.email).toBe("a@b.com");
  });
});
