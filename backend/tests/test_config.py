import pytest
from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.config import _DEV_AUTH_SECRET, Settings


class SettingsNoEnvFile(BaseSettings):
    """Settings sem carregamento de .env para testes."""

    database_url: str = "sqlite:///./data/fii_insights.db"
    brapi_token: str = ""
    cors_origins: str = "http://localhost:5173"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=None,
        extra="ignore",
    )


def test_settings_defaults() -> None:
    s = Settings()
    assert "sqlite" in s.database_url
    assert s.log_level == "INFO"
    assert s.cors_origins == "http://localhost:5173"


def test_settings_brapi_token_default_vazio(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BRAPI_TOKEN", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    monkeypatch.delenv("LOG_LEVEL", raising=False)
    s = SettingsNoEnvFile()
    assert s.brapi_token == ""


def test_desenvolvimento_e_o_environment_default() -> None:
    s = Settings()
    assert s.environment == "development"


def test_producao_exige_auth_secret_definido() -> None:
    with pytest.raises(ValidationError):
        Settings(environment="production", auth_secret="")


def test_producao_rejeita_auth_secret_default_inseguro() -> None:
    with pytest.raises(ValidationError):
        Settings(environment="production", auth_secret=_DEV_AUTH_SECRET)


def test_producao_com_auth_secret_forte_sobe() -> None:
    s = Settings(environment="production", auth_secret="x" * 64)
    assert s.environment == "production"
    assert s.auth_secret == "x" * 64


def test_desenvolvimento_aceita_default_inseguro() -> None:
    s = Settings(environment="development")
    assert s.auth_secret == _DEV_AUTH_SECRET
