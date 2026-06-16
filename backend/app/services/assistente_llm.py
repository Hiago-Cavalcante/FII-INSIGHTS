"""Porta de LLM do assistente (RF-38) e adapter do Google Gemini.

O LLM é consumido SOMENTE pelo backend (o frontend nunca o chama direto). A porta
`AssistenteLLM` permite trocar de provedor e usar um fake nos testes (sem rede/custo).
"""

from __future__ import annotations

import logging
import time
from typing import Protocol

import httpx

logger = logging.getLogger(__name__)

_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# Status transitórios do Gemini que valem retry: 429 (rate limit) e 503 (modelo
# sobrecarregado — o caso mais comum). 4xx permanentes (400/401/403) NÃO entram aqui.
_STATUS_TRANSITORIOS = frozenset({429, 503})


class AssistenteIndisponivel(Exception):
    """Falha ao consultar o LLM (sem chave, erro de rede ou resposta inesperada)."""


class AssistenteLLM(Protocol):
    def gerar(self, system: str, prompt: str) -> str: ...


class GeminiClient:
    """Adapter do Google Gemini (REST). Custo controlado por temperatura/tokens baixos.

    Faz retry com backoff exponencial em falhas transitórias (HTTP 429/503, timeout
    e erros de rede), conforme a política de chamadas externas do projeto. Erros
    permanentes (chave inválida, schema inesperado) falham na hora, sem retry.
    """

    def __init__(
        self,
        api_key: str,
        model: str,
        timeout: float = 30.0,
        max_tentativas: int = 3,
        backoff_base: float = 0.6,
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._timeout = timeout
        self._max_tentativas = max_tentativas
        self._backoff_base = backoff_base

    def gerar(self, system: str, prompt: str) -> str:
        if not self._api_key:
            raise AssistenteIndisponivel("GEMINI_API_KEY não configurada")
        url = _GEMINI_URL.format(model=self._model)
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048,
                # thinkingBudget=0 desliga o "thinking" dos modelos 2.5 — o assistente
                # apenas EXPLICA um score já calculado, então raciocínio interno só
                # consumiria o orçamento de tokens e devolveria resposta vazia/truncada.
                "thinkingConfig": {"thinkingBudget": 0},
            },
        }
        ultimo_erro = "esgotou as tentativas"
        for tentativa in range(self._max_tentativas):
            try:
                with httpx.Client(timeout=self._timeout) as client:
                    r = client.post(url, params={"key": self._api_key}, json=body)
                if r.status_code in _STATUS_TRANSITORIOS:
                    # Transitório (ex.: 503 "modelo sobrecarregado"): espera e tenta de novo.
                    ultimo_erro = f"HTTP {r.status_code} (transitório)"
                    logger.warning(
                        "Gemini transitório %s (tentativa %d/%d)",
                        r.status_code,
                        tentativa + 1,
                        self._max_tentativas,
                    )
                    self._aguardar(tentativa)
                    continue
                r.raise_for_status()
                data = r.json()
                texto = data["candidates"][0]["content"]["parts"][0]["text"]
                if not isinstance(texto, str):
                    raise AssistenteIndisponivel("resposta do Gemini sem texto")
                return texto
            except (httpx.TimeoutException, httpx.TransportError) as e:
                # Rede instável / timeout: também é transitório → backoff e retry.
                ultimo_erro = str(e)
                logger.warning(
                    "Gemini rede/timeout: %s (tentativa %d/%d)",
                    e,
                    tentativa + 1,
                    self._max_tentativas,
                )
                self._aguardar(tentativa)
                continue
            except (httpx.HTTPError, KeyError, IndexError, ValueError, TypeError) as e:
                # Permanente (4xx, schema inesperado): não adianta repetir.
                logger.warning("Falha no Gemini: %s", e)
                raise AssistenteIndisponivel(str(e)) from e
        raise AssistenteIndisponivel(ultimo_erro)

    def _aguardar(self, tentativa: int) -> None:
        """Backoff exponencial entre tentativas (pulado após a última)."""
        if self._backoff_base > 0 and tentativa < self._max_tentativas - 1:
            time.sleep(self._backoff_base * (2**tentativa))


class FakeLLM:
    """LLM falso para testes: devolve uma resposta fixa e registra a última chamada."""

    def __init__(self, resposta: str = "RESPOSTA_FAKE") -> None:
        self.resposta = resposta
        self.ultimo_system = ""
        self.ultimo_prompt = ""

    def gerar(self, system: str, prompt: str) -> str:
        self.ultimo_system = system
        self.ultimo_prompt = prompt
        return self.resposta
