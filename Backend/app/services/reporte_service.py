"""Servicio de Reportes Automáticos y Exportación (Módulo 6).
Genera resúmenes ejecutivos, reportes epidemiológicos y exportaciones
en formatos CSV (compatible con Excel con UTF-8 BOM), JSON y estructura para PDF.
Cumple estrictamente las consultas definidas en consultas_prueba.sql.
"""
import csv
import io
from datetime import datetime
from sqlalchemy import func

from app.extensions import db
from app.models import (
    CausaExterna, Diagnostico, Eps, Hospitalizacion as H,
    Municipio, Prestador, TipoUsuario, ViaIngreso,
)


def reporte_resumen_ejecutivo(anio=None):
    """Resumen ejecutivo por año y vía de ingreso (Consulta 6.1)."""
    query = db.session.query(
        H.anio,
        ViaIngreso.nombre.label("via_ingreso"),
        func.count(H.id_hospitalizacion).label("casos"),
        func.round(func.avg(H.dias_estancia), 2).label("estancia_promedio"),
        func.sum(func.case((H.estado_salida == 1, 1), else_=0)).label("egresos_vivos"),
        func.sum(func.case((H.estado_salida == 2, 1), else_=0)).label("fallecidos"),
        func.round(100.0 * func.sum(func.case((H.estado_salida == 2, 1), else_=0)) / func.count(H.id_hospitalizacion), 2).label("mortalidad_pct")
    ).select_from(H)\
     .join(ViaIngreso, ViaIngreso.id_via == H.via_ingreso)

    if anio:
        query = query.filter(H.anio == anio)

    filas = query.group_by(H.anio, ViaIngreso.nombre).order_by(H.anio.desc(), func.count(H.id_hospitalizacion).desc()).all()

    datos = []
    for r in filas:
        datos.append({
            "anio": r.anio,
            "via_ingreso": r.via_ingreso,
            "casos": int(r.casos),
            "estancia_promedio": float(r.estancia_promedio or 0),
            "egresos_vivos": int(r.egresos_vivos or 0),
            "fallecidos": int(r.fallecidos or 0),
            "mortalidad_pct": float(r.mortalidad_pct or 0),
        })
    return datos


def reporte_epidemiologico(anio=None, limite=25):
    """Top diagnósticos CIE-10 con estancia y tasa de mortalidad (Consulta 1.3 extendida)."""
    query = db.session.query(
        H.id_dx_egreso.label("codigo"),
        Diagnostico.descripcion.label("descripcion"),
        Diagnostico.grupo_cie10.label("grupo"),
        func.count(H.id_hospitalizacion).label("casos"),
        func.round(func.avg(H.dias_estancia), 2).label("estancia_promedio"),
        func.sum(func.case((H.estado_salida == 2, 1), else_=0)).label("fallecidos"),
        func.round(100.0 * func.sum(func.case((H.estado_salida == 2, 1), else_=0)) / func.count(H.id_hospitalizacion), 2).label("mortalidad_pct")
    ).select_from(H)\
     .join(Diagnostico, Diagnostico.codigo == H.id_dx_egreso)

    if anio:
        query = query.filter(H.anio == anio)

    filas = query.group_by(H.id_dx_egreso, Diagnostico.descripcion, Diagnostico.grupo_cie10)\
                 .order_by(func.count(H.id_hospitalizacion).desc())\
                 .limit(limite).all()

    datos = []
    for r in filas:
        datos.append({
            "codigo": r.codigo,
            "descripcion": r.descripcion or f"Diagnóstico {r.codigo}",
            "grupo": r.grupo,
            "casos": int(r.casos),
            "estancia_promedio": float(r.estancia_promedio or 0),
            "fallecidos": int(r.fallecidos or 0),
            "mortalidad_pct": float(r.mortalidad_pct or 0),
        })
    return datos


def reporte_prestadores(anio=None, limite=20):
    """Comparativa de prestadores / IPS (Consulta 7.1)."""
    query = db.session.query(
        H.id_prestador,
        func.coalesce(Prestador.nombre, "Sin nombre").label("prestador"),
        func.count(H.id_hospitalizacion).label("hospitalizaciones"),
        func.round(func.avg(H.dias_estancia), 2).label("estancia_promedio"),
        func.sum(func.case((H.estado_salida == 2, 1), else_=0)).label("fallecidos"),
        func.round(100.0 * func.sum(func.case((H.estado_salida == 2, 1), else_=0)) / func.count(H.id_hospitalizacion), 2).label("mortalidad_pct")
    ).select_from(H)\
     .join(Prestador, Prestador.id_prestador == H.id_prestador)

    if anio:
        query = query.filter(H.anio == anio)

    filas = query.group_by(H.id_prestador, Prestador.nombre)\
                 .order_by(func.count(H.id_hospitalizacion).desc())\
                 .limit(limite).all()

    datos = []
    for r in filas:
        datos.append({
            "id_prestador": r.id_prestador,
            "prestador": r.prestador,
            "hospitalizaciones": int(r.hospitalizaciones),
            "estancia_promedio": float(r.estancia_promedio or 0),
            "fallecidos": int(r.fallecidos or 0),
            "mortalidad_pct": float(r.mortalidad_pct or 0),
        })
    return datos


