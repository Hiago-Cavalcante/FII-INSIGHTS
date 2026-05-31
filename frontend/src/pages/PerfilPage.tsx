import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { usePerfilStore } from "@/stores/perfilStore";
import type { TipoPerfil, Classificacao } from "@/types/domain";
import type { PesosIndicadores } from "@/types/domain";
import { cn } from "@/lib/utils";
import { Divider } from "@/components/ui/Divider";
import { Check } from "lucide-react";
import { pesosSchema, type PesosForm } from "@/lib/pesosSchema";
import { simularRanking } from "@/api/endpoints/ranking";

const cardBase =
  "relative w-full rounded-lg border p-6 shadow-sm bg-white dark:bg-[#090E1A] border-gray-200 dark:border-gray-800";

interface PerfilConfig {
  tipo: TipoPerfil;
  rotulo: string;
  tagline: string;
  descricao: string;
  pesos: Array<{ indicador: string; peso: number; dimensao: string }>;
  corBorda: string;
  corAtivo: string;
  corBotao: string;
}

const PERFIS: PerfilConfig[] = [
  {
    tipo: "conservador",
    rotulo: "Conservador",
    tagline: "Foco em estabilidade e previsibilidade",
    descricao:
      "Prioriza fundos com renda consistente, baixa vacância e menor volatilidade. Adequado para quem quer proteção do patrimônio acima de tudo.",
    pesos: [
      { indicador: "DY Atual", peso: 10, dimensao: "Rentabilidade" },
      { indicador: "DY 12M", peso: 15, dimensao: "Rentabilidade" },
      { indicador: "P/VP", peso: 10, dimensao: "Valuation" },
      { indicador: "Vacância Física", peso: 15, dimensao: "Risco" },
      { indicador: "Vacância Financeira", peso: 15, dimensao: "Risco" },
      { indicador: "Liquidez Diária", peso: 10, dimensao: "Risco" },
      { indicador: "Volatilidade 12M", peso: 15, dimensao: "Risco" },
      { indicador: "Patrimônio Líquido", peso: 5, dimensao: "Estrutura" },
      { indicador: "Nº de Cotistas", peso: 5, dimensao: "Estrutura" },
      { indicador: "Segmento", peso: 0, dimensao: "Estrutura" },
    ],
    corBorda: "border-emerald-200 dark:border-emerald-500/30",
    corAtivo: "ring-2 ring-emerald-500",
    corBotao: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  {
    tipo: "moderado",
    rotulo: "Moderado",
    tagline: "Equilíbrio entre risco e retorno",
    descricao:
      "Distribuição equilibrada entre rentabilidade, segurança e valuation. Pesos padrão do modelo multicritério do FII Insights.",
    pesos: [
      { indicador: "DY Atual", peso: 20, dimensao: "Rentabilidade" },
      { indicador: "DY 12M", peso: 10, dimensao: "Rentabilidade" },
      { indicador: "P/VP", peso: 15, dimensao: "Valuation" },
      { indicador: "Vacância Física", peso: 10, dimensao: "Risco" },
      { indicador: "Vacância Financeira", peso: 10, dimensao: "Risco" },
      { indicador: "Liquidez Diária", peso: 10, dimensao: "Risco" },
      { indicador: "Volatilidade 12M", peso: 10, dimensao: "Risco" },
      { indicador: "Patrimônio Líquido", peso: 5, dimensao: "Estrutura" },
      { indicador: "Nº de Cotistas", peso: 5, dimensao: "Estrutura" },
      { indicador: "Segmento", peso: 5, dimensao: "Estrutura" },
    ],
    corBorda: "border-blue-200 dark:border-blue-500/30",
    corAtivo: "ring-2 ring-blue-500",
    corBotao: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    tipo: "arrojado",
    rotulo: "Arrojado",
    tagline: "Foco em rentabilidade e desconto",
    descricao:
      "Prioriza alto rendimento e fundos negociados abaixo do valor patrimonial. Aceita maior volatilidade em troca de retornos potencialmente maiores.",
    pesos: [
      { indicador: "DY Atual", peso: 25, dimensao: "Rentabilidade" },
      { indicador: "DY 12M", peso: 5, dimensao: "Rentabilidade" },
      { indicador: "P/VP", peso: 20, dimensao: "Valuation" },
      { indicador: "Vacância Física", peso: 10, dimensao: "Risco" },
      { indicador: "Vacância Financeira", peso: 5, dimensao: "Risco" },
      { indicador: "Liquidez Diária", peso: 10, dimensao: "Risco" },
      { indicador: "Volatilidade 12M", peso: 5, dimensao: "Risco" },
      { indicador: "Patrimônio Líquido", peso: 5, dimensao: "Estrutura" },
      { indicador: "Nº de Cotistas", peso: 5, dimensao: "Estrutura" },
      { indicador: "Segmento", peso: 10, dimensao: "Estrutura" },
    ],
    corBorda: "border-amber-200 dark:border-amber-500/30",
    corAtivo: "ring-2 ring-amber-500",
    corBotao: "bg-amber-600 hover:bg-amber-700 text-white",
  },
];

const dimensaoCores: Record<string, string> = {
  Rentabilidade: "text-blue-600 dark:text-blue-400",
  Valuation: "text-purple-600 dark:text-purple-400",
  Risco: "text-red-600 dark:text-red-400",
  Estrutura: "text-gray-600 dark:text-gray-400",
};

const INDICADORES: Array<{ chave: keyof PesosForm; rotulo: string; dimensao: string }> = [
  { chave: "dy_atual",            rotulo: "DY Atual",             dimensao: "Rentabilidade" },
  { chave: "dy_12m",              rotulo: "DY 12M",               dimensao: "Rentabilidade" },
  { chave: "p_vp",                rotulo: "P/VP",                 dimensao: "Valuation"     },
  { chave: "vacancia_fisica",     rotulo: "Vacância Física",      dimensao: "Risco"         },
  { chave: "vacancia_financeira", rotulo: "Vacância Financeira",  dimensao: "Risco"         },
  { chave: "liquidez_diaria",     rotulo: "Liquidez Diária",      dimensao: "Risco"         },
  { chave: "volatilidade_12m",    rotulo: "Volatilidade 12M",     dimensao: "Risco"         },
  { chave: "patrimonio_liquido",  rotulo: "Patrimônio Líquido",   dimensao: "Estrutura"     },
  { chave: "num_cotistas",        rotulo: "Nº de Cotistas",       dimensao: "Estrutura"     },
  { chave: "segmento",            rotulo: "Segmento",             dimensao: "Estrutura"     },
];

const PESOS_PADRAO_MODERADO: PesosForm = {
  dy_atual: 20, dy_12m: 10, p_vp: 15,
  vacancia_fisica: 10, vacancia_financeira: 10,
  liquidez_diaria: 10, volatilidade_12m: 10,
  patrimonio_liquido: 5, num_cotistas: 5, segmento: 5,
};

const SCORE_COLOR: Record<Classificacao, string> = {
  Excelente: "text-emerald-600 dark:text-emerald-400",
  Bom:       "text-blue-600 dark:text-blue-400",
  Regular:   "text-amber-600 dark:text-amber-400",
  Evitar:    "text-red-600 dark:text-red-400",
};

function PesosCustomizadosForm() {
  const { pesosCustom, setPesosCustom } = usePerfilStore();

  const defaultValues: PesosForm = pesosCustom
    ? {
        dy_atual:            Math.round(pesosCustom.dy_atual * 100),
        dy_12m:              Math.round(pesosCustom.dy_12m * 100),
        p_vp:                Math.round(pesosCustom.p_vp * 100),
        vacancia_fisica:     Math.round(pesosCustom.vacancia_fisica * 100),
        vacancia_financeira: Math.round(pesosCustom.vacancia_financeira * 100),
        liquidez_diaria:     Math.round(pesosCustom.liquidez_diaria * 100),
        volatilidade_12m:    Math.round(pesosCustom.volatilidade_12m * 100),
        patrimonio_liquido:  Math.round(pesosCustom.patrimonio_liquido * 100),
        num_cotistas:        Math.round(pesosCustom.num_cotistas * 100),
        segmento:            Math.round(pesosCustom.segmento * 100),
      }
    : PESOS_PADRAO_MODERADO;

  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<PesosForm>({
    resolver: zodResolver(pesosSchema),
    defaultValues,
    mode: "onChange",
  });

  const valores = watch();
  const soma = Object.values(valores).reduce((a, v) => a + (Number(v) || 0), 0);

  const pesosFracao: PesosIndicadores | null =
    Math.abs(soma - 100) < 0.01
      ? {
          dy_atual: valores.dy_atual / 100,
          dy_12m: valores.dy_12m / 100,
          p_vp: valores.p_vp / 100,
          vacancia_fisica: valores.vacancia_fisica / 100,
          vacancia_financeira: valores.vacancia_financeira / 100,
          liquidez_diaria: valores.liquidez_diaria / 100,
          volatilidade_12m: valores.volatilidade_12m / 100,
          patrimonio_liquido: valores.patrimonio_liquido / 100,
          num_cotistas: valores.num_cotistas / 100,
          segmento: valores.segmento / 100,
        }
      : null;

  const previewQuery = useQuery({
    queryKey: ["preview", pesosFracao],
    queryFn: () => simularRanking(pesosFracao!),
    enabled: pesosFracao !== null,
  });
  const previewTop3 = (previewQuery.data ?? []).slice(0, 3);

  function onSubmit(data: PesosForm) {
    const pesos: PesosIndicadores = {
      dy_atual: data.dy_atual / 100,
      dy_12m: data.dy_12m / 100,
      p_vp: data.p_vp / 100,
      vacancia_fisica: data.vacancia_fisica / 100,
      vacancia_financeira: data.vacancia_financeira / 100,
      liquidez_diaria: data.liquidez_diaria / 100,
      volatilidade_12m: data.volatilidade_12m / 100,
      patrimonio_liquido: data.patrimonio_liquido / 100,
      num_cotistas: data.num_cotistas / 100,
      segmento: data.segmento / 100,
    };
    setPesosCustom(pesos);
  }

  function handleReset() {
    reset(PESOS_PADRAO_MODERADO);
    setPesosCustom(null);
  }

  const somaErrors = errors as Record<string, { message?: string }>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn(cardBase, "mt-6")}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            Pesos Customizados
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Ajuste os pesos individualmente. Soma deve ser exatamente 100%.
          </p>
        </div>
        {pesosCustom && (
          <span className="text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-full px-2.5 py-0.5 font-medium">
            Customizado ativo
          </span>
        )}
      </div>

      <div className="space-y-3 mb-5">
        {INDICADORES.map(({ chave, rotulo, dimensao }) => (
          <Controller
            key={chave}
            name={chave}
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <span className="w-40 text-sm text-gray-600 dark:text-gray-300 shrink-0">{rotulo}</span>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={Number(field.value)}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="w-10 text-right text-sm tabular-nums font-medium text-gray-700 dark:text-gray-300">
                  {field.value}%
                </span>
                <span className={cn("w-24 text-right text-xs", dimensaoCores[dimensao])}>
                  {dimensao}
                </span>
              </div>
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4 mb-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Soma atual:{" "}
          <span className={cn(
            "font-semibold tabular-nums",
            Math.abs(soma - 100) < 0.01
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          )}>
            {soma}%
          </span>
          {" "}(meta: 100%)
        </span>
        {somaErrors._soma && (
          <span className="text-xs text-red-500">{somaErrors._soma.message}</span>
        )}
      </div>

      {previewTop3.length > 0 && (
        <div className="mb-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Preview — Top 3 com estes pesos:
          </p>
          <div className="flex gap-6">
            {previewTop3.map((f, i) => (
              <div key={f.ticker}>
                <span className="text-xs text-gray-400">{i + 1}. </span>
                <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-50">{f.ticker}</span>
                <span className={cn("ml-1 text-sm tabular-nums font-medium", SCORE_COLOR[f.classificacao as Classificacao])}>
                  {f.score.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={Math.abs(soma - 100) > 0.01}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Aplicar pesos
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Restaurar padrão
        </button>
      </div>
    </form>
  );
}

export function PerfilPage() {
  const { tipo, setTipo } = usePerfilStore();

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
          Perfil do Investidor
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Escolha como os indicadores influenciam o ranking dos FIIs
        </p>
      </div>

      <Divider />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {PERFIS.map((perfil) => {
          const ativo = tipo === perfil.tipo;
          return (
            <div
              key={perfil.tipo}
              className={cn(
                cardBase,
                "transition-all duration-200 cursor-pointer",
                perfil.corBorda,
                ativo && perfil.corAtivo
              )}
              onClick={() => setTipo(perfil.tipo)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-50">
                    {perfil.rotulo}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {perfil.tagline}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    ativo
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-300 dark:border-gray-600"
                  )}
                >
                  {ativo && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {perfil.descricao}
              </p>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Pesos dos indicadores
                </p>
                {perfil.pesos.map(({ indicador, peso, dimensao }) => (
                  <div key={indicador} className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2">
                      <div
                        className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 flex-1"
                        title={`${indicador}: ${peso}%`}
                      >
                        <div
                          className={cn(
                            "h-full rounded-full",
                            ativo ? "bg-blue-500" : "bg-gray-400 dark:bg-gray-500"
                          )}
                          style={{ width: `${peso === 0 ? 2 : (peso / 25) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-6 text-right text-xs tabular-nums font-medium text-gray-700 dark:text-gray-300">
                      {peso}%
                    </span>
                    <span className={cn("w-20 text-right text-xs", dimensaoCores[dimensao])}>
                      {indicador.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTipo(perfil.tipo);
                }}
                className={cn(
                  "mt-5 w-full rounded-lg py-2 text-sm font-medium transition-colors",
                  ativo
                    ? perfil.corBotao
                    : "border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                {ativo ? "Perfil ativo" : `Usar perfil ${perfil.rotulo}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className={cn(cardBase, "mt-6")}>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">
          Sobre o Modelo de Scoring
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          O FII Insights utiliza um modelo de scoring ponderado multicritério com 10 indicadores financeiros.
          Cada indicador recebe uma pontuação de 1 a 5 com base em faixas predefinidas, e o score final
          é calculado como a média ponderada normalizada (0–100). Fundos com indicadores nulos têm o peso
          redistribuído proporcionalmente dentro da mesma dimensão.
        </p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            { faixa: "≥ 80", label: "Excelente", cor: "text-emerald-600 dark:text-emerald-400" },
            { faixa: "60–79", label: "Bom", cor: "text-blue-600 dark:text-blue-400" },
            { faixa: "40–59", label: "Regular", cor: "text-amber-600 dark:text-amber-400" },
            { faixa: "< 40", label: "Evitar", cor: "text-red-600 dark:text-red-400" },
          ].map(({ faixa, label, cor }) => (
            <div key={label}>
              <p className={cn("font-semibold", cor)}>{label}</p>
              <p className="text-gray-400 dark:text-gray-500">Score {faixa}</p>
            </div>
          ))}
        </div>
      </div>

      <PesosCustomizadosForm />
    </div>
  );
}
