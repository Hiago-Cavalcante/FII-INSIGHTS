from decimal import Decimal

from app.models.fundo import Fundo
from app.models.usuario import Usuario
from app.repositories.posicao_repository import PosicaoRepository


def _usuario_e_fundo(db, email="a@b.com", ticker="HGLG11"):
    u = Usuario(email=email, senha_hash="h")
    f = Fundo(ticker=ticker)
    db.add_all([u, f])
    db.commit()
    return u, f


def test_criar_e_listar_por_usuario(db_session):
    u, f = _usuario_e_fundo(db_session)
    repo = PosicaoRepository(db_session)
    repo.criar(usuario_id=u.id, fundo_id=f.id, quantidade=10,
               preco_medio=Decimal("100.00"), valor_investido=Decimal("1000.00"))

    lista = repo.listar_por_usuario(u.id)
    assert len(lista) == 1
    assert lista[0].quantidade == 10


def test_buscar_filtra_por_usuario(db_session):
    u, f = _usuario_e_fundo(db_session)
    outro = Usuario(email="outro@b.com", senha_hash="h")
    db_session.add(outro)
    db_session.commit()
    repo = PosicaoRepository(db_session)
    p = repo.criar(usuario_id=u.id, fundo_id=f.id, quantidade=1,
                   preco_medio=Decimal("10.00"), valor_investido=Decimal("10.00"))

    assert repo.buscar(p.id, u.id) is not None
    assert repo.buscar(p.id, outro.id) is None


def test_buscar_por_usuario_e_fundo(db_session):
    u, f = _usuario_e_fundo(db_session)
    repo = PosicaoRepository(db_session)
    repo.criar(usuario_id=u.id, fundo_id=f.id, quantidade=1,
               preco_medio=Decimal("10.00"), valor_investido=Decimal("10.00"))

    assert repo.buscar_por_usuario_e_fundo(u.id, f.id) is not None
    assert repo.buscar_por_usuario_e_fundo(u.id, 9999) is None