def reporte_eps(anio=None, limite=20):
    """Comparativa por aseguradora / EPS (Consulta 7.2)."""
    query = db.session.query(
        H.id_eps,
        func.coalesce(Eps.nombre, H.id_eps).label("eps"),
        func.count(H.id_hospitalizacion).label("hospitalizaciones"),
        func.round(func.avg(H.dias_estancia), 2).label("estancia_promedio"),
        func.sum(func.case((H.estado_salida == 2, 1), else_=0)).label("fallecidos"),
        func.round(100.0 * func.sum(func.case((H.estado_salida == 2, 1), else_=0)) / func.count(H.id_hospitalizacion), 2).label("mortalidad_pct")
    ).select_from(H)\
     .join(Eps, Eps.id_eps == H.id_eps)

    if anio:
        query = query.filter(H.anio == anio)

    filas = query.group_by(H.id_eps, Eps.nombre)\
                 .order_by(func.count(H.id_hospitalizacion).desc())\
                 .limit(limite).all()

    datos = []
    for r in filas:
        datos.append({
            "id_eps": r.id_eps,
            "eps": r.eps,
            "hospitalizaciones": int(r.hospitalizaciones),
            "estancia_promedio": float(r.estancia_promedio or 0),
            "fallecidos": int(r.fallecidos or 0),
            "mortalidad_pct": float(r.mortalidad_pct or 0),
        })
    return datos


def exportar_csv(datos, columnas=None):
    """Convierte una lista de diccionarios a CSV con UTF-8 BOM para apertura perfecta en Excel."""
    if not datos:
        return "\ufeff"

    output = io.StringIO()
    output.write("\ufeff")  # BOM UTF-8 para Excel en español

    campos = columnas or list(datos[0].keys())
    writer = csv.DictWriter(output, fieldnames=campos, extrasaction="ignore", delimiter=";")
    writer.writeheader()

    for fila in datos:
        writer.writerow(fila)

    return output.getvalue()


def generar_reporte_completo(tipo_reporte, anio=None):
    """Consolida metadatos, tablas y resumen para visualización y exportación."""
    fecha_generacion = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if tipo_reporte == "resumen_ejecutivo":
        titulo = "Reporte Ejecutivo de Hospitalizaciones por Vía de Ingreso"
        filas = reporte_resumen_ejecutivo(anio=anio)
        columnas = ["anio", "via_ingreso", "casos", "estancia_promedio", "egresos_vivos", "fallecidos", "mortalidad_pct"]
    elif tipo_reporte == "epidemiologico":
        titulo = "Reporte Epidemiológico de Diagnósticos Principales (CIE-10)"
        filas = reporte_epidemiologico(anio=anio)
        columnas = ["codigo", "descripcion", "grupo", "casos", "estancia_promedio", "fallecidos", "mortalidad_pct"]
    elif tipo_reporte == "prestadores":
        titulo = "Reporte Comparativo de Desempeño por Prestador (IPS)"
        filas = reporte_prestadores(anio=anio)
        columnas = ["id_prestador", "prestador", "hospitalizaciones", "estancia_promedio", "fallecidos", "mortalidad_pct"]
    elif tipo_reporte == "eps":
        titulo = "Reporte de Ocupación por Aseguradora (EPS)"
        filas = reporte_eps(anio=anio)
        columnas = ["id_eps", "eps", "hospitalizaciones", "estancia_promedio", "fallecidos", "mortalidad_pct"]
    else:
        titulo = "Reporte General de Hospitalizaciones"
        filas = reporte_resumen_ejecutivo(anio=anio)
        columnas = ["anio", "via_ingreso", "casos", "estancia_promedio", "egresos_vivos", "fallecidos", "mortalidad_pct"]

    total_registros = sum(f.get("casos", f.get("hospitalizaciones", 0)) for f in filas)

    return {
        "metadatos": {
            "plataforma": "HealthView - Universidad Libre",
            "grupo": "Grupo Chill",
            "tipo_reporte": tipo_reporte,
            "titulo": titulo,
            "periodo": str(anio or "Todos los años (2019-2022)"),
            "fecha_generacion": fecha_generacion,
            "total_registros": total_registros,
        },
        "columnas": columnas,
        "datos": filas,
    }
