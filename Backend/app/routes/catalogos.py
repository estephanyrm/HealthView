"""Endpoints de solo lectura para llenar filtros y listas desplegables del frontend."""
from flask import Blueprint, jsonify, request

from app.models import (CausaExterna, Departamento, Diagnostico, Eps, Municipio,
                        Prestador, TipoUsuario, ViaIngreso)
from app.utils.errors import ApiError

bp = Blueprint("catalogos", __name__)

# nombre en la URL -> (modelo, columna por la que se ordena y se busca con ?q=)
CATALOGOS = {
    "departamentos": (Departamento, "nombre"),
    "municipios": (Municipio, "nombre"),
    "eps": (Eps, "nombre"),
    "prestadores": (Prestador, "nombre"),
    "diagnosticos": (Diagnostico, "descripcion"),
    "vias-ingreso": (ViaIngreso, "nombre"),
    "causas-externas": (CausaExterna, "nombre"),
    "tipos-usuario": (TipoUsuario, "nombre"),
}


@bp.get("/<nombre>")
def listar(nombre):
    if nombre not in CATALOGOS:
        raise ApiError("Catálogo no encontrado.", 404, {"disponibles": sorted(CATALOGOS)})
    modelo, columna = CATALOGOS[nombre]
    col = getattr(modelo, columna)

    consulta = modelo.query
    q = request.args.get("q", "").strip()
    if q:
        consulta = consulta.filter(col.like(f"%{q}%"))  # parámetro enlazado: no hay inyección SQL
    filas = consulta.order_by(col).limit(500).all()
    return jsonify({"datos": [f.to_dict() for f in filas]}), 200
