from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fundo import Fundo


class FundoRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def criar(
        self,
        ticker: str,
        nome: str | None = None,
        segmento: str | None = None,
        gestora: str | None = None,
        data_ipo: object = None,
        classe: str = "FII",
    ) -> Fundo:
        fundo = Fundo(
            ticker=ticker,
            nome=nome,
            segmento=segmento,
            gestora=gestora,
            data_ipo=data_ipo,
            classe=classe,
        )
        self.db.add(fundo)
        self.db.commit()
        self.db.refresh(fundo)
        return fundo

    def buscar_por_ticker(self, ticker: str) -> Fundo | None:
        stmt = select(Fundo).where(Fundo.ticker == ticker)
        return self.db.scalar(stmt)

    def buscar_por_id(self, id: int) -> Fundo | None:
        return self.db.get(Fundo, id)

    def listar_todos(self) -> list[Fundo]:
        stmt = select(Fundo).order_by(Fundo.ticker)
        return list(self.db.scalars(stmt))

    def atualizar(self, fundo: Fundo, **campos: object) -> Fundo:
        for campo, valor in campos.items():
            setattr(fundo, campo, valor)
        self.db.commit()
        self.db.refresh(fundo)
        return fundo
