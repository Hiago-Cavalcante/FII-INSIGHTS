from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.fundo import Fundo


class Cluster(Base):
    __tablename__ = "clusters"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome_interpretado: Mapped[str] = mapped_column(String(100), nullable=False)
    perfil_risco: Mapped[str] = mapped_column(String(20), nullable=False)
    descricao: Mapped[str | None] = mapped_column(String(500))
    dy_medio: Mapped[float | None] = mapped_column(Float)
    volatilidade_media: Mapped[float | None] = mapped_column(Float)
    p_vp_medio: Mapped[float | None] = mapped_column(Float)
    num_fiis: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    fundo_clusters: Mapped[list[FundoCluster]] = relationship(
        back_populates="cluster", cascade="all, delete-orphan"
    )


class FundoCluster(Base):
    __tablename__ = "fundo_clusters"

    fundo_id: Mapped[int] = mapped_column(ForeignKey("fundos.id"), primary_key=True)
    cluster_id: Mapped[int] = mapped_column(ForeignKey("clusters.id"), primary_key=True)
    data_atribuicao: Mapped[date] = mapped_column(Date, nullable=False)

    fundo: Mapped[Fundo] = relationship(back_populates="fundo_clusters")
    cluster: Mapped[Cluster] = relationship(back_populates="fundo_clusters")
