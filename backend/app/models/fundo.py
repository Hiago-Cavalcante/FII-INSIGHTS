from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.cluster import FundoCluster
    from app.models.indicador import Indicador
    from app.models.scoring import ScoringHistorico


class Fundo(Base):
    __tablename__ = "fundos"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(
        String(10), unique=True, nullable=False, index=True
    )
    nome: Mapped[str | None] = mapped_column(String(200))
    segmento: Mapped[str | None] = mapped_column(String(100))
    gestora: Mapped[str | None] = mapped_column(String(200))
    data_ipo: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    indicadores: Mapped[list[Indicador]] = relationship(
        back_populates="fundo", cascade="all, delete-orphan"
    )
    scorings: Mapped[list[ScoringHistorico]] = relationship(
        back_populates="fundo", cascade="all, delete-orphan"
    )
    fundo_clusters: Mapped[list[FundoCluster]] = relationship(
        back_populates="fundo", cascade="all, delete-orphan"
    )
