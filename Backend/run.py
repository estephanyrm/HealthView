import os
import threading

from app import create_app

app = create_app()


def _precalentar_cache():
    """Calcula en segundo plano las vistas por defecto (todos los años, sin filtros) para que
    la primera visita al Panel y al Mapa no tarde ~30 s. Los resultados quedan en la caché."""
    from app.services import alerta_service, dashboard_service, mapa_service

    with app.app_context():
        for calcular in (lambda: dashboard_service.panel({}), lambda: mapa_service.panel({}),
                         lambda: alerta_service.panel_alertas({})):
            try:
                calcular()
            except Exception as e:  # el precálculo nunca debe tumbar el servidor
                app.logger.warning("Precálculo de caché falló: %s", e)


if __name__ == "__main__":
    # Con debug=True Flask arranca dos procesos (el reloader); solo precalentamos en el hijo.
    if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        threading.Thread(target=_precalentar_cache, daemon=True).start()
    app.run(debug=True, port=5000)
