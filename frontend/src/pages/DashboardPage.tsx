import { useDashboard } from "@/hooks/useDashboard";
import { usePerfilStore } from "@/stores/perfilStore";
import { FiiCard } from "@/components/FiiCard";
import { ScoreBarChart } from "@/components/charts/ScoreBarChart";
import { ProgressCircle } from "@/components/ProgressCircle";
import { Divider } from "@/components/ui/Divider";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import type { Classificacao } from "@/types/domain";

const ROTULO_PERFIL = {
  conservador: "Conservador",
  moderado: "Moderado",
  arrojado: "Arrojado",
} as const;

function scoreVariant(score: number) {
  if (score >= 80) return "success";
  if (score >= 60) return "default";
  if (score >= 40) return "warning";
  return "error";
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

const cardBase =
  "relative w-full rounded-lg border p-6 shadow-sm bg-white dark:bg-[#090E1A] border-gray-200 dark:border-gray-800";

export function DashboardPage() {
  const { scoreMedio, totalFiis, topFiis, distribuicao, isLoading, isError } = useDashboard();
  const perfil = usePerfilStore((s) => s.tipo);

  const topClassificacao = (
    Object.entries(distribuicao) as [Classificacao, number][]
  ).sort((a, b) => b[1] - a[1])[0];

  if (isError && !isLoading) {
    return <ErrorState message="Não foi possível carregar o dashboard." />;
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Visão geral do mercado · Perfil {ROTULO_PERFIL[perfil]}
          </p>
        </div>
      </div>

      <Divider />

      {isLoading ? (
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cardBase}>
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-2 w-full mt-4" />
              <Skeleton className="h-2 w-3/4 mt-2" />
            </div>
          ))}
        </dl>
      ) : (
      <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Score Médio */}
        <div className={cardBase}>
          <dt className="text-sm font-medium text-gray-900 dark:text-gray-50">
            Score Médio do Portfólio
          </dt>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <dd className={`text-3xl font-semibold tabular-nums ${scoreColor(scoreMedio)}`}>
                {scoreMedio.toFixed(1)}
              </dd>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                em {totalFiis} FIIs analisados
              </p>
            </div>
            <ProgressCircle
              value={scoreMedio}
              max={100}
              radius={38}
              strokeWidth={7}
              variant={scoreVariant(scoreMedio)}
            >
              <span className={`text-sm font-semibold tabular-nums ${scoreColor(scoreMedio)}`}>
                {scoreMedio.toFixed(0)}
              </span>
            </ProgressCircle>
          </div>
        </div>

        {/* Distribuição */}
        <div className={cardBase}>
          <dt className="text-sm font-medium text-gray-900 dark:text-gray-50">
            Distribuição por Classificação
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-50">
            {totalFiis}
            <span className="ml-1 text-base font-normal text-gray-500 dark:text-gray-400">
              fundos
            </span>
          </dd>
          <div className="mt-3">
            <ScoreBarChart distribuicao={distribuicao as Record<Classificacao, number>} />
          </div>
        </div>

        {/* Destaque */}
        <div className={cardBase}>
          <dt className="text-sm font-medium text-gray-900 dark:text-gray-50">
            Classificação Predominante
          </dt>
          {topClassificacao && (
            <>
              <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-50">
                {topClassificacao[0]}
              </dd>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {topClassificacao[1]} de {totalFiis} FIIs (
                {totalFiis > 0 ? ((topClassificacao[1] / totalFiis) * 100).toFixed(0) : "0"}% do portfólio)
              </p>
              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {distribuicao["Excelente"]}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">Excelente</p>
                </div>
                <div>
                  <p className="font-semibold text-blue-600 dark:text-blue-400">
                    {distribuicao["Bom"]}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">Bom</p>
                </div>
                <div>
                  <p className="font-semibold text-amber-600 dark:text-amber-400">
                    {distribuicao["Regular"]}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">Regular</p>
                </div>
                <div>
                  <p className="font-semibold text-red-600 dark:text-red-400">
                    {distribuicao["Evitar"]}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">Evitar</p>
                </div>
              </div>
            </>
          )}
        </div>
      </dl>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Melhores para você · Perfil {ROTULO_PERFIL[perfil]}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topFiis.map((fii) => (
            <FiiCard
              key={fii.ticker}
              ticker={fii.ticker}
              nome={fii.nome ?? fii.ticker}
              segmento={fii.segmento}
              score={fii.score}
              classificacao={fii.classificacao}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
