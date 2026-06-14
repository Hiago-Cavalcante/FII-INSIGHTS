"""Porta de LLM do assistente (RF-38) e adapter do Google Gemini.

O LLM é consumido SOMENTE pelo backend (o frontend nunca o chama direto). A porta
`AssistenteLLM` permite trocar de provedor e usar um fake nos testes (sem rede/custo).
"""

from __future__ import annotations

import logging
from typing import Protocol

import httpx

logger = logging.getLogger(__name__)

_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class AssistenteIndisponivel(Exception):
    """Falha ao consultar o LLM (sem chave, erro de rede ou resposta inesperada)."""


class AssistenteLLM(Protocol):
    def gerar(self, system: str, prompt: str) -> str: ...


class GeminiClient:
    """Adapter do Google Gemini (REST). Custo controlado por temperatura/tokens baixos."""

    def __init__(self, api_key: str, model: str, timeout: float = 30.0) -> None:
        self._api_key = api_key
        self._model = model
        self._timeout = timeout

    def gerar(self, system: str, prompt: str) -> str:
        if not self._api_key:
            raise AssistenteIndisponivel("GEMINI_API_KEY não configurada")
        url = _GEMINI_URL.format(model=self._model)
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 800},
        }
        try:
            with httpx.Client(timeout=self._timeout) as client:
                r = client.post(url, params={"key": self._api_key}, json=body)
                r.raise_for_status()
                data = r.json()
            texto = data["candidates"][0]["content"]["parts"][0]["text"]
            if not isinstance(texto, str):
                raise AssistenteIndisponivel("resposta do Gemini sem texto")
            return texto
        except (httpx.HTTPError, KeyError, IndexError, ValueError, TypeError) as e:
            logger.warning("Falha no Gemini: %s", e)
            raise AssistenteIndisponivel(str(e)) from e


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
