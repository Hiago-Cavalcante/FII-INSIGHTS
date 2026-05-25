from datetime import date

from app.models.fundo import Fundo
from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository


def _fundo(db_session, ticker: str) -> Fundo:
    repo = FundoRepository(db_session)
    return repo.criar(ticker=ticker)


def test_criar_indicador(db_session):
    fundo = _fundo(db_session, "MXRF11")
    repo = IndicadorRepository(db_session)

    ind = repo.criar(
        fundo_id=fundo.id,
        data_referencia=date(2026, 5, 1),
        dy_atual=0.12,
        liquidez_diaria=8_000_000.0,
    )

    assert ind.id is not None
    assert ind.fundo_id == fundo.id
    assert ind.dy_atual == 0.12


def test_buscar_mais_recente_por_fundo(db_session):
    fundo = _fundo(db_session, "HGLG11")
    repo = IndicadorRepository(db_session)

    for mes in [3, 4, 5]:
        repo.criar(
            fundo_id=fundo.id,
            data_referencia=date(2026, mes, 1),
            dy_atual=mes * 0.01,
        )

    recente = repo.buscar_mais_recente(fundo.id)

    assert recente is not None
    assert recente.data_referencia == date(2026, 5, 1)
    assert recente.dy_atual == 0.05


def test_buscar_mais_recente_sem_indicador(db_session):
    fundo = _fundo(db_session, "BTLG11")
    repo = IndicadorRepository(db_session)

    resultado = repo.buscar_mais_recente(fundo.id)

    assert resultado is None


def test_listar_por_fundo(db_session):
    fundo = _fundo(db_session, "BRCO11")
    repo = IndicadorRepository(db_session)

    for mes in [1, 2, 3]:
        repo.criar(fundo_id=fundo.id, data_referencia=date(2026, mes, 1))

    lista = repo.listar_por_fundo(fundo.id)

    assert len(lista) == 3


def test_buscar_todos_mais_recentes(db_session):
    f1 = _fundo(db_session, "XPLG11")
    f2 = _fundo(db_session, "LVBI11")
    repo = IndicadorRepository(db_session)

    repo.criar(fundo_id=f1.id, data_referencia=date(2026, 4, 1), dy_atual=0.10)
    repo.criar(fundo_id=f1.id, data_referencia=date(2026, 5, 1), dy_atual=0.11)
    repo.criar(fundo_id=f2.id, data_referencia=date(2026, 5, 1), dy_atual=0.09)

    recentes = repo.buscar_todos_mais_recentes()

    assert len(recentes) == 2
    tickers = {r.fundo.ticker for r in recentes}
    assert tickers == {"XPLG11", "LVBI11"}
