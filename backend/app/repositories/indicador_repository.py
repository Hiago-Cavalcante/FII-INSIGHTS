from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.fundo import Fundo
from app.models.indicador import Indicador


class IndicadorRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def criar(self, fundo_id: int, data_referencia: date, **campos: object) -> Indicador:
        ind = Indicador(fundo_id=fundo_id, data_referencia=data_referencia, **campos)
        self.db.add(ind)
        self.db.commit()
        self.db.refresh(ind)
        return ind

    def buscar_mais_recente(self, fundo_id: int) -> Indicador | None:
        stmt = (
            select(Indicador).where(Indicador.fundo_id == fundo_id).order_by(Indicador.data_referencia.desc()).limit(1)
        )
        return self.db.scalar(stmt)

    def listar_por_fundo(self, fundo_id: int) -> list[Indicador]:
        stmt = select(Indicador).where(Indicador.fundo_id == fundo_id).order_by(Indicador.data_referencia.desc())
        return list(self.db.scalars(stmt))

    def upsert(self, fundo_id: int, data_referencia: date, **campos: object) -> Indicador:
        """Atualiza indicador existente ou cria novo para (fundo_id, data_referencia)."""
        stmt = select(Indicador).where(
            Indicador.fundo_id == fundo_id,
            Indicador.data_referencia == data_referencia,
        )
        ind = self.db.scalar(stmt)
        if ind is None:
            ind = Indicador(fundo_id=fundo_id, data_referencia=data_referencia)
            self.db.add(ind)
        for campo, valor in campos.items():
            setattr(ind, campo, valor)
        self.db.commit()
        self.db.refresh(ind)
        return ind

    def listar_mais_recentes_todos(self) -> list[Indicador]:
        """Alias de buscar_todos_mais_recentes."""
        return self.buscar_todos_mais_recentes()

    def buscar_todos_mais_recentes(self) -> list[Indicador]:
        """Retorna o indicador mais recente de cada fundo."""
        subq = (
            select(
                Indicador.fundo_id,
                func.max(Indicador.data_referencia).label("max_data"),
            )
            .group_by(Indicador.fundo_id)
            .subquery()
        )
        stmt = (
            select(Indicador)
            .options(joinedload(Indicador.fundo))
            .join(
                subq,
                (Indicador.fundo_id == subq.c.fundo_id) & (Indicador.data_referencia == subq.c.max_data),
            )
            .join(Fundo, Indicador.fundo_id == Fundo.id)
        )
        return list(self.db.scalars(stmt))
