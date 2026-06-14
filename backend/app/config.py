from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/fii_insights.db"
    brapi_token: str = ""
    cors_origins: str = "http://localhost:5173"
    log_level: str = "INFO"
    auth_secret: str = "dev-insecure-secret-troque-em-producao-0123456789"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 dias
    gemini_api_key: str = ""  # Assistente IA (RF-38); vazio => assistente indisponível (503)
    gemini_model: str = "gemini-2.0-flash"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Retorna a lista de origens CORS a partir da string separada por vírgulas."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
