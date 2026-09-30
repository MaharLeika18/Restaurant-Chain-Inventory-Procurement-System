from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central app settings, loaded from environment variables / .env file.
    """
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/restaurant_inventory"
    app_name: str = "Restaurant Chain Inventory & Procurement API"
    debug: bool = True

    # Auth - CHANGE jwt_secret_key in your .env for anything beyond local dev.
    jwt_secret_key: str = "dev-only-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8  # 8 hours

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
