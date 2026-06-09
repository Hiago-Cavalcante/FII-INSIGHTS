import { useDividendos } from "@/hooks/useDividendos";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { RendaPorFundoChart } from "@/components/charts/RendaPorFundoChart";

export function DividendosView() {
  const { dividendos, isLoading, isError } = useDividendos();

  if (isLoading) return <p className="text-muted-foreground">Carregando dividendos…</p>;
  if (isError)
    return <p className="text-destructive" role="alert">Erro ao carregar os dividendos.</p>;
  if (!dividendos) return null;

  const yoc = dividendos.yield_on_cost;

  return (
    <div className="flex flex-col gap-4">
      <section className="glass rounded-2xl p-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          Renda mensal estimada
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">média 12m</span>
        </p>
        <MoneyValue valor={dividendos.renda_mensal} className="text-3xl font-extrabold text-primary" />
        <p className="mt-1 text-xs text-muted-foreground">
          ≈ <MoneyValue valor={dividendos.renda_anual} /> por ano
          {yoc != null && <> · Yield on cost {(yoc * 100).toFixed(1).replace(".", ",")}% a.a.</>}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Composição da renda</h2>
        <div className="rounded-2xl border border-border bg-card p-3">
          <RendaPorFundoChart porFundo={dividendos.por_fundo} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Quem paga mais</h2>
        <ul className="flex flex-col gap-2">
          {dividendos.por_fundo.map((f) => (
            <li key={f.ticker} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <span className="font-medium text-foreground">{f.ticker}</span>
              {f.sem_dados ? (
                <span className="text-xs text-muted-foreground">sem dados</span>
              ) : (
                <span className="text-sm text-foreground">
                  <MoneyValue valor={f.renda_mensal} />/mês · {(f.percentual * 100).toFixed(0)}%
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
