import { useState, type FormEvent } from "react";
import { Trash2, Sparkles } from "lucide-react";
import { useCarteira } from "@/hooks/useCarteira";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { ClasseBadge } from "@/components/ui/ClasseBadge";
import { useRegistrarTour } from "@/hooks/useRegistrarTour";

export function PosicoesView() {
  useRegistrarTour("carteira-posicoes");
  const { posicoes, resumo, isLoading, isError, aporte, remover, carregarExemplo, limpar } =
    useCarteira();
  const [ticker, setTicker] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [preco, setPreco] = useState("");
  const vazia = posicoes.length === 0;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    aporte.mutate({ ticker: ticker.toUpperCase(), quantidade: Number(quantidade), preco });
    setTicker("");
    setQuantidade("");
    setPreco("");
  }

  function onLimpar() {
    if (window.confirm("Limpar toda a carteira?")) limpar.mutate(posicoes.map((p) => p.id));
  }

  if (isLoading) return <p className="text-muted-foreground">Carregando carteira…</p>;
  if (isError)
    return (
      <p className="text-destructive" role="alert">
        Erro ao carregar a carteira.
      </p>
    );

  return (
    <div className="flex flex-col gap-4">
      {resumo && !vazia && (
        <section data-tour="carteira-total" className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Patrimônio investido</p>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              simulação
            </span>
          </div>
          <MoneyValue valor={resumo.total_investido} className="text-3xl font-extrabold text-primary" />
          <p className="mt-1 text-xs text-muted-foreground">
            FII <MoneyValue valor={resumo.por_classe.FII ?? "0.00"} /> · FIAGRO{" "}
            <MoneyValue valor={resumo.por_classe.FIAGRO ?? "0.00"} />
          </p>
        </section>
      )}

      {vazia ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-6 text-center">
          <Sparkles className="h-8 w-8 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">Comece com uma carteira de exemplo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Carregamos alguns fundos (FIIs + FIAGRO) para você explorar dividendos, scoring e
              recomendações. São <strong>dados ilustrativos</strong>, não posições reais.
            </p>
          </div>
          <button
            type="button"
            onClick={() => carregarExemplo.mutate()}
            disabled={carregarExemplo.isPending}
            className="w-full rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
          >
            {carregarExemplo.isPending ? "Carregando…" : "Carregar carteira de exemplo"}
          </button>
        </section>
      ) : (
        <ul className="flex flex-col gap-2">
          {posicoes.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  {p.ticker}
                  <ClasseBadge classe={p.classe} />
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.quantidade} cotas · PM <MoneyValue valor={p.preco_medio} />
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <MoneyValue valor={p.valor_investido} className="font-semibold text-foreground" />
                <button
                  aria-label={`Remover ${p.ticker}`}
                  onClick={() => {
                    if (window.confirm(`Remover ${p.ticker} da carteira?`)) remover.mutate(p.id);
                  }}
                  disabled={remover.isPending}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-destructive disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Cadastro manual (RF-01) — recolhido, secundário ao exemplo */}
      <details data-tour="carteira-add" className="rounded-2xl border border-border bg-card">
        <summary className="cursor-pointer p-4 text-sm font-medium text-foreground">
          Adicionar fundo manualmente
        </summary>
        <form onSubmit={onSubmit} className="flex flex-col gap-2 px-4 pb-4">
          <input
            aria-label="Ticker"
            placeholder="Ticker (ex: HGLG11)"
            required
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground"
          />
          <input
            aria-label="Quantidade"
            type="number"
            min="1"
            placeholder="Quantidade"
            required
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground"
          />
          <input
            aria-label="Preço"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Preço por cota"
            required
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground"
          />
          <button
            type="submit"
            disabled={aporte.isPending}
            className="rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
          >
            Adicionar
          </button>
        </form>
      </details>

      {!vazia && (
        <button
          type="button"
          onClick={onLimpar}
          disabled={limpar.isPending}
          className="rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground disabled:opacity-60"
        >
          {limpar.isPending ? "Limpando…" : "Limpar carteira"}
        </button>
      )}
    </div>
  );
}
