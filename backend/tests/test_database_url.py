from app.database import connect_args_for, normalize_database_url


def test_normalize_injeta_psycopg_em_postgres_puro():
    url = "postgresql://user:senha@host.neon.tech/db?sslmode=require"
    assert normalize_database_url(url) == ("postgresql+psycopg://user:senha@host.neon.tech/db?sslmode=require")


def test_normalize_preserva_url_que_ja_tem_driver():
    url = "postgresql+psycopg://user:senha@host/db"
    assert normalize_database_url(url) == url


def test_normalize_nao_altera_sqlite():
    url = "sqlite:///./data/fii_insights.db"
    assert normalize_database_url(url) == url


def test_connect_args_sqlite_tem_check_same_thread():
    assert connect_args_for("sqlite:///x.db") == {"check_same_thread": False}


def test_connect_args_postgres_e_vazio():
    assert connect_args_for("postgresql+psycopg://u:p@h/d") == {}
