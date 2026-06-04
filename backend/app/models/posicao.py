from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.fundo import Fundo
    from app.models.usuario import Usuario


class Posicao(Base):
    __tablename__ = "posicoes"
    __table_args__ = (UniqueConstraint("usuario_id", "fundo_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False, index=True)
    fundo_id: Mapped[int] = mapped_column(ForeignKey("fundos.id"), nullable=False)
    quantidade: Mapped[int] = mapped_column(Integer, nullable=False)
    preco_medio: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    valor_investido: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    usuario: Mapped[Usuario] = relationship(back_populates="posicoes")
    fundo: Mapped[Fundo] = relationship()
