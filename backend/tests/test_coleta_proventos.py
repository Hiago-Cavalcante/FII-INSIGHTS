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


class _ClientParcial:
    """Fake client: levanta erro para um ticker, retorna payload para o outro."""

    def buscar_proventos(self, ticker: str):
        if ticker == "BOOM11":
            raise RuntimeError("erro de rede simulado")
        return {"assetEarningsModels": [
            {"ed": "29/05/2026", "pd": "15/06/2026", "et": "Rendimento", "v": 1.1},
        ]}


def test_coletar_todos_persiste_proventos(db_session):
    f = Fundo(ticker="HGLG11", nome="CSHG Log", classe="FII")
    db_session.add(f)
    db_session.commit()

    res = ColetaProventosService(db_session, client=_ClientFake()).coletar_todos()

    assert res.coletados == 1
    assert res.proventos == 2
    assert res.falhas == 0
    assert len(ProventoRepository(db_session).listar_por_fundo(f.id)) == 2


def test_coletar_todos_isola_falha_de_um_fundo(db_session):
    bom = Fundo(ticker="HGLG11", nome="CSHG Log", classe="FII")
    ruim = Fundo(ticker="BOOM11", nome="Quebra", classe="FII")
    db_session.add_all([bom, ruim])
    db_session.commit()

    res = ColetaProventosService(db_session, client=_ClientParcial()).coletar_todos()

    # o fundo bom foi coletado; o ruim virou falha; o loop não abortou
    assert res.coletados == 1
    assert res.proventos == 1
    assert res.falhas == 1
    assert any(ticker == "BOOM11" for ticker, _ in res.erros)
    assert len(ProventoRepository(db_session).listar_por_fundo(bom.id)) == 1
    assert ProventoRepository(db_session).listar_por_fundo(ruim.id) == []
