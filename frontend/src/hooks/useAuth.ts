import { useAuthStore } from "@/stores/authStore";
import * as authApi from "@/api/endpoints/auth";

export function useAuth() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  async function autenticar(token: string) {
    useAuthStore.setState({ token });
    const usuario = await authApi.me();
    setAuth(token, usuario);
  }

  return {
    async login(email: string, senha: string) {
      const { access_token } = await authApi.login(email, senha);
      await autenticar(access_token);
    },
    async register(nome: string, email: string, senha: string) {
      const { access_token } = await authApi.register(nome, email, senha);
      await autenticar(access_token);
    },
    logout,
  };
}
