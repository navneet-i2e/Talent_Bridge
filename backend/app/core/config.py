# ══════════════════════════════════════════════════════
# PATCH: backend/app/core/config.py
# Add Gmail fields to Settings class
# ══════════════════════════════════════════════════════

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/job_portal"

    # JWT
    SECRET_KEY: str = "change-this-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60   # ← Reduced to 1 hour (refresh handles the rest)

    # Groq
    GROQ_API_KEY: str = ""

    # Gmail SMTP (free)
    GMAIL_USER: str = ""              # your@gmail.com
    GMAIL_APP_PASSWORD: str = ""      # 16-char app password from Google

    # App
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = True

    # File Storage
    UPLOAD_DIR: str = "./app/uploads"
    MAX_FILE_SIZE_MB: int = 10

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()