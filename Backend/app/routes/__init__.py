from .auth import bp as auth_bp
from .catalogos import bp as catalogos_bp
from .health import bp as health_bp
from .hospitalizaciones import bp as hospitalizaciones_bp


def register_blueprints(app):
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(catalogos_bp, url_prefix="/api/catalogos")
    app.register_blueprint(hospitalizaciones_bp, url_prefix="/api/hospitalizaciones")