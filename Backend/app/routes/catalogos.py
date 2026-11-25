"""Endpoints de solo lectura para llenar filtros y listas desplegables del frontend."""
from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from app.extensions import db
from app.models import (CausaExterna, Departamento, Diagnostico, Eps, Municipio,
                        Prestador, TipoUsuario, ViaIngreso)
from app.utils.auth import roles_requeridos
from app.utils.errors import ApiError
from app.utils.nombres_municipios import MUNICIPIOS_ANTIOQUIA

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

# Catálogos pequeños que en la BD llegaron sin nombre: se completan aquí para que el
# frontend nunca muestre "null". `etiqueta` añade el código cuando no hay nombre real.
SIN_NOMBRE = {"municipios", "eps", "prestadores"}


def _completar_municipios():
    deptos = dict(db.session.query(Departamento.cod_depto, Departamento.nombre).all())
    datos = []
    for m in Municipio.query.all():
        fila = m.to_dict()
        real = m.nombre or MUNICIPIOS_ANTIOQUIA.get(m.id_municipio)
        fila["nombre"] = real or f"Municipio sin nombre · {deptos.get(m.cod_depto) or m.cod_depto}"
        fila["etiqueta"] = real or f"{fila['nombre']} ({m.id_municipio})"
        fila["tiene_nombre"] = bool(real)
        datos.append(fila)
    return datos


def _completar(modelo, id_col, texto):
    datos = []
    for f in modelo.query.all():
        fila = f.to_dict()
        real = f.nombre
        fila["nombre"] = real or f"{texto} sin nombre"
        fila["etiqueta"] = real or f"{texto} sin nombre ({getattr(f, id_col)})"
        fila["tiene_nombre"] = bool(real)
        datos.append(fila)
    return datos


def _catalogo_completado(nombre, q):
    if nombre == "municipios":
        datos, id_col = _completar_municipios(), "id_municipio"
    elif nombre == "eps":
        datos, id_col = _completar(Eps, "id_eps", "EPS"), "id_eps"
    else:
        datos, id_col = _completar(Prestador, "id_prestador", "Prestador"), "id_prestador"

    if q:
        q = q.lower()
        datos = [d for d in datos if q in d["etiqueta"].lower() or q in str(d[id_col]).lower()]
    # Primero los que tienen nombre real (alfabético); luego los demás por código
    datos.sort(key=lambda d: (not d["tiene_nombre"], d["nombre"].lower() if d["tiene_nombre"] else d[id_col]))
    return datos


@bp.get("/<nombre>")
@roles_requeridos("Administrador", "Analista", "Investigador", "Médico")
def listar(nombre):
    if nombre not in CATALOGOS:
        raise ApiError("Catálogo no encontrado.", 404, {"disponibles": sorted(CATALOGOS)})
    q = request.args.get("q", "").strip()

    if nombre in SIN_NOMBRE:
        return jsonify({"datos": _catalogo_completado(nombre, q)}), 200

    modelo, columna = CATALOGOS[nombre]
    col = getattr(modelo, columna)
    consulta = modelo.query
    if q:
        # parámetros enlazados: no hay inyección SQL. Diagnósticos: también por código CIE-10
        condicion = col.like(f"%{q}%")
        if modelo is Diagnostico:
            condicion = or_(Diagnostico.codigo.like(f"{q.upper()}%"), condicion)
        consulta = consulta.filter(condicion)
    filas = consulta.order_by(col).limit(500).all()
    datos = []
    for f in filas:
        fila = f.to_dict()
        fila["etiqueta"] = fila.get(columna) or ""
        datos.append(fila)
    return jsonify({"datos": datos}), 200
