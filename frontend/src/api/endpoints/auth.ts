import { apiClient } from "@/api/client";
import type { AuthUser } from "@/stores/authStore";

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function register(email: string, senha: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/api/v1/auth/register", { email, senha });
  return data;
}

export async function login(email: string, senha: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/api/v1/auth/login", { email, senha });
  return data;
}

export async function me(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/api/v1/auth/me");
  return data;
}
