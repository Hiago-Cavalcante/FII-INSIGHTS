from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup, Tag


class StatusInvestParser:
    """Extrai indicadores financeiros de FII da página do Status Invest."""

    def extrair(self, html: str) -> dict[str, Any]:
        soup = BeautifulSoup(html, "lxml")
        return {
            "dy_atual": self._extrair_dy_atual(soup),
            "dy_12m": self._extrair_dy_12m(soup),
            "p_vp": self._extrair_p_vp(soup),
            "vacancia_fisica": self._extrair_vacancia_fisica(soup),
            "vacancia_financeira": self._extrair_vacancia_financeira(soup),
            "liquidez_diaria": self._extrair_liquidez(soup),
            "volatilidade_12m": None,
            "patrimonio_liquido": self._extrair_patrimonio(soup),
            "num_cotistas": self._extrair_cotistas(soup),
        }

    def _h3_por_label(self, soup: BeautifulSoup, label: str) -> Tag | None:
        for h3 in soup.find_all("h3"):
            if re.search(label, h3.get_text(), re.IGNORECASE):
                return h3
        return None

    def _strong_apos_h3(self, soup: BeautifulSoup, label: str) -> str | None:
        h3 = self._h3_por_label(soup, label)
        if not h3:
            return None
        strong = h3.find_next("strong")
        return strong.get_text(strip=True) if isinstance(strong, Tag) else None

    def _p_apos_h3(self, soup: BeautifulSoup, label: str) -> str | None:
        h3 = self._h3_por_label(soup, label)
        if not h3:
            return None
        p = h3.find_next("p")
        if isinstance(p, Tag):
            return p.get_text(strip=True).replace("R$", "").strip()
        return None

    def _strong_apos_span(self, soup: BeautifulSoup, label: str) -> str | None:
        for node in soup.find_all(string=re.compile(label, re.IGNORECASE)):
            parent = node.parent
            if not isinstance(parent, Tag):
                continue
            strong = parent.find_next("strong")
            if isinstance(strong, Tag):
                return strong.get_text(strip=True).replace("%", "").strip()
        return None

    def _valor_por_label_span(self, soup: BeautifulSoup, label: str) -> str | None:
        """Encontra strong[class=value] dentro do div container do span com o label.

        Estrutura real do Status Invest:
          <div>  ← container
            <span class="sub-value ...">
              <span class="d-lg-none">Label aqui</span>
            </span>
            <div><strong class="value">4.763.941,38</strong></div>
          </div>
        """
        for node in soup.find_all(string=re.compile(label, re.IGNORECASE)):
            tag: Tag | None = node.parent
            # Sobe até encontrar o primeiro div ancestral (o container)
            while isinstance(tag, Tag) and tag.name != "div":
                tag = tag.parent
            if not isinstance(tag, Tag):
                continue
            strong = tag.find("strong", class_="value")
            if isinstance(strong, Tag):
                texto = strong.get_text(strip=True)
                if texto:
                    return texto
        return None

    @staticmethod
    def _br_float(texto: str | None) -> float | None:
        if not texto:
            return None
        try:
            return float(texto.replace(".", "").replace(",", ".").strip())
        except ValueError:
            return None

    @staticmethod
    def _br_pct(texto: str | None) -> float | None:
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

    def _extrair_p_vp(self, soup: BeautifulSoup) -> float | None:
        return self._br_float(self._strong_apos_h3(soup, r"^P/VP$"))

    def _extrair_dy_12m(self, soup: BeautifulSoup) -> float | None:
        return self._br_pct(self._strong_apos_h3(soup, r"Dividend Yield"))

    def _extrair_dy_atual(self, soup: BeautifulSoup) -> float | None:
        for label in [r"Último DY", r"DY Atual", r"Último Rendimento"]:
            valor = self._strong_apos_h3(soup, label)
            if valor:
                return self._br_pct(valor)
        return None

    def _extrair_liquidez(self, soup: BeautifulSoup) -> float | None:
        # Tenta via h3 primeiro; fallback para estrutura span.sub-value + strong.value
        valor = self._strong_apos_h3(soup, r"Liq\. méd")
        if not valor:
            valor = self._valor_por_label_span(soup, r"Liq\. méd")
        return self._br_float(valor)

    def _extrair_patrimonio(self, soup: BeautifulSoup) -> float | None:
        texto = self._p_apos_h3(soup, r"^Patrimônio$")
        if texto:
            return self._br_float(texto)
        valor = self._strong_apos_h3(soup, r"Patrimônio")
        if not valor:
            valor = self._valor_por_label_span(soup, r"Patrimônio")
        return self._br_float(valor)

    def _extrair_cotistas(self, soup: BeautifulSoup) -> int | None:
        valor = self._strong_apos_h3(soup, r"Nº de Cotistas")
        if not valor:
            valor = self._valor_por_label_span(soup, r"Cotistas")
        return self._br_int(valor)

    def _extrair_vacancia_fisica(self, soup: BeautifulSoup) -> float | None:
        return self._br_pct(self._strong_apos_span(soup, r"VACÂNCIA FÍSICA"))

    def _extrair_vacancia_financeira(self, soup: BeautifulSoup) -> float | None:
        return self._br_pct(self._strong_apos_span(soup, r"VACÂNCIA FINANCEIRA"))
