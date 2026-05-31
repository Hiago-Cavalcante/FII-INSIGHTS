from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup, Tag

from app.utils.parsers.status_invest_json import calcular_dy_atual


class StatusInvestParser:
    """Extrai indicadores da PÁGINA HTML do FII no Status Invest.

    Fonte de fallback: os fundamentais vêm normalmente do screener JSON; este
    parser cobre a vacância (sem endpoint JSON) e serve de fallback completo para
    os poucos tickers que o screener não traz.
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
            "liquidez_diaria": self._br_float(
                self._valor(soup, r"Liquidez m[ée]dia di[áa]ria")
            ),
            "num_cotistas": self._br_int(self._valor(soup, r"N[ºo°] de Cotistas")),
            "patrimonio_liquido": self._patrimonio(html),
            "dy_atual": calcular_dy_atual(ultimo, preco),
        }

    def extrair_vacancia(self, html: str) -> dict[str, Any]:
        """Vacância física/financeira (fração). Nula em FIIs de papel/FoF."""
        soup = BeautifulSoup(html, "lxml")
        return {
            "vacancia_fisica": self._vacancia(
                soup, [r"vac[âa]ncia\s+f[íi]sica", r"^vac[âa]ncia$"]
            ),
            "vacancia_financeira": self._vacancia(
                soup, [r"vac[âa]ncia\s+financeira"]
            ),
        }

    # ── helpers de busca ──────────────────────────────────────────────

    def _valor(self, soup: BeautifulSoup, label_regex: str) -> str | None:
        """Texto do primeiro <strong class="value"> após um rótulo que casa o regex."""
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

    def _vacancia(self, soup: BeautifulSoup, labels: list[str]) -> float | None:
        """Vacância do fundo como MÉDIA dos valores que parseiam para um rótulo.

        O Status Invest nem sempre expõe um agregado do fundo no HTML estático
        (mostra '-%'); quando só há vacância por imóvel, usa-se a média das
        vacâncias por imóvel como proxy (ignorando widgets sem dado, ex.: '-%').
        Limitação conhecida: média não ponderada por área/receita.
        """
        for label in labels:
            valores: list[float] = []
            for node in soup.find_all(string=re.compile(label, re.IGNORECASE)):
                parent = node.parent
                if not isinstance(parent, Tag):
                    continue
                strong = parent.find_next("strong", class_="value")
                if isinstance(strong, Tag):
                    valor = self._pct(strong.get_text(strip=True))
                    if valor is not None:
                        valores.append(valor)
            if valores:
                return sum(valores) / len(valores)
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
