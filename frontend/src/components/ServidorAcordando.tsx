import { useEffect, useState } from "react";
import { acordarServidor, classificarEstado, LIMIAR_ACORDANDO_MS } from "@/lib/health";

/**
 * Combate o cold start do backend (Render free): ao montar, dispara o warmup
 * e — se a resposta demorar além do limiar — mostra um aviso discreto no topo
 * para o delay parecer intencional em vez de quebrado. Some sozinho quando o
 * servidor responde. Renderizado na raiz do app (aparece até no login).
 */
export function ServidorAcordando() {
  const [resolvido, setResolvido] = useState(false);
  const [passouLimiar, setPassouLimiar] = useState(false);

  useEffect(() => {
    let ativo = true;
    acordarServidor().finally(() => {
      if (ativo) setResolvido(true);
    });
    const t = setTimeout(() => {
      if (ativo) setPassouLimiar(true);
    }, LIMIAR_ACORDANDO_MS);
    return () => {
      ativo = false;
      clearTimeout(t);
    };
  }, []);

  const estado = classificarEstado({
    resolvido,
    msDecorridos: passouLimiar ? LIMIAR_ACORDANDO_MS : 0,
    limiarMs: LIMIAR_ACORDANDO_MS,
  });

  if (estado !== "acordando") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-md px-4 pt-2"
    >
      <div className="rounded-xl bg-amber-400 px-3 py-2 text-center text-xs font-medium text-amber-950 shadow-lg">
        ⏳ Acordando o servidor… pode levar até ~30s (plano gratuito)
      </div>
    </div>
  );
}
