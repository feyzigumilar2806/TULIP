# ============================================================
# KONFIGURASI UTAMA APLIKASI TULIP
# ============================================================

from functools import lru_cache

from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


# ============================================================
# MEMBACA KONFIGURASI DARI FILE .env
# ============================================================

class Settings(BaseSettings):
    """
    Seluruh konfigurasi aplikasi dibaca dari file .env
    yang berada di folder utama proyek TULIP.
    """

    app_name: str = "TULIP"
    app_env: str = "development"

    database_url: str
    secret_key: str

    access_token_expire_minutes: int = 480

    max_file_size_mb: int = 5
    upload_directory: str = "uploads"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


# ============================================================
# MENYIMPAN KONFIGURASI AGAR TIDAK DIBACA BERULANG KALI
# ============================================================

@lru_cache
def get_settings() -> Settings:
    return Settings()


# ============================================================
# KONFIGURASI YANG DIGUNAKAN OLEH SELURUH APLIKASI
# ============================================================

settings = get_settings()