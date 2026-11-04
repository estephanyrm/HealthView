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
from app.utils.auth import login_requerido

bp = Blueprint("reportes", __name__)


@bp.get("/resumen")
@login_requerido
def resumen():
    """Genera datos del reporte ejecutivo por vía de ingreso y año."""
    anio = request.args.get("anio")
    anio_num = int(anio) if anio and anio.isdigit() else None
    return jsonify(servicio.generar_reporte_completo("resumen_ejecutivo", anio=anio_num)), 200


@bp.get("/epidemiologico")
@login_requerido
def epidemiologico():
    """Genera reporte epidemiológico de frecuencias diagnósticas CIE-10."""
    anio = request.args.get("anio")
    anio_num = int(anio) if anio and anio.isdigit() else None
    limite = int(request.args.get("limite", 25))
    return jsonify(servicio.generar_reporte_completo("epidemiologico", anio=anio_num)), 200


@bp.get("/prestadores")
@login_requerido
def prestadores():
    """Genera comparativa de prestadores de salud (IPS)."""
    anio = request.args.get("anio")
    anio_num = int(anio) if anio and anio.isdigit() else None
    return jsonify(servicio.generar_reporte_completo("prestadores", anio=anio_num)), 200


@bp.get("/eps")
@login_requerido
def eps():
    """Genera reporte por entidades promotoras de salud (EPS)."""
    anio = request.args.get("anio")
    anio_num = int(anio) if anio and anio.isdigit() else None
    return jsonify(servicio.generar_reporte_completo("eps", anio=anio_num)), 200


@bp.get("/exportar/csv")
@login_requerido
def exportar_csv():
    """Descarga el reporte en formato CSV con delimitador ';' y codificación UTF-8 BOM."""
    tipo = request.args.get("tipo", "resumen_ejecutivo")
    anio = request.args.get("anio")
    anio_num = int(anio) if anio and anio.isdigit() else None

    rep = servicio.generar_reporte_completo(tipo, anio=anio_num)
    contenido = servicio.exportar_csv(rep["datos"], rep["columnas"])

    nombre_archivo = f"healthview_reporte_{tipo}_{anio or 'todos'}.csv"
    return Response(
        contenido,
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"}
    )


@bp.get("/exportar/excel")
@login_requerido
def exportar_excel():
    """Descarga compatible con Microsoft Excel (CSV con formato de números y punto y coma)."""
    tipo = request.args.get("tipo", "resumen_ejecutivo")
    anio = request.args.get("anio")
    anio_num = int(anio) if anio and anio.isdigit() else None

    rep = servicio.generar_reporte_completo(tipo, anio=anio_num)
    contenido = servicio.exportar_csv(rep["datos"], rep["columnas"])

    nombre_archivo = f"healthview_reporte_{tipo}_{anio or 'todos'}.csv"
    return Response(
        contenido,
        mimetype="application/vnd.ms-excel; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"}
    )
