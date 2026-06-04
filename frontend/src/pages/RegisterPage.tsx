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
      navigate("/carteira");
    } catch {
      setErro("Não foi possível cadastrar (e-mail já em uso?).");
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">Criar conta</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="rounded border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
            className="rounded border px-3 py-2" />
        </label>
        {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        <button type="submit" className="rounded bg-primary px-3 py-2 text-white">Cadastrar</button>
      </form>
      <p className="text-sm">
        Já tem conta? <Link to="/login" className="underline">Entrar</Link>
      </p>
    </div>
  );
}
