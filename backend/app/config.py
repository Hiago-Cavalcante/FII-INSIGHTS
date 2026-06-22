from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Default inseguro usado SÓ em desenvolvimento/testes. Em produção o boot é recusado
# se o auth_secret continuar vazio ou igual a este valor (ver validador abaixo).
_DEV_AUTH_SECRET = "dev-insecure-secret-troque-em-producao-0123456789"


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/fii_insights.db"
    brapi_token: str = ""
    cors_origins: str = "http://localhost:5173"
    log_level: str = "INFO"
    environment: str = "development"
    auth_secret: str = _DEV_AUTH_SECRET
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 dias
    gemini_api_key: str = ""  # Assistente IA (RF-38); vazio => assistente indisponível (503)
    # gemini-2.5-flash: modelo do free tier que de fato responde nesta conta
    # (o 2.0-flash retorna 429 com limit:0 no free tier desta chave).
    gemini_model: str = "gemini-2.5-flash"
    rate_limit_enabled: bool = True  # desligado nos testes (RATE_LIMIT_ENABLED=false)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def _exigir_auth_secret_em_producao(self) -> "Settings":
        """Recusa subir em produção com secret vazio ou igual ao default inseguro (RNF-02′).

        Sem isso, um deploy que esqueça de setar AUTH_SECRET assina JWTs com um segredo
        público conhecido — qualquer um forjaria um token válido.
        """
        if self.environment == "production" and self.auth_secret in ("", _DEV_AUTH_SECRET):
            raise ValueError(
                "AUTH_SECRET deve ser forte e único em produção. "
                'Gere com: python -c "import secrets; print(secrets.token_urlsafe(64))"'
            )
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        """Retorna a lista de origens CORS a partir da string separada por vírgulas."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
