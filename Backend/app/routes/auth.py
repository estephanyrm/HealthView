from flask import Blueprint, current_app, g, jsonify, request
from app.services import auth_service
from app.utils.auth import crear_token, login_requerido, token_requerido_clave_temporal
from app.utils.errors import ApiError

bp = Blueprint("auth", __name__)


def _json_o_error():
    datos = request.get_json(silent=True)
    if datos is None:
        raise ApiError("Se esperaba un cuerpo JSON (Content-Type: application/json).", 400)
    return datos


def _respuesta_con_token(usuario, mensaje):
    expira = current_app.config["JWT_ACCESS_TOKEN_EXPIRES"]
    return {
        "mensaje": mensaje,
        "token": crear_token(usuario),
        "tipo": "Bearer",
        "expira_en": int(expira.total_seconds()),
        "usuario": usuario.to_dict_publico(),
    }


@bp.post("/login")
def login():
    usuario = auth_service.autenticar_usuario(_json_o_error())
    return jsonify(_respuesta_con_token(usuario, "Inicio de sesión exitoso.")), 200


@bp.get("/me")
@token_requerido_clave_temporal
def yo():
    """Devuelve el usuario del token con datos frescos de la BD (rol, estado, etc.)."""
    return jsonify({"usuario": g.usuario_actual.to_dict_publico()}), 200


@bp.post("/cambiar-clave")
@token_requerido_clave_temporal
def cambiar_clave():
    usuario = auth_service.cambiar_clave(g.usuario_actual, _json_o_error())
    return jsonify(_respuesta_con_token(usuario, "Contraseña actualizada correctamente.")), 200


@bp.post("/logout")
@login_requerido
def logout():
    # Los JWT no se guardan en el servidor: el cierre de sesión consiste en que el
    # cliente descarte el token. El token deja de servir al expirar.
    return jsonify({"mensaje": "Sesión cerrada correctamente."}), 200
