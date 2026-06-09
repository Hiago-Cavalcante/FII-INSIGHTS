import { useState, type FormEvent } from "react";
import { useCarteira } from "@/hooks/useCarteira";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { ClasseBadge } from "@/components/ui/ClasseBadge";

export function PosicoesView() {
  const { posicoes, resumo, isLoading, isError, aporte, remover } = useCarteira();
  const [ticker, setTicker] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [preco, setPreco] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    aporte.mutate({ ticker: ticker.toUpperCase(), quantidade: Number(quantidade), preco });
    setTicker("");
    setQuantidade("");
    setPreco("");
  }

  if (isLoading) return <p className="text-muted-foreground">Carregando carteira…</p>;
  if (isError)
    return <p className="text-destructive" role="alert">Erro ao carregar a carteira.</p>;

  return (
    <div className="flex flex-col gap-4">
      {resumo && (
        <section className="glass rounded-2xl p-4">
          <p className="text-sm text-muted-foreground">Patrimônio investido</p>
          <MoneyValue valor={resumo.total_investido} className="text-3xl font-extrabold text-primary" />
          <p className="mt-1 text-xs text-muted-foreground">
            FII <MoneyValue valor={resumo.por_classe.FII ?? "0.00"} /> · FIAGRO{" "}
            <MoneyValue valor={resumo.por_classe.FIAGRO ?? "0.00"} />
          </p>
        </section>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Registrar aporte</h2>
        <input aria-label="Ticker" placeholder="Ticker (ex: HGLG11)" required value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground" />
        <input aria-label="Quantidade" type="number" min="1" placeholder="Quantidade" required value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground" />
        <input aria-label="Preço" type="number" step="0.01" min="0.01" placeholder="Preço por cota" required value={preco}
          onChange={(e) => setPreco(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground" />
        <button type="submit" disabled={aporte.isPending}
          className="rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
          Adicionar
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {posicoes.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
            <div>
              <p className="flex items-center gap-2 font-medium text-foreground">
                {p.ticker}
                <ClasseBadge classe={p.classe} />
              </p>
              <p className="text-xs text-muted-foreground">
                {p.quantidade} cotas · PM <MoneyValue valor={p.preco_medio} />
              </p>
            </div>
            <div className="flex items-center gap-3">
              <MoneyValue valor={p.valor_investido} className="font-semibold text-foreground" />
              <button aria-label={`Remover ${p.ticker}`} onClick={() => remover.mutate(p.id)}
                className="text-sm text-destructive">Remover</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
