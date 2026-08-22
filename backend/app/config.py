from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    demo_mode: str = "cached"
    data_dir: Path = Path("../data")
    confidence_threshold: float = 0.60
    panel_emission_floor_ms: int = 400
    allowed_origins: str = "http://localhost:5173"

    azure_client_id: str | None = None
    storage_account_url: str | None = None
    storage_container: str = "claim-documents"
    cosmos_endpoint: str | None = None
    cosmos_database: str = "claimpilot"
    cosmos_container: str = "audit"
    content_safety_endpoint: str | None = None
    vision_endpoint: str | None = None
    document_intelligence_endpoint: str | None = None
    language_endpoint: str | None = None
    translator_endpoint: str | None = None
    translator_region: str | None = None
    search_endpoint: str | None = None
    search_index: str = "claimpilot-policy"
    foundry_endpoint: str | None = None
    foundry_chat_deployment: str | None = None
    key_vault_url: str | None = None
    applicationinsights_connection_string: str | None = None

    @property
    def is_local(self) -> bool:
        return self.environment.lower() in {"development", "local", "test"}

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
