from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import TypedDict

from sqlalchemy.orm import Session

from app.models.posicao import Posicao
from app.repositories.fundo_repository import FundoRepository
from app.repositories.posicao_repository import PosicaoRepository


class ResumoCarteira(TypedDict):
    """Resultado consolidado da carteira do usuário."""

    total_investido: Decimal
    por_classe: dict[str, Decimal]
    num_posicoes: int


_CENTAVO = Decimal("0.01")


class TickerNaoEncontrado(Exception):
    """Ticker informado não existe no catálogo de fundos."""


def _arredondar(valor: Decimal) -> Decimal:
    return valor.quantize(_CENTAVO, rounding=ROUND_HALF_UP)


def registrar_aporte(db: Session, usuario_id: int, ticker: str, quantidade: int, preco: Decimal) -> Posicao:
    """Registra um aporte: cria a posição ou recalcula o preço médio ponderado.

    Args:
        db: Sessão SQLAlchemy.
        usuario_id: ID do usuário autenticado.
        ticker: Ticker do fundo (ex.: "HGLG11").
        quantidade: Número de cotas adquiridas.
        preco: Preço unitário pago por cota.

    Returns:
        Posicao atualizada ou recém-criada.

    Raises:
        TickerNaoEncontrado: Se o ticker não existir no catálogo de fundos.
    """
    fundo = FundoRepository(db).buscar_por_ticker(ticker)
    if fundo is None:
        raise TickerNaoEncontrado(ticker)

    repo = PosicaoRepository(db)
    posicao = repo.buscar_por_usuario_e_fundo(usuario_id, fundo.id)
    aporte_valor = _arredondar(Decimal(quantidade) * preco)

    if posicao is None:
        return repo.criar(
            usuario_id=usuario_id,
            fundo_id=fundo.id,
            quantidade=quantidade,
            preco_medio=_arredondar(preco),
            valor_investido=aporte_valor,
        )

    nova_qtd = posicao.quantidade + quantidade
    novo_valor = _arredondar(posicao.valor_investido + aporte_valor)
    posicao.quantidade = nova_qtd
    posicao.valor_investido = novo_valor
    posicao.preco_medio = _arredondar(novo_valor / Decimal(nova_qtd))
    return repo.salvar(posicao)


def resumo_carteira(db: Session, usuario_id: int) -> ResumoCarteira:
    """Posição consolidada: total investido + quebra por classe (RF-04/08)."""
    posicoes = PosicaoRepository(db).listar_por_usuario(usuario_id)
    por_classe: dict[str, Decimal] = {"FII": Decimal("0.00"), "FIAGRO": Decimal("0.00")}
    total = Decimal("0.00")
    for p in posicoes:
        total += p.valor_investido
        classe = p.fundo.classe if p.fundo.classe in por_classe else "FII"
        por_classe[classe] += p.valor_investido
    return {
        "total_investido": total,
        "por_classe": por_classe,
        "num_posicoes": len(posicoes),
    }
