"""Configuration settings for PromisePay API."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    web_origin: str = "http://localhost:3000"
    api_base_url: str = "http://localhost:8000"
    log_level: str = "INFO"

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "promise-evidence"

    # PayPal
    paypal_env: str = "sandbox"
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_webhook_id: str = ""
    paypal_api_base: str = "https://api-m.sandbox.paypal.com"

    # AI Provider
    ai_provider: str = "google"
    ai_api_key: str = ""
    ai_model: str = "gemini-1.5-pro"

    # Security
    session_secret: str = "default-dev-secret-change-in-prod"
    evidence_max_upload_bytes: int = 10485760
    allowed_evidence_hosts: str = "github.com,gitlab.com"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
