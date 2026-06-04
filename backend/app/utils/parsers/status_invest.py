from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup, Tag

from app.utils.parsers.status_invest_json import calcular_dy_atual


class StatusInvestParser:
    """Extrai indicadores fundamentais da PÁGINA HTML do FII (fallback do screener).

    **Vacância não é extraída.** O Status Invest não expõe um agregado confiável do
    fundo no HTML estático (o widget agregado mostra '-%') e os valores por imóvel
    são inconsistentes entre fundos (vacância real em uns, ocupação/ruído em outros —
    ex.: HSML11 lista "VACÂNCIA 91–98%" por loja). Tratada como limitação de dado /
    trabalho futuro (ver docs da Sprint 04). vacancia_fisica/financeira ficam nulas e
    o scoring redistribui o peso da dimensão Risco.
    """

    def extrair_fundamentais(self, html: str) -> dict[str, Any]:
        """dy_12m, p_vp, liquidez, cotistas, patrimônio e dy_atual da página."""
        soup = BeautifulSoup(html, "lxml")
        # Assume o layout atual do SI: o 1º "Último rendimento"/"Valor atual" é o vigente.
        ultimo = self._br_float(self._valor(soup, r"[ÚU]ltimo rendimento"))
        preco = self._br_float(self._valor(soup, r"Valor atual"))
        return {
            "dy_12m": self._pct(self._valor(soup, r"Dividend Yield")),
            "p_vp": self._br_float(self._valor(soup, r"^P/VP$")),
            "liquidez_diaria": self._br_float(self._valor(soup, r"Liquidez m[ée]dia di[áa]ria")),
            "num_cotistas": self._br_int(self._valor(soup, r"N[ºo°] de Cotistas")),
            "patrimonio_liquido": self._patrimonio(html),
            "dy_atual": calcular_dy_atual(ultimo, preco),
        }

    # ── helpers de busca ──────────────────────────────────────────────

    def _valor(self, soup: BeautifulSoup, label_regex: str) -> str | None:
        """Texto do 1º <strong class="value"> após um rótulo que casa o regex.

        Assume o layout atual do Status Invest (a 1ª ocorrência do rótulo é a
        relevante; rótulos com tooltips/duplicatas resolvem para o card correto).
        """
        for node in soup.find_all(string=re.compile(label_regex, re.IGNORECASE)):
            parent = node.parent
            if not isinstance(parent, Tag):
                continue
            strong = parent.find_next("strong", class_="value")
            if isinstance(strong, Tag):
                texto = strong.get_text(strip=True)
                if texto:
                    return texto
        return None

    @staticmethod
    def _patrimonio(html: str) -> float | None:
        """Patrimônio líquido vem do bloco JSON-LD embutido na página."""
        m = re.search(
            r'"Patrim[ôo]nio l[íi]quido"\s*,\s*"currency"\s*:\s*"BRL"\s*,'
            r'\s*"value"\s*:\s*([0-9.]+)',
            html,
            re.IGNORECASE,
        )
        if not m:
            return None
        try:
            return float(m.group(1))
        except ValueError:
            return None

    # ── conversores de formato brasileiro ────────────────────────────

    @staticmethod
    def _br_float(texto: str | None) -> float | None:
        if not texto:
            return None
        try:
            return float(texto.replace(".", "").replace(",", ".").strip())
        except ValueError:
            return None

    @staticmethod
    def _pct(texto: str | None) -> float | None:
        """Converte '8,48' ou '0,000%' → fração (0.0848, 0.0)."""
        if not texto:
            return None
        try:
            limpo = texto.replace("%", "").replace(".", "").replace(",", ".").strip()
            return float(limpo) / 100.0
        except ValueError:
            return None

    @staticmethod
    def _br_int(texto: str | None) -> int | None:
        if not texto:
            return None
        try:
            return int(texto.replace(".", "").replace(",", "").strip())
        except ValueError:
            return None
