import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(email, senha);
      navigate("/");
    } catch {
      setErro("E-mail ou senha inválidos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="app-gradient flex min-h-screen flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-2xl">
          📈
        </div>
        <h1 className="text-2xl font-bold text-foreground">Entrar</h1>
        <p className="text-sm text-muted-foreground">FII Insights</p>
      </div>
      <form onSubmit={onSubmit} className="glass flex flex-col gap-3 rounded-2xl p-5">
        <label className="flex flex-col gap-1 text-sm text-foreground">
          E-mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-input bg-card px-3 py-2.5 text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Senha
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="rounded-xl border border-input bg-card px-3 py-2.5 text-foreground"
          />
        </label>
        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
        <button
          type="submit"
          disabled={enviando}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground transition-opacity disabled:opacity-70"
        >
          {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link to="/registro" className="font-medium text-primary underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
