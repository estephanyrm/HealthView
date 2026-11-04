"""Panel inteligente (módulo 1). GET /api/dashboard?anio=2022&dx=egreso"""
from flask import Blueprint, jsonify, request

from app.services import dashboard_service as servicio
from app.utils.auth import login_requerido

bp = Blueprint("dashboard", __name__)


@bp.get("")
@login_requerido
def panel():
    return jsonify(servicio.panel(request.args)), 200
