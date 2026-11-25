from flask import Blueprint, g, jsonify, request

from app.services import usuario_service
from app.utils.auth import ROL_ADMIN, rol_requerido
from app.utils.errors import ApiError

bp = Blueprint("usuarios", __name__)


def _json_o_error():
    datos = request.get_json(silent=True)
    if datos is None:
        raise ApiError("Se esperaba un cuerpo JSON (Content-Type: application/json).", 400)
    return datos


@bp.get("")
@rol_requerido(ROL_ADMIN)
def listar():
    usuarios = usuario_service.listar_usuarios()
    return jsonify({"datos": usuarios}), 200


@bp.post("")
@rol_requerido(ROL_ADMIN)
def crear():
    resultado = usuario_service.crear_usuario(_json_o_error())
    return jsonify(resultado), 201


@bp.patch("/<int:id_usuario>/rol")
@rol_requerido(ROL_ADMIN)
def actualizar_rol(id_usuario):
    nuevo_rol = _json_o_error().get("rol")
    if not nuevo_rol:
        raise ApiError("El campo 'rol' es requerido.", 400)
    usuario = usuario_service.cambiar_rol(id_usuario, nuevo_rol)
    return jsonify({"usuario": usuario, "mensaje": "Rol actualizado exitosamente."}), 200


@bp.patch("/<int:id_usuario>/estado")
@rol_requerido(ROL_ADMIN)
def actualizar_estado(id_usuario):
    datos = _json_o_error()
    if "activo" not in datos:
        raise ApiError("El campo 'activo' (booleano) es requerido.", 400)
    usuario = usuario_service.cambiar_estado(id_usuario, datos["activo"])
    return jsonify({"usuario": usuario, "mensaje": "Estado actualizado exitosamente."}), 200


@bp.post("/<int:id_usuario>/reiniciar-clave")
@rol_requerido(ROL_ADMIN)
def reiniciar_clave(id_usuario):
    resultado = usuario_service.reiniciar_clave(id_usuario)
    return jsonify(resultado), 200


@bp.delete("/<int:id_usuario>")
@rol_requerido(ROL_ADMIN)
def eliminar(id_usuario):
    datos = usuario_service.eliminar_usuario(id_usuario, g.usuario_actual.id_usuario)
    return jsonify({"usuario": datos, "mensaje": "Usuario eliminado definitivamente."}), 200
