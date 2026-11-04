"""Decorador para proteger endpoints: exige una sesión iniciada en /api/auth/login."""
from functools import wraps

from flask import session

from .errors import ApiError


def login_requerido(f):
    @wraps(f)
    def envoltura(*args, **kwargs):
        if "id_usuario" not in session:
            raise ApiError("Debes iniciar sesión para ver esta información.", 401)
        if session.get("debe_cambiar_clave"):
            raise ApiError("Debes cambiar tu contraseña temporal antes de continuar.", 403)
        return f(*args, **kwargs)

    return envoltura
