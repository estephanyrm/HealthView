from flask import Blueprint, g, jsonify, request, session
from app.services import auth_service
from app.utils.auth import login_requerido
from app.utils.errors import ApiError

bp = Blueprint("auth", __name__)


def _json_o_error():
    datos = request.get_json(silent=True)
    if datos is None:
        raise ApiError("Se esperaba un cuerpo JSON (Content-Type: application/json).", 400)
    return datos


@bp.post("/login")
def login():
    usuario = auth_service.autenticar_usuario(_json_o_error())

    # Guardamos los datos esenciales en la sesión firmada de Flask
    session["id_usuario"] = usuario.id_usuario
    session["rol"] = usuario.rol.nombre if usuario.rol else None
    session["debe_cambiar_clave"] = bool(usuario.debe_cambiar_clave)

    return jsonify({
        "mensaje": "Inicio de sesión exitoso.",
        "usuario": usuario.to_dict_publico()
    }), 200


@bp.post("/cambiar-clave")
@login_requerido(permitir_clave_temporal=True)
def cambiar_clave():
    """Permite cambiar la clave temporal (o la actual) sin salir de la sesión."""
    usuario = auth_service.cambiar_clave(g.usuario, _json_o_error())
    session["debe_cambiar_clave"] = False

    return jsonify({
        "mensaje": "Contraseña actualizada correctamente.",
        "usuario": usuario.to_dict_publico(),
    }), 200


@bp.get("/me")
@login_requerido(permitir_clave_temporal=True)
def me():
    """Devuelve el usuario de la sesión, incluso si aún tiene clave temporal."""
    return jsonify({"usuario": g.usuario.to_dict_publico()}), 200


@bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"mensaje": "Sesión cerrada correctamente."}), 200
