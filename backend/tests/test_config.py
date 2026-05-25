import pytest
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.config import Settings


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
