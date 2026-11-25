"""Decoradores para proteger endpoints: exigen una sesión iniciada en /api/auth/login."""
from functools import wraps

from flask import g, session

from app.extensions import db
from app.models.usuario import Usuario
from .errors import ApiError


def _usuario_de_sesion():
    """Valida la sesión activa, la sincroniza con la BD y devuelve el usuario."""
    id_usuario = session.get("id_usuario")
    if id_usuario is None:
        raise ApiError("Debes iniciar sesión para ver esta información.", 401)

    usuario = db.session.get(Usuario, id_usuario)
    if usuario is None:
        session.clear()
        raise ApiError("La sesión ya no es válida. Inicia sesión nuevamente.", 401)
    if not usuario.activo:
        session.clear()
        raise ApiError("Tu cuenta está desactivada. Contacta al administrador.", 403)

    # Disponible como g.usuario en la vista que invoke al decorador.
    g.usuario = usuario

    rol_actual = usuario.rol.nombre if usuario.rol else None
    if session.get("rol") != rol_actual:
        session["rol"] = rol_actual

    return usuario


def login_requerido(f=None, *, permitir_clave_temporal=False):
    """
    Exige una sesión activa y, por defecto, que la contraseña ya haya sido cambiada.

    Uso normal: `@login_requerido`.
    Para el flujo de cambio de clave: `@login_requerido(permitir_clave_temporal=True)`.
    """
    def decorador(func):
        @wraps(func)
        def envoltura(*args, **kwargs):
            usuario = _usuario_de_sesion()
            if usuario.debe_cambiar_clave and not permitir_clave_temporal:
                raise ApiError(
                    "Debes cambiar tu contraseña temporal antes de continuar.", 403
                )
            return func(*args, **kwargs)

        return envoltura

    return decorador(f) if f is not None else decorador


def roles_requeridos(*roles_permitidos):
    """Exige una sesión activa y uno de los roles autorizados para el recurso."""
    def decorador(f):
        @wraps(f)
        @login_requerido
        def envoltura(*args, **kwargs):
            if session.get("rol") not in roles_permitidos:
                raise ApiError("No tienes permisos para acceder a este recurso.", 403)
            return f(*args, **kwargs)

        return envoltura

    return decorador
