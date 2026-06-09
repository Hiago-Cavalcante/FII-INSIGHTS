from app.models.fundo import Fundo
from app.repositories.provento_repository import ProventoRepository
from app.services.coleta_proventos import ColetaProventosService

_PAYLOAD = {
    "assetEarningsModels": [
        {"ed": "29/05/2026", "pd": "15/06/2026", "et": "Rendimento", "v": 1.1},
        {"ed": "30/04/2026", "pd": "15/05/2026", "et": "Rendimento", "v": 1.0},
    ]
}


class _ClientFake:
    def buscar_proventos(self, ticker: str):
        return _PAYLOAD


def test_coletar_todos_persiste_proventos(db_session):
    f = Fundo(ticker="HGLG11", nome="CSHG Log", classe="FII")
    db_session.add(f)
    db_session.commit()

    res = ColetaProventosService(db_session, client=_ClientFake()).coletar_todos()

    assert res.coletados == 1
    assert res.proventos == 2
    assert res.falhas == 0
    assert len(ProventoRepository(db_session).listar_por_fundo(f.id)) == 2
