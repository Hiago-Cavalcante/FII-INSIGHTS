from app.repositories.fundo_repository import FundoRepository


def test_criar_fundo(db_session):
    repo = FundoRepository(db_session)
    fundo = repo.criar(ticker="XPLG11", nome="XP Log", segmento="Logística")

    assert fundo.id is not None
    assert fundo.ticker == "XPLG11"


def test_buscar_por_ticker_existente(db_session):
    repo = FundoRepository(db_session)
    repo.criar(ticker="HGLG11", nome="CSHG Logística")

    resultado = repo.buscar_por_ticker("HGLG11")

    assert resultado is not None
    assert resultado.nome == "CSHG Logística"


def test_buscar_por_ticker_inexistente(db_session):
    repo = FundoRepository(db_session)

    resultado = repo.buscar_por_ticker("XXXX99")

    assert resultado is None


def test_buscar_por_id(db_session):
    repo = FundoRepository(db_session)
    criado = repo.criar(ticker="KNRI11")

    resultado = repo.buscar_por_id(criado.id)

    assert resultado is not None
    assert resultado.ticker == "KNRI11"


def test_listar_todos_ordenado(db_session):
    repo = FundoRepository(db_session)
    for ticker in ["XPLG11", "BTLG11", "ALZR11"]:
        repo.criar(ticker=ticker)

    lista = repo.listar_todos()

    assert len(lista) == 3
    assert lista[0].ticker == "ALZR11"
    assert lista[2].ticker == "XPLG11"


def test_atualizar_fundo(db_session):
    repo = FundoRepository(db_session)
    fundo = repo.criar(ticker="VISC11")

    atualizado = repo.atualizar(fundo, nome="Vinci Shopping Centers", segmento="Shopping")

    assert atualizado.nome == "Vinci Shopping Centers"
    assert atualizado.ticker == "VISC11"


def test_criar_fundo_com_classe_fiagro(db_session):
    repo = FundoRepository(db_session)
    fundo = repo.criar(ticker="SPAF11", nome="Sparta Cred Fiagro", classe="FIAGRO")
    assert fundo.classe == "FIAGRO"


def test_criar_fundo_classe_default_fii(db_session):
    repo = FundoRepository(db_session)
    fundo = repo.criar(ticker="XPLG11")
    assert fundo.classe == "FII"
