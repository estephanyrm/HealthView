import os
from datetime import timedelta
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()

def _database_uri() -> str:
    user = os.getenv("DB_USER", "root")
    password = quote_plus(os.getenv("DB_PASSWORD", ""))  # escapa caracteres especiales
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "3306")
    name = os.getenv("DB_NAME", "hospitalizacion_db")
    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}?charset=utf8mb4"


# Orígenes por defecto (Live Server de VS Code, XAMPP, etc.) cuando CORS_ORIGINS no está en .env
_ORIGENES_POR_DEFECTO = [
    "http://127.0.0.1:5500", "http://localhost:5500",
    "http://127.0.0.1:5501", "http://localhost:5501",
    "http://127.0.0.1:8000", "http://localhost:8000",
    "http://127.0.0.1:8080", "http://localhost:8080",
    "http://localhost", "http://127.0.0.1",
]


def _origenes_cors() -> list:
    lista = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
    return lista or _ORIGENES_POR_DEFECTO


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
    SQLALCHEMY_DATABASE_URI = _database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = _origenes_cors()
    MAX_PER_PAGE = 100

    # JWT: clave propia para firmar tokens (si no existe, usa SECRET_KEY) y duración del token
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=float(os.getenv("JWT_EXPIRA_HORAS", "8")))


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "clave-solo-para-pruebas-0123456789-abcdef"
