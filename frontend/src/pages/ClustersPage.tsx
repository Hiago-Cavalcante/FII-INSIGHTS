import { Divider } from "@/components/ui/Divider";
import { cn } from "@/lib/utils";
import { Cpu, AlertCircle } from "lucide-react";

const cardBase =
  "relative w-full rounded-lg border p-6 shadow-sm bg-white dark:bg-[#090E1A] border-gray-200 dark:border-gray-800";

interface ClusterCard {
  nome: string;
  perfil: string;
  descricao: string;
  caracteristicas: string[];
  cor: string;
  dotCor: string;
}

const CLUSTERS_PLACEHOLDER: ClusterCard[] = [
  {
    nome: "Tijolo Conservador",
    perfil: "Conservador",
    descricao:
      "FIIs de baixo risco com renda estável, alta liquidez e baixa volatilidade. Ideal para quem prioriza previsibilidade de rendimentos.",
    caracteristicas: [
      "Baixa volatilidade (< 12% a.a.)",
      "DY moderado (7–9%)",
      "Vacância física < 8%",
      "Alta liquidez diária",
    ],
    cor: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
    dotCor: "bg-emerald-500",
  },
  {
    nome: "Tijolo Balanceado",
    perfil: "Moderado",
    descricao:
      "Equilíbrio entre risco e retorno. Boa distribuição de dividendos com volatilidade controlada e vacância razoável.",
    caracteristicas: [
      "Volatilidade média (12–18% a.a.)",
      "DY competitivo (9–11%)",
      "Vacância até 15%",
      "Liquidez adequada",
    ],
    cor: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
    dotCor: "bg-blue-500",
  },
  {
    nome: "Papel Agressivo",
    perfil: "Arrojado",
    descricao:
      "FIIs de recebíveis com alto DY, mas expostos a variações de taxa de juros. Maior risco, maior potencial de retorno.",
    caracteristicas: [
      "DY elevado (> 11%)",
      "Sem vacância (recebíveis)",
      "Sensível à taxa Selic",
      "Alta volatilidade relativa",
    ],
    cor: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
    dotCor: "bg-amber-500",
  },
  {
    nome: "Híbrido Diversificado",
    perfil: "Moderado",
    descricao:
      "Fundos com estratégia mista ou fundo de fundos. Diversificação natural, útil para distribuir exposição por segmentos.",
    caracteristicas: [
      "Exposição a múltiplos segmentos",
      "DY variável",
      "Correlação reduzida",
      "Gestão ativa de portfólio",
    ],
    cor: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20",
    dotCor: "bg-purple-500",
  },
];

export function ClustersPage() {
  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Clusters K-Means
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Segmentação automática de FIIs por perfil de risco e retorno
          </p>
        </div>
      </div>

      <Divider />

      <div
        className={cn(
          cardBase,
          "mb-6 flex items-start gap-3 bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20"
        )}
      >
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
            Aguardando dados do backend
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
            Execute{" "}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
              python -m scripts.rodar_clustering
            </code>{" "}
            para calcular os clusters K-Means com dados reais da BRAPI.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <div className={cn(cardBase)}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <Cpu className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                Algoritmo K-Means · k = 4 clusters
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Método do cotovelo + Silhouette Score para validação
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4 text-sm">
            {[
              { label: "Features", value: "5 indicadores" },
              { label: "Padronização", value: "StandardScaler" },
              { label: "Clusters", value: "k = 4" },
              { label: "Amostra", value: "Top 50 FIIs" },
              { label: "Frequência", value: "Manual" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-gray-400 dark:text-gray-500">{label}</p>
                <p className="font-medium text-gray-900 dark:text-gray-50">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        Clusters esperados (pré-visualização heurística)
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CLUSTERS_PLACEHOLDER.map((cluster) => (
          <div
            key={cluster.nome}
            className={cn(
              "relative w-full rounded-lg border p-6 shadow-sm transition-shadow hover:shadow-md",
              cluster.cor
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("size-2 rounded-full", cluster.dotCor)} />
                  <p className="font-semibold text-gray-900 dark:text-gray-50">
                    {cluster.nome}
                  </p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Perfil {cluster.perfil}
                </span>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono border border-current/20 px-2 py-0.5 rounded-full">
                Estimado
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              {cluster.descricao}
            </p>
            <ul className="space-y-1">
              {cluster.caracteristicas.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
                >
                  <span className={cn("size-1 rounded-full shrink-0", cluster.dotCor)} />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
