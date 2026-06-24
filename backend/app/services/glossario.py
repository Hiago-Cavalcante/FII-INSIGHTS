"""Conhecimento estruturado de FIIs para o grounding do assistente (RF-42/RF-38).

Espelha/expande o glossário do front (frontend/src/lib/glossario.ts). Duplicação
TS↔PY aceita: o do front alimenta os tooltips "?"; este alimenta o LLM.
"""

from __future__ import annotations

# termo -> definição em linguagem simples (iniciante)
GLOSSARIO: dict[str, str] = {
    "dy_atual": "Dividend Yield (DY): quanto o fundo paga de rendimento por ano em relação ao "
    "preço da cota. Quanto maior, mais renda — mas DY muito alto pode indicar risco.",
    "dy_12m": "DY 12 meses: a média do rendimento pago nos últimos 12 meses. Mostra a "
    "consistência dos pagamentos.",
    "p_vp": "P/VP: compara o preço da cota com o valor patrimonial. Abaixo de 1 significa que "
    "está 'mais barato' que o patrimônio.",
    "vacancia_fisica": "Vacância física: percentual dos imóveis do fundo que estão desocupados. "
    "Quanto menor, melhor.",
    "vacancia_financeira": "Vacância financeira: percentual da receita de aluguéis que o fundo "
    "deixa de receber por inadimplência ou desocupação.",
    "liquidez_diaria": "Liquidez diária: quanto é negociado por dia. Alta liquidez facilita "
    "comprar e vender sem afetar muito o preço.",
    "volatilidade_12m": "Volatilidade 12M: o quanto o preço da cota oscila. Menor volatilidade "
    "costuma significar menos sustos.",
    "patrimonio_liquido": "Patrimônio líquido: o tamanho do fundo. Fundos maiores tendem a ser "
    "mais estáveis.",
    "num_cotistas": "Número de cotistas: quantas pessoas investem no fundo. Mais cotistas "
    "costuma indicar mais liquidez e pulverização.",
    "duration": "Duration: prazo médio dos recebíveis de um FIAGRO/FII de papel. Duration maior "
    "é mais sensível a juros.",
    "fii": "FII (Fundo de Investimento Imobiliário): fundo que investe em imóveis ou títulos "
    "imobiliários e distribui os rendimentos aos cotistas.",
    "fiagro": "FIAGRO: fundo do agronegócio; muitos são de 'papel' (recebíveis), sem imóveis — "
    "por isso não têm vacância, e o risco gira em torno de crédito e indexador.",
    "segmento": "Segmento: o tipo de imóvel/atuação do fundo (logística, shoppings, recebíveis, "
    "etc.). Ajuda a diversificar.",
}

BLURB_PLATAFORMA: str = (
    "O FII Insights analisa FIIs e FIAGROs com um scoring multicritério (nota 0-100 a partir de "
    "rentabilidade, valuation, risco e estrutura, com pesos por perfil do investidor), agrupa "
    "fundos parecidos com clustering K-Means, e ajuda a acompanhar carteira, dividendos e "
    "recomendações (preço-teto e rebalanceamento). O assistente apenas EXPLICA esses dados já "
    "calculados — não dá recomendação de compra ou venda."
)


def texto_glossario() -> str:
    """Glossário formatado como bloco de contexto para o LLM."""
    return "Glossário de termos:\n" + "\n".join(f"- {d}" for d in GLOSSARIO.values())
