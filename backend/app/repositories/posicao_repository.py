from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.posicao import Posicao


class PosicaoRepository:
    """Repositório de posições de carteira, escopado por usuário."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def criar(
        self,
        usuario_id: int,
        fundo_id: int,
        quantidade: int,
        preco_medio: Decimal,
        valor_investido: Decimal,
    ) -> Posicao:
        """Cria e persiste uma nova posição."""
        posicao = Posicao(
            usuario_id=usuario_id,
            fundo_id=fundo_id,
            quantidade=quantidade,
            preco_medio=preco_medio,
            valor_investido=valor_investido,
        )
        self.db.add(posicao)
        self.db.commit()
        self.db.refresh(posicao)
        return posicao

    def listar_por_usuario(self, usuario_id: int) -> list[Posicao]:
        """Retorna todas as posições de um usuário, ordenadas por id."""
        stmt = (
            select(Posicao)
            .where(Posicao.usuario_id == usuario_id)
            .order_by(Posicao.id)
        )
        return list(self.db.scalars(stmt))

    def buscar(self, id: int, usuario_id: int) -> Posicao | None:
        """Busca uma posição pelo id, garantindo que pertence ao usuário."""
        stmt = select(Posicao).where(
            Posicao.id == id, Posicao.usuario_id == usuario_id
        )
        return self.db.scalar(stmt)

    def buscar_por_usuario_e_fundo(
        self, usuario_id: int, fundo_id: int
    ) -> Posicao | None:
        """Busca a posição de um usuário em um fundo específico."""
        stmt = select(Posicao).where(
            Posicao.usuario_id == usuario_id, Posicao.fundo_id == fundo_id
        )
        return self.db.scalar(stmt)

    def salvar(self, posicao: Posicao) -> Posicao:
        """Persiste alterações em uma posição existente."""
        self.db.commit()
        self.db.refresh(posicao)
        return posicao

    def remover(self, posicao: Posicao) -> None:
        """Remove uma posição do banco."""
        self.db.delete(posicao)
        self.db.commit()
