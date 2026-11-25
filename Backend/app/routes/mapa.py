"""Mapa epidemiológico (módulo 3)."""
from flask import Blueprint, jsonify, request

from app.services import mapa_service as servicio
from app.utils.auth import roles_requeridos

bp = Blueprint("mapa", __name__)


@bp.get("")
@roles_requeridos("Administrador", "Analista", "Investigador")
def panel():
    return jsonify(servicio.panel(request.args)), 200


@bp.get("/<id_municipio>")
@roles_requeridos("Administrador", "Analista", "Investigador")
def detalle(id_municipio):
    return jsonify(servicio.detalle(id_municipio, request.args)), 200
