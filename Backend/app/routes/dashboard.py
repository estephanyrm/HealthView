"""Panel inteligente (módulo 1). GET /api/dashboard?anio=2022&dx=egreso"""
from flask import Blueprint, jsonify, request

from app.services import dashboard_service as servicio
from app.utils.auth import roles_requeridos

bp = Blueprint("dashboard", __name__)


@bp.get("")
@roles_requeridos("Administrador", "Analista", "Investigador", "Médico")
def panel():
    return jsonify(servicio.panel(request.args)), 200


@bp.get("/tendencias")
@roles_requeridos("Administrador", "Analista")
def tendencias():
    """Serie mensual por año (módulo Tendencias). Solo Administrador y Analista."""
    datos = servicio.panel(request.args)
    return jsonify({"filtros": datos["filtros"], "mensual": datos["mensual"]}), 200

