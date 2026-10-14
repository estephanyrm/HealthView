"""Capa HTTP: traduce peticiones a llamadas del servicio y devuelve JSON con el código correcto."""
from flask import Blueprint, jsonify, request

from app.services import hospitalizacion_service as servicio
from app.utils.errors import ApiError

bp = Blueprint("hospitalizaciones", __name__)


def _json_o_error():
    datos = request.get_json(silent=True)
    if datos is None:
        raise ApiError("Se esperaba un cuerpo JSON (Content-Type: application/json).", 400)
    return datos


@bp.get("")
def listar():
    return jsonify(servicio.listar(request.args)), 200


@bp.get("/<int:id_>")
def detalle(id_):
    return jsonify(servicio.obtener(id_).to_dict()), 200


@bp.post("")
def crear():
    h = servicio.crear(_json_o_error())
    respuesta = jsonify(h.to_dict())
    respuesta.headers["Location"] = f"/api/hospitalizaciones/{h.id_hospitalizacion}"
    return respuesta, 201


@bp.put("/<int:id_>")
def reemplazar(id_):
    return jsonify(servicio.actualizar(id_, _json_o_error(), parcial=False).to_dict()), 200


@bp.patch("/<int:id_>")
def modificar(id_):
    return jsonify(servicio.actualizar(id_, _json_o_error(), parcial=True).to_dict()), 200


@bp.delete("/<int:id_>")
def eliminar(id_):
    servicio.eliminar(id_)
    return "", 204
