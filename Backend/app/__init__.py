from flask import Flask, request

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
    # CORS explícito: solo los orígenes declarados en .env pueden llamar a la API
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True
    )

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin in app.config["CORS_ORIGINS"]:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Vary"] = "Origin"
            if request.method == "OPTIONS":
                response.headers["Access-Control-Allow-Headers"] = "Content-Type"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return response
    
    from . import models  # noqa: F401  (registra los modelos en SQLAlchemy)

    register_blueprints(app)
    register_error_handlers(app)
    return app
