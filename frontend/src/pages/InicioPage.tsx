import { Link } from "react-router-dom";
import { useCarteira } from "@/hooks/useCarteira";
import { useDashboard } from "@/hooks/useDashboard";
import { useDividendos } from "@/hooks/useDividendos";
import { useAuthStore } from "@/stores/authStore";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { ClassificacaoBadge } from "@/components/ClassificacaoBadge";

export function InicioPage() {
  const { resumo } = useCarteira();
  const { topFiis } = useDashboard();
  const { dividendos } = useDividendos();
  const user = useAuthStore((s) => s.user);
  const primeiroNome = user?.nome?.trim().split(" ")[0];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-foreground">
        {primeiroNome ? `Olá, ${primeiroNome}` : "Olá"}
      </h1>

      <Link
        to="/carteira"
        className="glass rounded-2xl p-4"
      >
        <p className="text-sm text-muted-foreground">Patrimônio investido</p>
        <MoneyValue
          valor={resumo?.total_investido ?? "0.00"}
          className="text-3xl font-extrabold text-primary"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          FII <MoneyValue valor={resumo?.por_classe?.FII ?? "0.00"} /> · FIAGRO{" "}
          <MoneyValue valor={resumo?.por_classe?.FIAGRO ?? "0.00"} />
        </p>
      </Link>

      <Link to="/carteira" className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Renda mensal estimada</p>
        <MoneyValue
          valor={dividendos?.renda_mensal ?? "0.00"}
          className="text-2xl font-bold text-primary"
        />
        <p className="mt-1 text-xs text-muted-foreground">média dos últimos 12 meses</p>
      </Link>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Destaques para você</h2>
          <Link to="/analise" className="text-xs font-medium text-primary">
            Ver análise
          </Link>
        </div>
        <ul className="flex flex-col gap-2">
          {topFiis.slice(0, 3).map((f) => (
            <li
              key={f.ticker}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
            >
              <div>
                <p className="font-medium text-foreground">{f.ticker}</p>
                <p className="text-xs text-muted-foreground">{f.nome ?? f.ticker}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tabular-nums text-foreground">
                  {f.score.toFixed(0)}
                </span>
                <ClassificacaoBadge classificacao={f.classificacao} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="rounded-2xl border border-border bg-accent/40 p-4">
        <p className="text-sm font-semibold text-foreground">💡 Aprenda enquanto investe</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Toque no "?" ao lado de qualquer indicador para entender o que ele significa,
          sem jargão.
        </p>
      </div>
    </div>
  );
}
