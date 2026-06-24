import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { usePerfilStore } from "@/stores/perfilStore";
import type { TipoPerfil, Classificacao } from "@/types/domain";
import type { PesosIndicadores } from "@/types/domain";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, LogOut } from "lucide-react";
import { pesosSchema, type PesosForm } from "@/lib/pesosSchema";
import { simularRanking } from "@/api/endpoints/ranking";
import { useAuth } from "@/hooks/useAuth";
import { useRegistrarTour } from "@/hooks/useRegistrarTour";

// PesosForm traz percentuais inteiros (somam 100); converte para frações (somam 1.0).
function toPesosIndicadores(p: PesosForm): PesosIndicadores {
  return {
    dy_atual: p.dy_atual / 100,
    dy_12m: p.dy_12m / 100,
    p_vp: p.p_vp / 100,
    vacancia_fisica: p.vacancia_fisica / 100,
    vacancia_financeira: p.vacancia_financeira / 100,
    liquidez_diaria: p.liquidez_diaria / 100,
    volatilidade_12m: p.volatilidade_12m / 100,
    patrimonio_liquido: p.patrimonio_liquido / 100,
    num_cotistas: p.num_cotistas / 100,
    segmento: p.segmento / 100,
  };
}

interface PerfilConfig {
  tipo: TipoPerfil;
  rotulo: string;
  tagline: string;
  pesos: Array<{ indicador: string; peso: number }>;
}

const PERFIS: PerfilConfig[] = [
  {
    tipo: "conservador",
    rotulo: "Conservador",
    tagline: "Estabilidade e previsibilidade",
    pesos: [
      { indicador: "DY Atual", peso: 10 },
      { indicador: "DY 12M", peso: 15 },
      { indicador: "P/VP", peso: 10 },
      { indicador: "Vacância Física", peso: 15 },
      { indicador: "Vacância Financeira", peso: 15 },
      { indicador: "Liquidez Diária", peso: 10 },
      { indicador: "Volatilidade 12M", peso: 15 },
      { indicador: "Patrimônio Líquido", peso: 5 },
      { indicador: "Nº de Cotistas", peso: 5 },
      { indicador: "Segmento", peso: 0 },
    ],
  },
  {
    tipo: "moderado",
    rotulo: "Moderado",
    tagline: "Equilíbrio entre risco e retorno",
    pesos: [
      { indicador: "DY Atual", peso: 20 },
      { indicador: "DY 12M", peso: 10 },
      { indicador: "P/VP", peso: 15 },
      { indicador: "Vacância Física", peso: 10 },
      { indicador: "Vacância Financeira", peso: 10 },
      { indicador: "Liquidez Diária", peso: 10 },
      { indicador: "Volatilidade 12M", peso: 10 },
      { indicador: "Patrimônio Líquido", peso: 5 },
      { indicador: "Nº de Cotistas", peso: 5 },
      { indicador: "Segmento", peso: 5 },
    ],
  },
  {
    tipo: "arrojado",
    rotulo: "Arrojado",
    tagline: "Rentabilidade e desconto (P/VP)",
    pesos: [
      { indicador: "DY Atual", peso: 25 },
      { indicador: "DY 12M", peso: 5 },
      { indicador: "P/VP", peso: 20 },
      { indicador: "Vacância Física", peso: 10 },
      { indicador: "Vacância Financeira", peso: 5 },
      { indicador: "Liquidez Diária", peso: 10 },
      { indicador: "Volatilidade 12M", peso: 5 },
      { indicador: "Patrimônio Líquido", peso: 5 },
      { indicador: "Nº de Cotistas", peso: 5 },
      { indicador: "Segmento", peso: 10 },
    ],
  },
];

const INDICADORES: Array<{ chave: keyof PesosForm; rotulo: string }> = [
  { chave: "dy_atual", rotulo: "DY Atual" },
  { chave: "dy_12m", rotulo: "DY 12M" },
  { chave: "p_vp", rotulo: "P/VP" },
  { chave: "vacancia_fisica", rotulo: "Vacância Física" },
  { chave: "vacancia_financeira", rotulo: "Vacância Financeira" },
  { chave: "liquidez_diaria", rotulo: "Liquidez Diária" },
  { chave: "volatilidade_12m", rotulo: "Volatilidade 12M" },
  { chave: "patrimonio_liquido", rotulo: "Patrimônio Líquido" },
  { chave: "num_cotistas", rotulo: "Nº de Cotistas" },
  { chave: "segmento", rotulo: "Segmento" },
];

