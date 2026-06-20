import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePerfilStore } from "@/stores/perfilStore";
import { PERGUNTAS, avaliarPerfil, type ResultadoPerfil } from "@/lib/perfilSuitability";
import { cn } from "@/lib/utils";

const DESCRICAO_TIPO: Record<string, { titulo: string; desc: string }> = {
  conservador: {
    titulo: "Conservador",
    desc: "Você prioriza estabilidade e renda previsível, com menos oscilação.",
  },
  moderado: {
    titulo: "Moderado",
    desc: "Você busca equilíbrio entre renda mensal e crescimento do patrimônio.",
  },
  arrojado: {
    titulo: "Arrojado",
    desc: "Você aceita mais oscilação em troca de maior potencial de retorno.",
  },
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const definirPerfil = usePerfilStore((s) => s.definirPerfil);
  const setTipo = usePerfilStore((s) => s.setTipo);
  const [selecoes, setSelecoes] = useState<(number | null)[]>(() => PERGUNTAS.map(() => null));
  const [resultado, setResultado] = useState<ResultadoPerfil | null>(null);

  const completo = selecoes.every((s) => s !== null);

  function escolher(pergunta: number, opcao: number) {
    setSelecoes((atual) => atual.map((v, i) => (i === pergunta ? opcao : v)));
  }

  function concluir() {
    if (!completo) return;
    const r = avaliarPerfil(selecoes as number[]);
    definirPerfil(r);
    setResultado(r);
  }

  function pular() {
    setTipo("moderado");
    navigate("/");
  }

  if (resultado) {
    const info = DESCRICAO_TIPO[resultado.tipo];
    return (
      <div className="app-gradient flex min-h-screen flex-col justify-center gap-6 px-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Seu perfil de investidor</p>
          <h1 className="mt-1 text-3xl font-bold text-primary">{info.titulo}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{info.desc}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
        >
          Começar
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Você pode ajustar isso quando quiser na aba Perfil.
        </p>
      </div>
    );
  }

  return (
    <div className="app-gradient min-h-screen px-6 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vamos descobrir seu perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            4 perguntas rápidas para personalizar suas recomendações.
          </p>
        </div>

        {PERGUNTAS.map((p, i) => (
          <fieldset key={p.id} className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold text-foreground">
              {i + 1}. {p.pergunta}
            </legend>
            {p.opcoes.map((o, j) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={selecoes[i] === j}
                onClick={() => escolher(i, j)}
                className={cn(
                  "rounded-xl border p-3 text-left text-sm transition-colors",
                  selecoes[i] === j
                    ? "border-primary bg-accent/50 font-medium text-foreground"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                {o.label}
              </button>
            ))}
          </fieldset>
        ))}

        <button
          type="button"
          onClick={concluir}
          disabled={!completo}
          className="rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
        >
          Ver meu perfil
        </button>
        <button
          type="button"
          onClick={pular}
          className="text-center text-sm text-muted-foreground underline"
        >
          Pular por agora
        </button>
      </div>
    </div>
  );
}
