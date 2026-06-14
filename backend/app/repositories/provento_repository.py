from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.provento import Provento


class ProventoRepository:
    """Repositório de proventos por fundo (dado de catálogo)."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def upsert(
        self,
        fundo_id: int,
        data_com: date,
        tipo: str,
        data_pagamento: date | None,
        valor_por_cota: Decimal,
    ) -> Provento:
        """Insere ou atualiza pela chave (fundo_id, data_com, tipo) — idempotente."""
        stmt = select(Provento).where(
            Provento.fundo_id == fundo_id,
            Provento.data_com == data_com,
            Provento.tipo == tipo,
        )
        provento = self.db.scalar(stmt)
        if provento is None:
            provento = Provento(
                fundo_id=fundo_id,
                data_com=data_com,
                tipo=tipo,
                data_pagamento=data_pagamento,
                valor_por_cota=valor_por_cota,
            )
            self.db.add(provento)
        else:
            provento.data_pagamento = data_pagamento
            provento.valor_por_cota = valor_por_cota
        self.db.commit()
        self.db.refresh(provento)
        return provento

    def listar_por_fundo(self, fundo_id: int) -> list[Provento]:
        """Proventos de um fundo, mais recentes primeiro."""
        stmt = select(Provento).where(Provento.fundo_id == fundo_id).order_by(Provento.data_com.desc())
        return list(self.db.scalars(stmt))

    def valores_rendimentos_pagos(self, fundo_id: int, inicio: date, fim: date) -> list[Decimal]:
        """valor_por_cota dos rendimentos PAGOS no período [inicio, fim] (por data_pagamento).

        Janela ancorada na data_pagamento (não data_com): reflete a renda efetivamente
        PAGA no período. Proventos declarados mas ainda não pagos (data_pagamento nula ou
        futura) ficam de fora. Fonte única usada pela projeção de dividendos (média) e pelo
        preço-teto Bazin (soma).
        """
        stmt = select(Provento.valor_por_cota).where(
            Provento.fundo_id == fundo_id,
            Provento.tipo == "rendimento",
            Provento.data_pagamento.is_not(None),
            Provento.data_pagamento >= inicio,
            Provento.data_pagamento <= fim,
        )
        return list(self.db.scalars(stmt))
