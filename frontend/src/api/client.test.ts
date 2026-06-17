import { describe, it, expect, beforeEach } from "vitest";
import { apiClient } from "./client";
import { useAuthStore } from "@/stores/authStore";

beforeEach(() => useAuthStore.getState().logout());

describe("apiClient interceptor", () => {
  it("injeta Authorization quando há token", async () => {
    useAuthStore.getState().setAuth("tok123", { id: 1, email: "a@b.com", nome: null });
    const cfg = await apiClient.interceptors.request.handlers[0].fulfilled({
      headers: {},
    } as never);
    expect(cfg.headers.Authorization).toBe("Bearer tok123");
  });

  it("não injeta header sem token", async () => {
    const cfg = await apiClient.interceptors.request.handlers[0].fulfilled({
      headers: {},
    } as never);
    expect(cfg.headers.Authorization).toBeUndefined();
  });
});
