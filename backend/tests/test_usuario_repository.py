from app.repositories.usuario_repository import UsuarioRepository


def test_criar_e_buscar_por_email(db_session):
    repo = UsuarioRepository(db_session)
    repo.criar(email="a@b.com", senha_hash="h")

    u = repo.buscar_por_email("a@b.com")
    assert u is not None
    assert u.email == "a@b.com"


def test_buscar_por_email_inexistente(db_session):
    repo = UsuarioRepository(db_session)
    assert repo.buscar_por_email("nao@existe.com") is None


def test_buscar_por_id(db_session):
    repo = UsuarioRepository(db_session)
    criado = repo.criar(email="c@d.com", senha_hash="h")

    u = repo.buscar_por_id(criado.id)
    assert u is not None
    assert u.email == "c@d.com"
