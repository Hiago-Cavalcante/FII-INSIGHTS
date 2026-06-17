import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./authStore";

beforeEach(() => useAuthStore.getState().logout());

describe("authStore", () => {
  it("começa deslogado", () => {
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it("setAuth guarda token e usuário", () => {
    useAuthStore.getState().setAuth("tok123", { id: 1, email: "a@b.com", nome: null });
    expect(useAuthStore.getState().token).toBe("tok123");
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe("a@b.com");
  });

  it("logout limpa o estado", () => {
    useAuthStore.getState().setAuth("tok123", { id: 1, email: "a@b.com", nome: null });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
