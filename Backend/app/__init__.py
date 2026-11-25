from flask import Flask

from config import Config

from .extensions import cors, db, jwt
from .routes import register_blueprints
from .utils.errors import register_error_handlers


def create_app(config_class=Config):
    """Application factory: permite crear la app con distinta configuración (p. ej. pruebas)."""
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.json.ensure_ascii = False  # tildes y ñ legibles en el JSON (Flask 3)

    db.init_app(app)
    jwt.init_app(app)
    # CORS explícito: solo los orígenes declarados en .env pueden llamar a la API.
    # IMPORTANTE: hay que permitir la cabecera "Authorization", que es donde viaja el JWT
    # (Bearer). Sin ella el navegador bloquea la petición "preflight" y el frontend
    # no puede conectar con la API.
    cors.init_app(
        app,
        resources={r"/api/*": {
            "origins": app.config["CORS_ORIGINS"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Disposition"],
            "max_age": 600,
        }},
        supports_credentials=True,
    )

    from . import models  # noqa: F401  (registra los modelos en SQLAlchemy)

    register_blueprints(app)
    register_error_handlers(app)
    return app
