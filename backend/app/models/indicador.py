from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.fundo import Fundo


class Indicador(Base):
    __tablename__ = "indicadores"

    id: Mapped[int] = mapped_column(primary_key=True)
    fundo_id: Mapped[int] = mapped_column(
        ForeignKey("fundos.id"), nullable=False, index=True
    )
    data_referencia: Mapped[date] = mapped_column(Date, nullable=False)

    dy_atual: Mapped[float | None] = mapped_column(Float)
    dy_12m: Mapped[float | None] = mapped_column(Float)
    p_vp: Mapped[float | None] = mapped_column(Float)
    vacancia_fisica: Mapped[float | None] = mapped_column(Float)
    vacancia_financeira: Mapped[float | None] = mapped_column(Float)
    liquidez_diaria: Mapped[float | None] = mapped_column(Float)
    volatilidade_12m: Mapped[float | None] = mapped_column(Float)
    patrimonio_liquido: Mapped[float | None] = mapped_column(Float)
    num_cotistas: Mapped[int | None] = mapped_column(Integer)

    fundo: Mapped[Fundo] = relationship(back_populates="indicadores")
