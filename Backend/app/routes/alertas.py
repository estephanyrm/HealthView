"""Rutas del Sistema de Alertas Clínicas y Epidemiológicas (Módulo 4).
GET /api/alertas
GET /api/alertas/estancias-prolongadas
GET /api/alertas/epidemiologicas
"""
from flask import Blueprint, jsonify, request

from app.services import alerta_service as servicio
from app.utils.auth import roles_requeridos
from app.utils.errors import ApiError

bp = Blueprint("alertas", __name__)


def _numero(nombre, defecto, tipo=int, minimo=0, maximo=None):
    """Lee un parámetro numérico de la URL; responde 400 (no 500) si no es válido."""
    valor = request.args.get(nombre)
    if valor in (None, ""):
        return defecto
    try:
        numero = tipo(valor)
    except ValueError:
        raise ApiError(f"'{nombre}' debe ser un número válido.", 400)
    if numero < minimo:
        raise ApiError(f"'{nombre}' no puede ser menor que {minimo}.", 400)
    return min(numero, maximo) if maximo is not None else numero


@bp.get("")
@roles_requeridos("Administrador", "Médico")
def panel():
    """Devuelve el resumen consolidado de alertas activas y estadísticas."""
    return jsonify(servicio.panel_alertas(request.args)), 200


@bp.get("/estancias-prolongadas")
@roles_requeridos("Administrador", "Médico")
def estancias_prolongadas():
    """Devuelve listado detallado de hospitalizaciones con estancia prolongada (>30 días)."""
    dias_min = _numero("dias_min", 30)
    limite = _numero("limite", 50, minimo=1, maximo=500)
    anio = request.args.get("anio")
    id_prestador = request.args.get("id_prestador")
    datos = servicio.obtener_estancias_prolongadas(
        dias_min=dias_min, limite=limite, anio=int(anio) if anio and anio.isdigit() else None,
        id_prestador=id_prestador
    )
    return jsonify({"datos": datos, "total": len(datos)}), 200


@bp.get("/epidemiologicas")
@roles_requeridos("Administrador", "Médico")
def epidemiologicas():
    """Devuelve alertas de picos y brotes inusuales calculados con z-score."""
    anio = request.args.get("anio")
    umbral = _numero("umbral", 2.0, tipo=float)
    datos = servicio.obtener_alertas_epidemiologicas(
        anio=int(anio) if anio and anio.isdigit() else None,
        umbral_desviacion=umbral
    )
    return jsonify({"datos": datos, "total": len(datos)}), 200


@bp.get("/ocupacion")
@roles_requeridos("Administrador", "Médico")
def ocupacion():
    """Devuelve alertas de sobrecarga de capacidad en pacientes-día."""
    anio = request.args.get("anio")
    datos = servicio.obtener_alertas_ocupacion(
        anio=int(anio) if anio and anio.isdigit() else None
    )
    return jsonify({"datos": datos, "total": len(datos)}), 200
