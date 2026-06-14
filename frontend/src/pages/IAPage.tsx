import { useState, useMemo } from "react";
import { Search, X, Sparkles } from "lucide-react";
import { useRanking } from "@/hooks/useRanking";
import { useAssistente } from "@/hooks/useAssistente";
import { ClasseBadge } from "@/components/ui/ClasseBadge";
import { ClassificacaoBadge } from "@/components/ClassificacaoBadge";
import { cn } from "@/lib/utils";
import type { RankingItem } from "@/types/ranking";

type Nivel = "iniciante" | "analitico";

const SUGESTOES = [
  "Por que esse fundo recebeu essa nota?",
  "Quais são os principais riscos?",
  "O dividend yield dele é bom?",
  "O que significa o P/VP desse fundo?",
];

export function IAPage() {
  const { fundos } = useRanking();
  const assistente = useAssistente();

  const [ticker, setTicker] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [nivel, setNivel] = useState<Nivel>("iniciante");
  const [pergunta, setPergunta] = useState("");

  const selecionado = useMemo<RankingItem | null>(
    () => fundos.find((f) => f.ticker === ticker) ?? null,
    [fundos, ticker]
  );

  const sugestoesFundos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (termo === "" || ticker) return [];
    return fundos
      .filter((f) => f.ticker.toLowerCase().includes(termo) || (f.nome ?? "").toLowerCase().includes(termo))
      .slice(0, 6);
  }, [busca, fundos, ticker]);

  const perguntar = (texto: string) => {
    if (!ticker || texto.trim() === "") return;
    setPergunta(texto);
    assistente.mutate({ ticker, pergunta: texto, nivel });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <Sparkles className="h-5 w-5 text-primary" /> Assistente
        </h1>
        <p className="text-sm text-muted-foreground">
          Pergunte em linguagem simples por que um fundo recebeu cada nota — sempre ancorado nos dados calculados.
        </p>
      </div>

      {/* Seleção de fundo */}
      {!selecionado ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Escolha um fundo (ticker ou nome)…"
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-ring"
          />
          {sugestoesFundos.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {sugestoesFundos.map((f) => (
                <li key={f.ticker}>
                  <button
                    type="button"
                    onClick={() => {
                      setTicker(f.ticker);
                      setBusca("");
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="font-mono font-semibold text-foreground">{f.ticker}</span>
                    <span className="truncate pl-2 text-xs text-muted-foreground">{f.nome}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2">
              <span className="font-mono font-semibold text-foreground">{selecionado.ticker}</span>
              <ClasseBadge classe={selecionado.classe} />
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              Score {selecionado.score.toFixed(1)} <ClassificacaoBadge classificacao={selecionado.classificacao} />
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setTicker(null);
              assistente.reset();
            }}
            aria-label="Trocar de fundo"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {selecionado && (
        <>
          {/* Nível de linguagem */}
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

          {/* Perguntas sugeridas */}
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => perguntar(s)}
                disabled={assistente.isPending}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-muted disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Pergunta livre */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              perguntar(pergunta);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Faça uma pergunta sobre este fundo…"
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={assistente.isPending || pergunta.trim() === ""}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Perguntar
            </button>
          </form>

          {/* Resposta */}
          {assistente.isPending && <p className="text-sm text-muted-foreground">Pensando…</p>}
          {assistente.isError && (
            <p className="text-sm text-destructive" role="alert">
              Assistente indisponível no momento. Tente novamente em instantes.
            </p>
          )}
          {assistente.data && (
            <div className="whitespace-pre-line rounded-2xl border border-border bg-card p-4 text-sm text-foreground">
              {assistente.data.resposta}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Explicação educativa baseada nos dados calculados pelo sistema — não é recomendação de investimento.
          </p>
        </>
      )}
    </div>
  );
}
