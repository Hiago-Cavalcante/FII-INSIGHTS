import { Link } from "react-router-dom";
import { useCarteira } from "@/hooks/useCarteira";
import { useDashboard } from "@/hooks/useDashboard";
import { useDividendos } from "@/hooks/useDividendos";
import { useAuthStore } from "@/stores/authStore";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { ClassificacaoBadge } from "@/components/ClassificacaoBadge";
import { IndiceTours } from "@/components/ui/IndiceTours";
import { useRegistrarTour } from "@/hooks/useRegistrarTour";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder do valor enquanto a API responde — evita exibir "R$ 0,00" falso. */
function ValorCarregando({ className }: { className: string }) {
  return <Skeleton data-testid="carregando" className={className} />;
}

export function InicioPage() {
  useRegistrarTour("inicio");
  const { resumo, isLoading: carregandoCarteira } = useCarteira();
  const { topFiis, isLoading: carregandoDestaques, isError: erroDestaques } = useDashboard();
  const { dividendos, isLoading: carregandoRenda } = useDividendos();
  const user = useAuthStore((s) => s.user);
  const primeiroNome = user?.nome?.trim().split(" ")[0];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-foreground">
        {primeiroNome ? `Olá, ${primeiroNome}` : "Olá"}
      </h1>

      <Link
        to="/carteira"
        data-tour="inicio-patrimonio"
        className="glass rounded-2xl p-4"
      >
        <p className="text-sm text-muted-foreground">Patrimônio investido</p>
        {carregandoCarteira ? (
          <>
            <ValorCarregando className="mt-1 h-9 w-40" />
            <ValorCarregando className="mt-2 h-3 w-48" />
          </>
        ) : (
          <>
            <MoneyValue
              valor={resumo?.total_investido ?? "0.00"}
              className="text-3xl font-extrabold text-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              FII <MoneyValue valor={resumo?.por_classe?.FII ?? "0.00"} /> · FIAGRO{" "}
              <MoneyValue valor={resumo?.por_classe?.FIAGRO ?? "0.00"} />
            </p>
          </>
        )}
      </Link>

      <Link to="/carteira" data-tour="inicio-renda" className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Renda mensal estimada</p>
        {carregandoRenda ? (
          <ValorCarregando className="mt-1 h-8 w-32" />
        ) : (
          <MoneyValue
            valor={dividendos?.renda_mensal ?? "0.00"}
            className="text-2xl font-bold text-primary"
          />
        )}
        <p className="mt-1 text-xs text-muted-foreground">média dos últimos 12 meses</p>
      </Link>

      <section data-tour="inicio-destaques">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Destaques para você</h2>
          <Link to="/analise" className="-my-3 inline-flex min-h-11 items-center px-1 text-xs font-medium text-primary">
            Ver análise
          </Link>
        </div>
        {erroDestaques && (
          <p role="alert" className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
            Não foi possível carregar os destaques agora. Tente novamente em instantes.
          </p>
        )}
        {carregandoDestaques && (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} data-testid="carregando" className="h-14 w-full rounded-xl" />
            ))}
          </div>
        )}
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

      <IndiceTours />
    </div>
  );
}
