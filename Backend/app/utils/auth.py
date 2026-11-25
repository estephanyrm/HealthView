<<<<<<< HEAD
"""Decoradores para proteger endpoints: exigen una sesión iniciada en /api/auth/login."""
from functools import wraps

from flask import g, session
=======
"""Autenticación y autorización con JWT.

El cliente envía el token en la cabecera `Authorization: Bearer <token>`.
Aunque el token trae el rol como dato informativo, la autorización NUNCA se basa en él:
en cada petición se consulta la base de datos, de modo que si un administrador desactiva
una cuenta o cambia un rol, el efecto es inmediato aunque el token siga vigente.
"""
from functools import wraps

from flask import g
from flask_jwt_extended import create_access_token, get_jwt_identity, verify_jwt_in_request

from app.extensions import db
from app.models import Usuario
>>>>>>> origin/main

from app.extensions import db
from app.models.usuario import Usuario
from .errors import ApiError

ROL_ADMIN = "Administrador"


def crear_token(usuario):
    """Emite un JWT firmado para el usuario (el `sub` debe ser texto)."""
    return create_access_token(
        identity=str(usuario.id_usuario),
        additional_claims={
            "rol": usuario.rol.nombre if usuario.rol else None,
            "debe_cambiar_clave": bool(usuario.debe_cambiar_clave),
        },
    )


def _cargar_usuario_actual(permitir_clave_temporal=False):
    verify_jwt_in_request()  # 401 si falta, es inválido o expiró
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


<<<<<<< HEAD
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
=======
def login_requerido(f):
    """Exige un JWT válido y una cuenta activa sin contraseña temporal pendiente."""
    @wraps(f)
    def envoltura(*args, **kwargs):
        _cargar_usuario_actual()
        return f(*args, **kwargs)

    return envoltura


def token_requerido_clave_temporal(f):
    """Igual que login_requerido, pero admite cuentas con contraseña temporal
    (solo para el endpoint que permite cambiarla)."""
    @wraps(f)
    def envoltura(*args, **kwargs):
        _cargar_usuario_actual(permitir_clave_temporal=True)
        return f(*args, **kwargs)

    return envoltura


def rol_requerido(*roles):
    """Exige JWT válido y que el rol ACTUAL del usuario (en BD) sea uno de `roles`."""
    def decorador(f):
        @wraps(f)
        def envoltura(*args, **kwargs):
            usuario = _cargar_usuario_actual()
            nombre_rol = usuario.rol.nombre if usuario.rol else None
            if nombre_rol not in roles:
                raise ApiError("No tienes permisos para realizar esta acción.", 403)
>>>>>>> origin/main
            return f(*args, **kwargs)

        return envoltura

    return decorador
