import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) {
      setErro("A senha precisa ter ao menos 8 caracteres.");
      return;
    }
    try {
      await register(email, senha);
      navigate("/");
    } catch {
      setErro("Não foi possível cadastrar (e-mail já em uso?).");
    }
  }

  return (
    <div className="app-gradient flex min-h-screen flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-2xl">
          📈
        </div>
        <h1 className="text-2xl font-bold text-foreground">Criar conta</h1>
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
          className="rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground"
        >
          Cadastrar
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link to="/login" className="font-medium text-primary underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
