from .auth import bp as auth_bp
from .catalogos import bp as catalogos_bp
from .dashboard import bp as dashboard_bp
from .health import bp as health_bp
from .hospitalizaciones import bp as hospitalizaciones_bp
from .mapa import bp as mapa_bp


def register_blueprints(app):
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(catalogos_bp, url_prefix="/api/catalogos")
    app.register_blueprint(hospitalizaciones_bp, url_prefix="/api/hospitalizaciones")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(mapa_bp, url_prefix="/api/mapa")