const PESOS_PADRAO_MODERADO: PesosForm = {
  dy_atual: 20, dy_12m: 10, p_vp: 15,
  vacancia_fisica: 10, vacancia_financeira: 10,
  liquidez_diaria: 10, volatilidade_12m: 10,
  patrimonio_liquido: 5, num_cotistas: 5, segmento: 5,
};

const SCORE_COLOR: Record<Classificacao, string> = {
  Excelente: "text-emerald-600 dark:text-emerald-400",
  Bom: "text-blue-600 dark:text-blue-400",
  Regular: "text-amber-600 dark:text-amber-400",
  Evitar: "text-red-600 dark:text-red-400",
};

// ---------------------------------------------------------------------------
// Seção colapsável reutilizável
// ---------------------------------------------------------------------------

function Secao({
  titulo,
  children,
  aberta,
  onToggle,
}: {
  titulo: string;
  children: React.ReactNode;
  aberta: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-sm font-medium text-foreground"
      >
        {titulo}
        <ChevronDown className={cn("h-4 w-4 transition-transform", aberta && "rotate-180")} />
      </button>
      {aberta && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form de pesos customizados (sem card — vive dentro da seção colapsável)
// ---------------------------------------------------------------------------

function PesosCustomizadosForm() {
  const { pesosCustom, setPesosCustom } = usePerfilStore();

  const defaultValues: PesosForm = pesosCustom
    ? {
        dy_atual: Math.round(pesosCustom.dy_atual * 100),
        dy_12m: Math.round(pesosCustom.dy_12m * 100),
        p_vp: Math.round(pesosCustom.p_vp * 100),
        vacancia_fisica: Math.round(pesosCustom.vacancia_fisica * 100),
        vacancia_financeira: Math.round(pesosCustom.vacancia_financeira * 100),
        liquidez_diaria: Math.round(pesosCustom.liquidez_diaria * 100),
        volatilidade_12m: Math.round(pesosCustom.volatilidade_12m * 100),
        patrimonio_liquido: Math.round(pesosCustom.patrimonio_liquido * 100),
        num_cotistas: Math.round(pesosCustom.num_cotistas * 100),
        segmento: Math.round(pesosCustom.segmento * 100),
      }
    : PESOS_PADRAO_MODERADO;

  const { control, handleSubmit, watch, reset } = useForm<PesosForm>({
    resolver: zodResolver(pesosSchema),
    defaultValues,
    mode: "onChange",
  });

  const valores = watch();
  const soma = Object.values(valores).reduce((a, v) => a + (Number(v) || 0), 0);
  const somaOk = Math.abs(soma - 100) < 0.01;

  const pesosFracao: PesosIndicadores | null = somaOk ? toPesosIndicadores(valores) : null;

  const previewQuery = useQuery({
    queryKey: ["preview", pesosFracao],
    queryFn: () => simularRanking(pesosFracao!),
    enabled: pesosFracao !== null,
  });
  const previewTop3 = (previewQuery.data ?? []).slice(0, 3);

  function onSubmit(data: PesosForm) {
    setPesosCustom(toPesosIndicadores(data));
  }
  function handleReset() {
    reset(PESOS_PADRAO_MODERADO);
    setPesosCustom(null);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Ajuste os pesos. A soma precisa ser exatamente 100%.
        {pesosCustom && (
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
            Customizado ativo
          </span>
        )}
      </p>

      <div className="flex flex-col gap-3">
        {INDICADORES.map(({ chave, rotulo }) => (
          <Controller
            key={chave}
            name={chave}
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-foreground">{rotulo}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                    {field.value}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={Number(field.value)}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Soma atual</span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            somaOk ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
          )}
        >
          {soma}% / 100%
        </span>
      </div>

      {previewTop3.length > 0 && (
        <div className="rounded-xl bg-muted/60 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Preview — Top 3:</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {previewTop3.map((f, i) => (
              <span key={f.ticker} className="text-sm">
                <span className="text-xs text-muted-foreground">{i + 1}. </span>
                <span className="font-mono font-semibold text-foreground">{f.ticker}</span>
                <span className={cn("ml-1 tabular-nums font-medium", SCORE_COLOR[f.classificacao])}>
                  {f.score.toFixed(1)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!somaOk}
          className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Aplicar pesos
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
        >
          Padrão
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const FAIXAS: Array<{ faixa: string; label: string; cor: string }> = [
  { faixa: "≥ 80", label: "Excelente", cor: "text-emerald-600 dark:text-emerald-400" },
  { faixa: "60–79", label: "Bom", cor: "text-blue-600 dark:text-blue-400" },
  { faixa: "40–59", label: "Regular", cor: "text-amber-600 dark:text-amber-400" },
  { faixa: "< 40", label: "Evitar", cor: "text-red-600 dark:text-red-400" },
];

export function PerfilPage() {
  useRegistrarTour("perfil");
  const { tipo, setTipo } = usePerfilStore();
  const { logout } = useAuth();
  const [secao, setSecao] = useState<"pesos" | "custom" | "sobre" | null>(null);
  const ativo = PERFIS.find((p) => p.tipo === tipo) ?? PERFIS[1];

  const toggle = (s: "pesos" | "custom" | "sobre") =>
    setSecao((atual) => (atual === s ? null : s));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Perfil do Investidor</h1>
        <p className="text-sm text-muted-foreground">
          Define como os indicadores pesam no ranking
        </p>
      </div>

      {/* Seletor compacto */}
      <div data-tour="perfil-tipo" className="flex flex-col gap-2">
        {PERFIS.map((p) => {
          const sel = tipo === p.tipo;
          return (
            <button
              key={p.tipo}
              type="button"
              onClick={() => setTipo(p.tipo)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                sel ? "border-primary bg-accent/50" : "border-border bg-card"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  sel ? "border-primary bg-primary" : "border-muted-foreground/40"
                )}
              >
                {sel && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-foreground">{p.rotulo}</span>
                <span className="block text-xs text-muted-foreground">{p.tagline}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Pesos do perfil ativo */}
      <div data-tour="perfil-pesos">
        <Secao
          titulo={`Pesos do perfil ${ativo.rotulo}`}
          aberta={secao === "pesos"}
          onToggle={() => toggle("pesos")}
        >
          <div className="flex flex-col gap-2">
            {ativo.pesos.map((w) => (
              <div key={w.indicador} className="flex items-center gap-2">
                <span className="flex-1 text-sm text-muted-foreground">{w.indicador}</span>
                <div className="h-1.5 w-20 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(w.peso / 25) * 100}%` }}
                  />
                </div>
                <span className="w-9 text-right text-xs font-medium tabular-nums text-foreground">
                  {w.peso}%
                </span>
              </div>
            ))}
          </div>
        </Secao>
      </div>

      {/* Personalizar */}
      <Secao
        titulo="Personalizar pesos"
        aberta={secao === "custom"}
        onToggle={() => toggle("custom")}
      >
        <PesosCustomizadosForm />
      </Secao>

      {/* Sobre o scoring */}
      <Secao
        titulo="Sobre o modelo de scoring"
        aberta={secao === "sobre"}
        onToggle={() => toggle("sobre")}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          Modelo ponderado multicritério com 10 indicadores. Cada um recebe nota de 1 a 5 por
          faixas, e o score final é a média ponderada normalizada (0–100). Indicadores nulos têm o
          peso redistribuído na mesma dimensão.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          {FAIXAS.map(({ faixa, label, cor }) => (
            <div key={label}>
              <p className={cn("font-semibold", cor)}>{label}</p>
              <p className="text-xs text-muted-foreground">Score {faixa}</p>
            </div>
          ))}
        </div>
      </Secao>

      {/* Sair */}
      <button
        type="button"
        onClick={logout}
        className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 py-3 text-sm font-semibold text-destructive"
      >
        <LogOut className="h-4 w-4" />
        Sair da conta
      </button>
    </div>
  );
}
