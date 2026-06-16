import { useRecomendacoes } from "@/hooks/useRecomendacoes";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { ClasseBadge } from "@/components/ui/ClasseBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import type { ClasseRebal, PrecoTeto } from "@/api/endpoints/recomendacoes";

const pct = (v: number | null | undefined): string =>
  v == null ? "—" : `${(v * 100).toFixed(1).replace(".", ",")}%`;

const SUGESTAO_COR: Record<string, string> = {
  "Aportar mais": "bg-primary/10 text-primary",
  "Reduzir ritmo": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Equilibrado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

/** Campo de percentual editável (armazena fração, exibe/edita em %). */
function PercentInput({
  label,
  fracao,
  onChange,
  step = 1,
}: {
  label: string;
  fracao: number;
  onChange: (f: number) => void;
  step?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={Number((fracao * 100).toFixed(1))}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(v / 100);
          }}
          className="w-20 rounded-lg border border-border bg-card px-2 py-1.5 text-right text-base text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring"
        />
        <span className="text-muted-foreground">%</span>
      </span>
    </label>
  );
}

function RebalClasse({ c }: { c: ClasseRebal }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <ClasseBadge classe={c.classe} />
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", SUGESTAO_COR[c.sugestao] ?? "bg-muted")}>
          {c.sugestao}
        </span>
      </div>
      {/* barra: preenchimento = atual; marcador = alvo */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${Math.min(c.atual_pct * 100, 100)}%` }} />
        <div
          className="absolute top-[-2px] h-3 w-0.5 bg-foreground"
          style={{ left: `${Math.min(c.alvo_pct * 100, 100)}%` }}
          aria-hidden
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Atual {pct(c.atual_pct)} · Alvo {pct(c.alvo_pct)}
      </p>
    </div>
  );
}

function PrecoTetoCard({ p }: { p: PrecoTeto }) {
  const margemCor =
    p.status === "Abaixo do teto"
      ? "text-emerald-600 dark:text-emerald-400"
      : p.status === "Acima do teto"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";
  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="font-mono font-semibold text-foreground">{p.ticker}</span>
          <ClasseBadge classe={p.classe} />
        </span>
        <span className={cn("text-xs font-semibold", margemCor)}>{p.status}</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">Atual</p>
          <p className="text-foreground">{p.preco_atual != null ? <MoneyValue valor={p.preco_atual} /> : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">Teto (Bazin)</p>
          <p className="text-foreground">{p.preco_teto != null ? <MoneyValue valor={p.preco_teto} /> : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">Margem</p>
          <p className={cn("font-semibold", margemCor)}>{pct(p.margem_seguranca)}</p>
        </div>
      </div>
    </li>
  );
}

export function RecomendacoesView() {
  const {
    recomendacoes,
    isLoading,
    isError,
    yieldFii,
    setYieldFii,
    yieldFiagro,
    setYieldFiagro,
    alvoFii,
    setAlvoFii,
  } = useRecomendacoes();

  if (isLoading) return <p className="text-muted-foreground">Carregando recomendações…</p>;
  if (isError)
    return (
      <p className="text-destructive" role="alert">
        Erro ao carregar as recomendações.
      </p>
    );
  if (!recomendacoes) return null;

  const { precos_teto, rebalanceamento } = recomendacoes;

  if (precos_teto.length === 0 && rebalanceamento.classes.length === 0) {
    return (
      <EmptyState
        icone={<span>🧭</span>}
        titulo="Sem recomendações ainda"
        descricao="Cadastre posições na carteira para ver preço-teto e sugestão de rebalanceamento."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Rebalanceamento */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Rebalanceamento por classe</h2>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <PercentInput label="Alvo em FII" fracao={alvoFii} onChange={setAlvoFii} step={5} />
          <p className="mt-1 text-xs text-muted-foreground">FIAGRO = {pct(1 - alvoFii)} (complemento)</p>
        </div>
        <div className="flex flex-col gap-2">
          {rebalanceamento.classes.map((c) => (
            <RebalClasse key={c.classe} c={c} />
          ))}
        </div>
      </section>

      {/* Preço-teto */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Preço-teto (método Bazin)</h2>
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
          <PercentInput label="Yield-alvo FII" fracao={yieldFii} onChange={setYieldFii} />
          <PercentInput label="Yield-alvo FIAGRO" fracao={yieldFiagro} onChange={setYieldFiagro} />
        </div>
        <ul className="flex flex-col gap-2">
          {precos_teto.map((p) => (
            <PrecoTetoCard key={p.ticker} p={p} />
          ))}
        </ul>
      </section>
    </div>
  );
}
