"""Rutas del Sistema de Alertas Clínicas y Epidemiológicas (Módulo 4).
GET /api/alertas
GET /api/alertas/estancias-prolongadas
GET /api/alertas/epidemiologicas
"""
from flask import Blueprint, jsonify, request

from app.services import alerta_service as servicio
from app.utils.auth import login_requerido

bp = Blueprint("alertas", __name__)


@bp.get("")
@login_requerido
def panel():
    """Devuelve el resumen consolidado de alertas activas y estadísticas."""
    return jsonify(servicio.panel_alertas(request.args)), 200


@bp.get("/estancias-prolongadas")
@login_requerido
def estancias_prolongadas():
    """Devuelve listado detallado de hospitalizaciones con estancia prolongada (>30 días)."""
    dias_min = int(request.args.get("dias_min", 30))
    limite = int(request.args.get("limite", 50))
    anio = request.args.get("anio")
    id_prestador = request.args.get("id_prestador")
    datos = servicio.obtener_estancias_prolongadas(
        dias_min=dias_min, limite=limite, anio=int(anio) if anio and anio.isdigit() else None,
        id_prestador=id_prestador
    )
    return jsonify({"datos": datos, "total": len(datos)}), 200


@bp.get("/epidemiologicas")
@login_requerido
def epidemiologicas():
    """Devuelve alertas de picos y brotes inusuales calculados con z-score."""
    anio = request.args.get("anio")
    umbral = float(request.args.get("umbral", 2.0))
    datos = servicio.obtener_alertas_epidemiologicas(
        anio=int(anio) if anio and anio.isdigit() else None,
        umbral_desviacion=umbral
    )
    return jsonify({"datos": datos, "total": len(datos)}), 200


@bp.get("/ocupacion")
@login_requerido
def ocupacion():
    """Devuelve alertas de sobrecarga de capacidad en pacientes-día."""
    anio = request.args.get("anio")
    datos = servicio.obtener_alertas_ocupacion(
        anio=int(anio) if anio and anio.isdigit() else None
    )
    return jsonify({"datos": datos, "total": len(datos)}), 200
