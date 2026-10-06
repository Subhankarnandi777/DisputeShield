"""Application settings loaded from environment variables."""
from decimal import Decimal
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # PayPal (sandbox only)
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_base_url: str = "https://api-m.sandbox.paypal.com"
    paypal_webhook_id: str = ""

    # AI
    anthropic_api_key: str = ""
    llm_model: str = "claude-sonnet-5-5"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # App
    database_url: str = "sqlite:///./disputeshield.db"
    simulation_mode: bool = True
    cors_origins: str = "http://localhost:3000"
    default_dispute_fee: Decimal = Decimal("20.00")
    default_effort_cost: Decimal = Decimal("5.00")
    zapier_webhook_url: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
