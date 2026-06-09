from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.fundo import Fundo


class Provento(Base):
    """Provento (rendimento/amortização/JCP) pago por um fundo numa data-com."""

    __tablename__ = "proventos"
    __table_args__ = (UniqueConstraint("fundo_id", "data_com", "tipo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    fundo_id: Mapped[int] = mapped_column(ForeignKey("fundos.id"), nullable=False, index=True)
    data_com: Mapped[date] = mapped_column(Date, nullable=False)
    data_pagamento: Mapped[date | None] = mapped_column(Date)
    valor_por_cota: Mapped[Decimal] = mapped_column(Numeric(12, 6), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)

    fundo: Mapped[Fundo] = relationship(back_populates="proventos")
