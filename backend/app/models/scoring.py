from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.fundo import Fundo


class ScoringHistorico(Base):
    __tablename__ = "scoring_historico"

    id: Mapped[int] = mapped_column(primary_key=True)
    fundo_id: Mapped[int] = mapped_column(ForeignKey("fundos.id"), nullable=False, index=True)
    data_execucao: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    classificacao: Mapped[str] = mapped_column(String(20), nullable=False)
    classe_aplicada: Mapped[str] = mapped_column(String(6), nullable=False, server_default="FII", default="FII")

    fundo: Mapped[Fundo] = relationship(back_populates="scorings")
