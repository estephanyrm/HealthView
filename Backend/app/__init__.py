from flask import Flask

from config import Config

from .extensions import cors, db
from .routes import register_blueprints
from .utils.errors import register_error_handlers


def create_app(config_class=Config):
    """Application factory: permite crear la app con distinta configuración (p. ej. pruebas)."""
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.json.ensure_ascii = False  # tildes y ñ legibles en el JSON (Flask 3)

    db.init_app(app)
    # CORS explícito: solo los orígenes declarados en .env pueden llamar a la API
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True
    )
    
    from . import models  # noqa: F401  (registra los modelos en SQLAlchemy)

    register_blueprints(app)
    register_error_handlers(app)
    return app
