"""Seed dos 50 FIIs mais líquidos do Brasil (dados cadastrais estáticos)."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401
from app.database import Base, SessionLocal, engine
from app.repositories.fundo_repository import FundoRepository

FUNDOS_SEED: list[dict[str, Any]] = [
    {
        "ticker": "XPLG11",
        "nome": "XP Log Fundo de Investimento Imobiliário",
        "segmento": "Logística",
        "gestora": "XP Asset Management",
    },
    {
        "ticker": "HGLG11",
        "nome": "CSHG Logística",
        "segmento": "Logística",
        "gestora": "Credit Suisse Hedging-Griffo",
    },
    {
        "ticker": "KNRI11",
        "nome": "Kinea Renda Imobiliária",
        "segmento": "Lajes Corporativas",
        "gestora": "Kinea Investimentos",
    },
    {
        "ticker": "BCFF11",
        "nome": "BTG Pactual Fundo de Fundos",
        "segmento": "Fundo de Fundos",
        "gestora": "BTG Pactual",
    },
    {
        "ticker": "MXRF11",
        "nome": "Maxi Renda",
        "segmento": "Recebíveis",
        "gestora": "XP Asset Management",
    },
    {
        "ticker": "XPML11",
        "nome": "XP Malls",
        "segmento": "Shopping",
        "gestora": "XP Asset Management",
    },
    {
        "ticker": "HGRE11",
        "nome": "CSHG Real Estate",
        "segmento": "Lajes Corporativas",
        "gestora": "Credit Suisse Hedging-Griffo",
    },
    {
        "ticker": "RBRF11",
        "nome": "RBR Alpha",
        "segmento": "Fundo de Fundos",
        "gestora": "RBR Asset Management",
    },
    {
        "ticker": "VISC11",
        "nome": "Vinci Shopping Centers",
        "segmento": "Shopping",
        "gestora": "Vinci Real Estate",
    },
    {
        "ticker": "BTLG11",
        "nome": "BTG Pactual Logística",
        "segmento": "Logística",
        "gestora": "BTG Pactual",
    },
    {
        "ticker": "CPTS11",
        "nome": "Capitânia Securities II",
        "segmento": "Recebíveis",
        "gestora": "Capitânia",
    },
    {
        "ticker": "VRTA11",
        "nome": "Fator Verita",
        "segmento": "Recebíveis",
        "gestora": "Fator Administração de Recursos",
    },
    {
        "ticker": "PVBI11",
        "nome": "VBI Prime Properties",
        "segmento": "Lajes Corporativas",
        "gestora": "VBI Real Estate",
    },
    {
        "ticker": "RBRP11",
        "nome": "RBR Properties",
        "segmento": "Lajes Corporativas",
        "gestora": "RBR Asset Management",
    },
    {
        "ticker": "ALZR11",
        "nome": "Alianza Trust Renda Imobiliária",
        "segmento": "Renda Urbana",
        "gestora": "Alianza",
    },
    {
        "ticker": "BRCO11",
        "nome": "Bresco Logística",
        "segmento": "Logística",
        "gestora": "Bresco Investimentos",
    },
    {
        "ticker": "HGBS11",
        "nome": "Hedge Brasil Shopping",
        "segmento": "Shopping",
        "gestora": "Credit Suisse Hedging-Griffo",
    },
    {
        "ticker": "MALL11",
        "nome": "Malls Brasil Plural",
        "segmento": "Shopping",
        "gestora": "Brasil Plural",
    },
    {
        "ticker": "VINO11",
        "nome": "Vinci Offices",
        "segmento": "Lajes Corporativas",
        "gestora": "Vinci Real Estate",
    },
    {
        "ticker": "HGCR11",
        "nome": "CSHG Recebíveis Imobiliários",
        "segmento": "Recebíveis",
        "gestora": "Credit Suisse Hedging-Griffo",
    },
    {
        "ticker": "KNCR11",
        "nome": "Kinea Rendimentos Imobiliários",
        "segmento": "Recebíveis",
        "gestora": "Kinea Investimentos",
    },
    {
        "ticker": "RBRY11",
        "nome": "RBR Rendimentos High Grade",
        "segmento": "Recebíveis",
        "gestora": "RBR Asset Management",
    },
    {
        "ticker": "BRCR11",
        "nome": "BTG Pactual Corporate Office",
        "segmento": "Lajes Corporativas",
        "gestora": "BTG Pactual",
    },
    {
        "ticker": "IRDM11",
        "nome": "Iridium Recebíveis Imobiliários",
        "segmento": "Recebíveis",
        "gestora": "Iridium Gestora",
    },
    {
        "ticker": "VCJR11",
        "nome": "Vectis Juros Real",
        "segmento": "Recebíveis",
        "gestora": "Vectis Gestão",
    },
    {
        "ticker": "SNFF11",
        "nome": "Suno Fundo de Fundos",
        "segmento": "Fundo de Fundos",
        "gestora": "Suno Asset",
    },
    {
        "ticker": "HGRU11",
        "nome": "CSHG Renda Urbana",
        "segmento": "Renda Urbana",
        "gestora": "Credit Suisse Hedging-Griffo",
    },
    {
        "ticker": "RBRR11",
        "nome": "RBR Rendimento High Grade",
        "segmento": "Recebíveis",
        "gestora": "RBR Asset Management",
    },
    {
        "ticker": "TGAR11",
        "nome": "TG Ativo Real",
        "segmento": "Híbrido",
        "gestora": "TG Core Asset",
    },
    {
        "ticker": "LVBI11",
        "nome": "VBI Logístico",
        "segmento": "Logística",
        "gestora": "VBI Real Estate",
    },
    {
        "ticker": "TRXF11",
        "nome": "TRX Real Estate",
        "segmento": "Renda Urbana",
        "gestora": "TRX Gestora",
    },
    {
        "ticker": "AFHI11",
        "nome": "AF Invest CRI",
        "segmento": "Recebíveis",
        "gestora": "AF Invest",
    },
    {
        "ticker": "RBVA11",
        "nome": "Rio Bravo Renda Varejo",
        "segmento": "Renda Urbana",
        "gestora": "Rio Bravo",
    },
    {
        "ticker": "HSML11",
        "nome": "HSI Malls",
        "segmento": "Shopping",
        "gestora": "Hemisfério Sul Investimentos",
    },
    {
        "ticker": "XPCI11",
        "nome": "XP Crédito Imobiliário",
        "segmento": "Recebíveis",
        "gestora": "XP Asset Management",
    },
    {
        "ticker": "OUJP11",
        "nome": "Ourinvest JPP",
        "segmento": "Recebíveis",
        "gestora": "Ourinvest",
    },
    {
        "ticker": "MGFF11",
        "nome": "Mogno Fundo de Fundos",
        "segmento": "Fundo de Fundos",
        "gestora": "Mogno Capital",
    },
    {
        "ticker": "VGIP11",
        "nome": "Valora Imobiliário Prime",
        "segmento": "Recebíveis",
        "gestora": "Valora Gestão de Investimentos",
    },
    {
        "ticker": "RECR11",
        "nome": "REC Recebíveis Imobiliários",
        "segmento": "Recebíveis",
        "gestora": "REC Gestora",
    },
    {
        "ticker": "RZAK11",
        "nome": "Riza Aktie",
        "segmento": "Recebíveis",
        "gestora": "Riza Asset Management",
    },
    {
        "ticker": "JSRE11",
        "nome": "JS Real Estate Multigestão",
        "segmento": "Lajes Corporativas",
        "gestora": "JS Investimentos",
    },
    {
        "ticker": "GTWR11",
        "nome": "GTC Tower",
        "segmento": "Lajes Corporativas",
        "gestora": "Patria Investimentos",
    },
    {
        "ticker": "URPR11",
        "nome": "Urca Prime Renda",
        "segmento": "Recebíveis",
        "gestora": "Urca Capital Partners",
    },
    {
        "ticker": "HFOF11",
        "nome": "Hedge Fund of Funds Imobiliário",
        "segmento": "Fundo de Fundos",
        "gestora": "Hedge Investments",
    },
    {
        "ticker": "GGRC11",
        "nome": "GGR Coppenrath Invest",
        "segmento": "Logística",
        "gestora": "GGR Investimentos",
    },
    {
        "ticker": "ARRI11",
        "nome": "Áttimo Renda Imobiliária",
        "segmento": "Recebíveis",
        "gestora": "Áttimo Gestão",
    },
    {
        "ticker": "CACR11",
        "nome": "Caixa Rio Bravo CRI",
        "segmento": "Recebíveis",
        "gestora": "Rio Bravo",
    },
    {
        "ticker": "PORD11",
        "nome": "Polo Recebíveis",
        "segmento": "Recebíveis",
        "gestora": "Polo Capital",
    },
    {
        "ticker": "SPAF11",
        "nome": "Sparta Cred Fiagro",
        "segmento": "Recebíveis",
        "gestora": "Sparta Investimentos",
        "classe": "FIAGRO",
    },
    {
        "ticker": "HGFF11",
        "nome": "CSHG Fundo de Fundos",
        "segmento": "Fundo de Fundos",
        "gestora": "Credit Suisse Hedging-Griffo",
    },
    # ── FIAGROs (RF-14) — amostra de fundos do agronegócio com dados reais ──
    # Coletados via statusinvest.com.br/fiagros/<ticker> (papel/CRA), exceto RZTR11
    # (terras), que aparece no screener de FII. SPAF11 (acima) é FIAGRO ilíquido.
    {
        "ticker": "KNCA11",
        "nome": "Kinea Crédito Agro FIAGRO",
        "segmento": "Agro - Recebíveis",
        "gestora": "Kinea Investimentos",
        "classe": "FIAGRO",
    },
    {
        "ticker": "RZAG11",
        "nome": "Riza Agro FIAGRO",
        "segmento": "Agro - Recebíveis",
        "gestora": "Riza Asset Management",
        "classe": "FIAGRO",
    },
    {
        "ticker": "VGIA11",
        "nome": "Valora CRA FIAGRO",
        "segmento": "Agro - Recebíveis",
        "gestora": "Valora Gestão de Investimentos",
        "classe": "FIAGRO",
    },
    {
        "ticker": "CPTR11",
        "nome": "Capitânia Agro Strategies FIAGRO",
        "segmento": "Agro - Recebíveis",
        "gestora": "Capitânia",
        "classe": "FIAGRO",
    },
    {
        "ticker": "RURA11",
        "nome": "Itaú Asset Rural FIAGRO",
        "segmento": "Agro - Recebíveis",
        "gestora": "Itaú Asset Management",
        "classe": "FIAGRO",
    },
    {
        "ticker": "SNAG11",
        "nome": "Suno Agro FIAGRO",
        "segmento": "Agro - Recebíveis",
        "gestora": "Suno Asset",
        "classe": "FIAGRO",
    },
    {
        "ticker": "JGPX11",
        "nome": "JGP Crédito Agro FIAGRO",
        "segmento": "Agro - Recebíveis",
        "gestora": "JGP Asset Management",
        "classe": "FIAGRO",
    },
    {
        "ticker": "CRAA11",
        "nome": "Sparta FIAGRO Cadeias Agro",
        "segmento": "Agro - Recebíveis",
        "gestora": "Sparta",
        "classe": "FIAGRO",
    },
    {
        "ticker": "VCRA11",
        "nome": "Vectis Datagro Crédito Agro FIAGRO",
        "segmento": "Agro - Recebíveis",
        "gestora": "Vectis Gestão",
        "classe": "FIAGRO",
    },
    {
        "ticker": "EGAF11",
        "nome": "Ecoagro FIAGRO Cadeias Agro",
        "segmento": "Agro - Recebíveis",
        "gestora": "Ecoagro",
        "classe": "FIAGRO",
    },
    {
        "ticker": "AGRX11",
        "nome": "Exes Araguaia Agro FIAGRO",
        "segmento": "Agro - Recebíveis",
        "gestora": "Exes",
        "classe": "FIAGRO",
    },
    {
        "ticker": "RZTR11",
        "nome": "Riza Terrax FIAGRO",
        "segmento": "Agro - Terras",
        "gestora": "Riza Asset Management",
        "classe": "FIAGRO",
    },
]


def seed(session_factory: type[sessionmaker] | None = None) -> None:
    """Popula o banco com os 50 FIIs. Idempotente."""
    if session_factory is None:
        Base.metadata.create_all(bind=engine)
        session_factory = SessionLocal

    db = session_factory()
    try:
        repo = FundoRepository(db)
        criados = 0
        for dados in FUNDOS_SEED:
            if not repo.buscar_por_ticker(dados["ticker"]):
                repo.criar(**dados)
                criados += 1
        print(f"Seed: {criados} criados, {len(FUNDOS_SEED) - criados} já existiam.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
