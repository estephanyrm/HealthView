"""Autenticacion y autorizacion con JWT."""

from functools import wraps

from flask import g
from flask_jwt_extended import create_access_token, get_jwt_identity, verify_jwt_in_request

from app.extensions import db
from app.models import Usuario
from .errors import ApiError

ROL_ADMIN = "Administrador"


def crear_token(usuario):
    return create_access_token(
        identity=str(usuario.id_usuario),
        additional_claims={
            "rol": usuario.rol.nombre if usuario.rol else None,
            "debe_cambiar_clave": bool(usuario.debe_cambiar_clave),
        },
    )


def _cargar_usuario_actual(permitir_clave_temporal=False):
    verify_jwt_in_request()
    try:
        id_usuario = int(get_jwt_identity())
    except (TypeError, ValueError):
        raise ApiError("Token inválido. Inicia sesión de nuevo.", 401)

    usuario = db.session.get(Usuario, id_usuario)
    if usuario is None or not usuario.activo:
        raise ApiError("La sesión ya no es válida. Inicia sesión de nuevo.", 401)
    if usuario.debe_cambiar_clave and not permitir_clave_temporal:
        raise ApiError("Debes cambiar tu contraseña temporal antes de continuar.", 403)

    g.usuario_actual = usuario
    return usuario


def login_requerido(f):
    @wraps(f)
    def envoltura(*args, **kwargs):
        _cargar_usuario_actual()
        return f(*args, **kwargs)

    return envoltura


def token_requerido_clave_temporal(f):
    @wraps(f)
    def envoltura(*args, **kwargs):
        _cargar_usuario_actual(permitir_clave_temporal=True)
        return f(*args, **kwargs)

    return envoltura


def rol_requerido(*roles):
    def decorador(f):
        @wraps(f)
        def envoltura(*args, **kwargs):
            usuario = _cargar_usuario_actual()
            nombre_rol = usuario.rol.nombre if usuario.rol else None
            if nombre_rol not in roles:
                raise ApiError("No tienes permisos para realizar esta acción.", 403)
            return f(*args, **kwargs)

        return envoltura

    return decorador


def roles_requeridos(*roles):
    """Alias compatible con las rutas existentes."""
    return rol_requerido(*roles)
