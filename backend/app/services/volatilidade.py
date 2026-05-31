from __future__ import annotations

import numpy as np


def calcular_volatilidade_anualizada(
    precos: list[float],
    janela: int = 252,
    min_retornos: int = 2,
) -> float | None:
    """Volatilidade anualizada dos log-retornos diários (desvio amostral × √252).

    Usa as últimas ``janela``+1 cotações. Retorna ``None`` se houver poucos
    pontos válidos. Ignora preços não-positivos.
    """
    if not precos or len(precos) < min_retornos + 1:
        return None
    arr = np.asarray(precos[-(janela + 1):], dtype=float)
    arr = arr[arr > 0]
    if len(arr) < min_retornos + 1:
        return None
    log_ret = np.diff(np.log(arr))
    if len(log_ret) < min_retornos:
        return None
    return float(np.std(log_ret, ddof=1) * np.sqrt(252))
