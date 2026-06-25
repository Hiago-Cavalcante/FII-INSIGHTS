import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { useAssistente } from "@/hooks/useAssistente";
import { ultimasTrocas, type Mensagem } from "@/lib/assistente";
import { cn } from "@/lib/utils";
import { useRegistrarTour } from "@/hooks/useRegistrarTour";

type Nivel = "iniciante" | "analitico";

const SUGESTOES = [
  "O que é Dividend Yield?",
  "Como funciona o score?",
  "Quais os riscos de um FII de papel?",
  "Por que XPLG11 tem essa nota?",
];

function Bolha({ m }: { m: Mensagem }) {
  const ehUsuario = m.papel === "usuario";
  const ehErro = m.papel === "erro";
  return (
    <div
      className={cn(
        "max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm",
        ehUsuario
          ? "self-end rounded-br-sm bg-primary text-primary-foreground"
          : ehErro
            ? "self-start rounded-bl-sm bg-destructive/10 text-destructive"
            : "self-start rounded-bl-sm border border-border bg-card text-foreground"
      )}
    >
      {m.texto}
    </div>
  );
}

export function IAPage() {
  useRegistrarTour("ia");
  const assistente = useAssistente();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [nivel, setNivel] = useState<Nivel>("iniciante");
  const [texto, setTexto] = useState("");

  function enviar(msg: string) {
    const pergunta = msg.trim();
    if (pergunta === "" || assistente.isPending) return;
    const historico = ultimasTrocas(mensagens, 3);
    setMensagens((m) => [...m, { papel: "usuario", texto: pergunta }]);
    setTexto("");
    assistente.mutate(
      { mensagem: pergunta, historico, nivel },
      {
        onSuccess: (data) =>
          setMensagens((m) => [...m, { papel: "assistente", texto: data.resposta }]),
        onError: () =>
          setMensagens((m) => [
            ...m,
            { papel: "erro", texto: "Assistente indisponível agora. Tente em instantes." },
          ]),
      }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
        <Sparkles className="h-5 w-5 text-primary" /> Assistente
      </h1>

      <div className="rounded-xl border border-amber-400/40 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
        🧪 Beta — respondo sobre FIIs/FIAGROs e como usar a plataforma. Por enquanto, poucas
        perguntas por dia.
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Explicar para:</span>
        {(["iniciante", "analitico"] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNivel(n)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              nivel === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {n === "iniciante" ? "Iniciante" : "Analítico"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {mensagens.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => enviar(s)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-muted"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {mensagens.map((m, i) => (
          <Bolha key={i} m={m} />
        ))}
        {assistente.isPending && (
          <div className="self-start rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
            digitando…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="flex gap-2"
      >
        <input
          data-tour="ia-input"
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Pergunte sobre FIIs…"
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={assistente.isPending || texto.trim() === ""}
          aria-label="Enviar"
          className="flex items-center justify-center rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      <p className="text-[11px] text-muted-foreground">
        Explicação educativa baseada nos dados do sistema — não é recomendação de investimento.
      </p>
    </div>
  );
}
