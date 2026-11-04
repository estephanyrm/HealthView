"""Caché en memoria para respuestas pesadas. Los datos son históricos (2019-2022) y no cambian
mientras el servidor está encendido, así que la primera consulta calcula y las siguientes son instantáneas."""
import time
from functools import wraps

_guardado = {}


def cacheado(segundos=600):
    def decorador(f):
        @wraps(f)
        def envoltura(*args):
            clave = (f.__name__,) + tuple(
                tuple(sorted(a.items())) if hasattr(a, "items") else a for a in args)
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
