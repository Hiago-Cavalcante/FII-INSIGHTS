import { useState } from "react";
import { useCarteira } from "@/hooks/useCarteira";
import { useDividendos } from "@/hooks/useDividendos";
import { useSimuladorStore } from "@/stores/simuladorStore";
import { projetarRenda } from "@/lib/simulador";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { ProjecaoRendaChart } from "@/components/charts/ProjecaoRendaChart";
import { formatPercent } from "@/lib/formato";
import { useRegistrarTour } from "@/hooks/useRegistrarTour";

const TAXA_FALLBACK = 0.008; // 0,8%/mês (~10% a.a.) quando não há carteira

export function SimuladorView() {
  useRegistrarTour("carteira-simulador");
  const { resumo } = useCarteira();
  const { dividendos } = useDividendos();
  const { aporteMensal, meses, rendaAlvo, setAporte, setMeses, setRendaAlvo } = useSimuladorStore();

  const totalInvestido = Number(resumo?.total_investido ?? 0);
  const capitalDefault = totalInvestido;
  const taxaDefault =
    totalInvestido > 0 && dividendos ? Number(dividendos.renda_mensal) / totalInvestido : TAXA_FALLBACK;

  // overrides editáveis (null = usa o default da carteira)
  const [capitalOverride, setCapitalOverride] = useState<number | null>(null);
  const [taxaOverride, setTaxaOverride] = useState<number | null>(null);
  const capitalInicial = capitalOverride ?? capitalDefault;
  const taxaMensal = taxaOverride ?? taxaDefault;

  const r = projetarRenda({ capitalInicial, aporteMensal: aporteMensal ?? 0, taxaMensal, meses, rendaAlvo });
  const anos = Math.round(meses / 12);

  return (
    <div className="flex flex-col gap-4">
      <section className="glass rounded-2xl p-4">
        <p className="text-sm text-muted-foreground">Renda mensal projetada em {anos} anos</p>
        <MoneyValue valor={r.rendaFinal} className="text-3xl font-extrabold text-primary" />
        <p className="mt-1 text-xs text-muted-foreground">
          patrimônio <MoneyValue valor={r.patrimonioFinal} />
          {rendaAlvo != null && rendaAlvo > 0 && (
            <>
              {" · "}
              {r.mesMeta != null ? `🎯 meta atingida no mês ${r.mesMeta}` : "meta não atingida no período"}
            </>
          )}
        </p>
      </section>

      <div className="rounded-2xl border border-border bg-card p-3">
        <ProjecaoRendaChart serie={r.serie} rendaAlvo={rendaAlvo} />
      </div>

      <div data-tour="simulador-controles" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Aporte mensal
          <input
            aria-label="Aporte mensal"
            type="number"
            min="0"
            step="50"
            value={aporteMensal ?? ""}
            onChange={(e) => setAporte(e.target.value === "" ? null : Number(e.target.value))}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-foreground">
          Horizonte: {anos} anos
          <input
            aria-label="Horizonte em anos"
            type="range"
            min="1"
            max="30"
            value={anos}
            onChange={(e) => setMeses(Number(e.target.value) * 12)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-foreground">
          Meta de renda mensal (opcional)
          <input
            aria-label="Meta de renda mensal"
            type="number"
            min="0"
            step="100"
            value={rendaAlvo ?? ""}
            onChange={(e) => setRendaAlvo(e.target.value === "" ? null : Number(e.target.value))}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-foreground">
          Capital inicial
          <input
            aria-label="Capital inicial"
            type="number"
            min="0"
            step="100"
            value={capitalInicial}
            onChange={(e) => setCapitalOverride(e.target.value === "" ? null : Number(e.target.value))}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-foreground">
          DY mensal: {formatPercent(taxaMensal * 100)}
          <input
            aria-label="DY mensal"
            type="range"
            min="1"
            max="30"
            value={Math.min(30, Math.round(taxaMensal * 1000))}
            onChange={(e) => setTaxaOverride(Number(e.target.value) / 1000)}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Capital e DY vêm da sua carteira; ajuste para simular cenários. Premissa: dividendos reinvestidos, sem
          valorização de cota.
        </p>
      </div>
    </div>
  );
}
