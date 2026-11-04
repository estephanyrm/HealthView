"""Rutas de Búsqueda y Filtros Avanzados (Módulo 5).
GET /api/busqueda
GET /api/busqueda/presets
"""
from flask import Blueprint, jsonify, request

from app.services import busqueda_service as servicio
from app.utils.auth import login_requerido

bp = Blueprint("busqueda", __name__)


@bp.get("")
@login_requerido
def buscar():
    """Ejecuta consulta avanzada multi-criterio."""
    return jsonify(servicio.buscar(request.args)), 200


@bp.get("/presets")
@login_requerido
def listar_presets():
    """Devuelve listado de búsquedas clínicas preconfiguradas."""
    presets = [
        {
            "id": "mujeres_60_epoc",
            "titulo": "Mujeres 60+ con EPOC",
            "descripcion": "Pacientes femeninas de 60 años o más diagnosticadas con EPOC (J44x).",
            "filtros": {"dx": "J44", "sexo": "F", "edad_min": 60}
        },
        {
            "id": "covid19_estancia_larga",
            "titulo": "COVID-19 con Estancia Prolongada",
            "descripcion": "Casos de COVID-19 confirmado (U071) con estancia igual o mayor a 14 días.",
            "filtros": {"dx": "U071", "estancia_min": 14}
        },
        {
            "id": "pediatria_urgente",
            "titulo": "Urgencias Pediátricas (<5 años)",
            "descripcion": "Ingresos por urgencias en primera infancia (menores de 5 años).",
            "filtros": {"edad_max": 4, "via_ingreso": 1}
        },
        {
            "id": "fallecidos_criticos",
            "titulo": "Mortalidad Hospitalaria",
            "descripcion": "Todas las atenciones con desenlace de defunción (estado de salida = 2).",
            "filtros": {"estado_salida": 2}
        },
        {
            "id": "rural_remitido",
            "titulo": "Pacientes Rurales Remitidos",
            "descripcion": "Hospitalizaciones procedentes de zona rural ingresados por remisión.",
            "filtros": {"zona": "R", "via_ingreso": 3}
        }
    ]
    return jsonify({"presets": presets}), 200
