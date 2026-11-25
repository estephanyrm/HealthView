"""Caché en memoria para respuestas pesadas. Los datos son históricos (2019-2022) y no cambian
mientras el servidor está encendido, así que la primera consulta calcula y las siguientes son instantáneas."""
import threading
import time
from functools import wraps

_guardado = {}
_candados = {}
_candado_global = threading.Lock()


def _candado(clave):
    with _candado_global:
        return _candados.setdefault(clave, threading.Lock())


def cacheado(segundos=6 * 3600):  # 6 h: los datos son históricos; limpiar() invalida al cambiar datos
    def decorador(f):
        # Módulo + nombre: dashboard_service.panel y mapa_service.panel no deben compartir resultados
        nombre = f"{f.__module__}.{f.__qualname__}"

        @wraps(f)
        def envoltura(*args):
            clave = (nombre,) + tuple(
                tuple(sorted(a.items())) if hasattr(a, "items") else a for a in args)
            hit = _guardado.get(clave)
            if hit and time.time() - hit[0] < segundos:
                return hit[1]
            # Si otra petición (o el precálculo al arrancar) ya está calculando lo mismo, se espera
            # a que termine en lugar de lanzar la misma consulta pesada dos veces.
            with _candado(clave):
                hit = _guardado.get(clave)
                if hit and time.time() - hit[0] < segundos:
                    return hit[1]
                valor = f(*args)  # si lanza un error, no se guarda nada
                _guardado[clave] = (time.time(), valor)
                return valor
        return envoltura
    return decorador


def limpiar():
    """Vacía la caché. Se llama cuando cambian los datos (crear, editar o eliminar hospitalizaciones)."""
    _guardado.clear()
