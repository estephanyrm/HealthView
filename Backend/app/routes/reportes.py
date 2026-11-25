"""Rutas de Generación y Exportación de Reportes (Módulo 6).
GET /api/reportes/resumen
GET /api/reportes/epidemiologico
GET /api/reportes/prestadores
GET /api/reportes/eps
GET /api/reportes/exportar/csv
GET /api/reportes/exportar/excel
"""
from flask import Blueprint, Response, jsonify, request

from app.services import reporte_service as servicio
from app.utils.auth import roles_requeridos
from app.utils.errors import ApiError

bp = Blueprint("reportes", __name__)


def _filtros():
    """Lee ?anio= y ?limite= (número o 'all'/'todos'). Valores inválidos -> 400, nunca 500."""
    anio = request.args.get("anio", "").strip()
    anio_num = int(anio) if anio.isdigit() else None
    limite = request.args.get("limite", "25").strip().lower()
    if limite in ("all", "todos", ""):
        return anio_num, None
    if not limite.isdigit() or int(limite) < 1:
        raise ApiError("'limite' debe ser un entero positivo o 'all'.", 400)
    return anio_num, int(limite)


@bp.get("/resumen")
@roles_requeridos("Administrador", "Analista")
def resumen():
    """Genera datos del reporte ejecutivo por vía de ingreso y año."""
    anio_num, limite = _filtros()
    return jsonify(servicio.generar_reporte_completo("resumen_ejecutivo", anio_num, limite)), 200


@bp.get("/epidemiologico")
@roles_requeridos("Administrador", "Analista")
def epidemiologico():
    """Genera reporte epidemiológico de frecuencias diagnósticas CIE-10."""
    anio_num, limite = _filtros()
    return jsonify(servicio.generar_reporte_completo("epidemiologico", anio_num, limite)), 200


@bp.get("/prestadores")
@roles_requeridos("Administrador", "Analista")
def prestadores():
    """Genera comparativa de prestadores de salud (IPS)."""
    anio_num, limite = _filtros()
    return jsonify(servicio.generar_reporte_completo("prestadores", anio_num, limite)), 200


@bp.get("/eps")
@roles_requeridos("Administrador", "Analista")
def eps():
    """Genera reporte por entidades promotoras de salud (EPS)."""
    anio_num, limite = _filtros()
    return jsonify(servicio.generar_reporte_completo("eps", anio_num, limite)), 200


@bp.get("/exportar/csv")
@roles_requeridos("Administrador", "Analista")
def exportar_csv():
    """Descarga el reporte en formato CSV con delimitador ';' y codificación UTF-8 BOM."""
    tipo = request.args.get("tipo", "resumen_ejecutivo")
    anio_num, limite = _filtros()

    rep = servicio.generar_reporte_completo(tipo, anio_num, limite)
    contenido = servicio.exportar_csv(rep["datos"], rep["columnas"])

    nombre_archivo = f"healthview_reporte_{tipo}_{anio_num or 'todos'}.csv"
    return Response(
        contenido,
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"}
    )


@bp.get("/exportar/excel")
@roles_requeridos("Administrador", "Analista")
def exportar_excel():
    """Descarga compatible con Microsoft Excel (CSV con formato de números y punto y coma)."""
    tipo = request.args.get("tipo", "resumen_ejecutivo")
    anio_num, limite = _filtros()

    rep = servicio.generar_reporte_completo(tipo, anio_num, limite)
    contenido = servicio.exportar_csv(rep["datos"], rep["columnas"])

    nombre_archivo = f"healthview_reporte_{tipo}_{anio_num or 'todos'}.csv"
    return Response(
        contenido,
        mimetype="application/vnd.ms-excel; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"}
    )
