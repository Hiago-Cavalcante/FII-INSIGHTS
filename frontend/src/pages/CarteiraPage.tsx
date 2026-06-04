import { useState, type FormEvent } from "react";
import { useCarteira } from "@/hooks/useCarteira";

export function CarteiraPage() {
  const { posicoes, resumo, isLoading, isError, aporte, remover } = useCarteira();
  const [ticker, setTicker] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [preco, setPreco] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    aporte.mutate({
      ticker: ticker.toUpperCase(),
      quantidade: Number(quantidade),
      preco,
    });
    setTicker("");
    setQuantidade("");
    setPreco("");
  }

  if (isLoading) return <p className="px-4">Carregando carteira…</p>;
  if (isError)
    return (
      <p className="px-4" role="alert">
        Erro ao carregar a carteira.
      </p>
    );

  return (
    <div className="flex flex-col gap-4 px-4 py-2">
      <h1 className="text-xl font-semibold">Minha Carteira</h1>

      {resumo && (
        <section className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Patrimônio investido</p>
          <p className="text-2xl font-bold">R$ {resumo.total_investido}</p>
          <p className="text-xs text-muted-foreground">
            FII R$ {resumo.por_classe.FII ?? "0.00"} · FIAGRO R${" "}
            {resumo.por_classe.FIAGRO ?? "0.00"}
          </p>
        </section>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Registrar aporte</h2>
        <input
          aria-label="Ticker"
          placeholder="Ticker (ex: HGLG11)"
          required
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          aria-label="Quantidade"
          type="number"
          min="1"
          placeholder="Quantidade"
          required
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          className="rounded border px-3 py-2"
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
          className="rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={aporte.isPending}
          className="rounded bg-primary px-3 py-2 text-white"
        >
          Adicionar
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {posicoes.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div>
              <p className="font-medium">
                {p.ticker}{" "}
                <span className="text-xs text-muted-foreground">{p.classe}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {p.quantidade} cotas · PM R$ {p.preco_medio}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">R$ {p.valor_investido}</span>
              <button
                aria-label={`Remover ${p.ticker}`}
                onClick={() => remover.mutate(p.id)}
                className="text-sm text-red-600"
              >
                Remover
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
