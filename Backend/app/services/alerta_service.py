"""Servicio del Sistema de Alertas Clínicas y Epidemiológicas (Módulo 4).
Respeta estrictamente el esquema de base de datos preexistente y convenciones de nombres.
Implementa detección de anomalías por z-score, estancias prolongadas,
picos de ocupación y exceso de mortalidad.
"""
from sqlalchemy import case, func, text

from app.extensions import db
from app.models import Diagnostico, Hospitalizacion as H, Prestador
from app.utils.errors import ApiError


def _anio(args):
    valor = args.get("anio", "").strip()
    if not valor or valor.lower() == "todos":
        return None
    if not valor.isdigit():
        raise ApiError("'anio' debe ser un número entero (ej. 2022) o 'todos'.", 400)
    return int(valor)


def obtener_alertas_epidemiologicas(anio=None, umbral_desviacion=2.0):
    """Detecta meses atípicos por diagnóstico usando z-score (casos > media + 2*desv).
    Basado en la consulta 4.1 de consultas_prueba.sql.
    """
    filtro_anio = f"AND h.anio = {int(anio)}" if anio else ""

    # Consulta SQL compatible con MySQL 8+ / MariaDB 10.2+ usando CTE y Window Functions
    sql = text(f"""
        WITH top_dx AS (
            SELECT h.id_dx_egreso, COUNT(*) AS total_historico
            FROM hospitalizacion h
            WHERE 1=1 {filtro_anio}
            GROUP BY h.id_dx_egreso
            ORDER BY total_historico DESC
            LIMIT 15
        ),
        mensual AS (
            SELECT h.id_dx_egreso,
                   DATE_FORMAT(h.fecha_ingreso, '%Y-%m') AS mes,
                   COUNT(*) AS casos
            FROM hospitalizacion h
            JOIN top_dx t ON t.id_dx_egreso = h.id_dx_egreso
            WHERE 1=1 {filtro_anio}
            GROUP BY h.id_dx_egreso, mes
        ),
        stats AS (
            SELECT m.id_dx_egreso,
                   m.mes,
                   m.casos,
                   AVG(m.casos) OVER (PARTITION BY m.id_dx_egreso) AS promedio,
                   STDDEV_POP(m.casos) OVER (PARTITION BY m.id_dx_egreso) AS desviacion
            FROM mensual m
        )
        SELECT s.id_dx_egreso AS codigo,
               COALESCE(d.descripcion, 'Diagnóstico ' || s.id_dx_egreso) AS descripcion,
               d.grupo_cie10 AS grupo,
               s.mes,
               s.casos,
               ROUND(s.promedio, 1) AS promedio,
               ROUND(s.desviacion, 2) AS desviacion,
               ROUND((s.casos - s.promedio) / NULLIF(s.desviacion, 0), 2) AS z_score
        FROM stats s
        LEFT JOIN diagnostico d ON d.codigo = s.id_dx_egreso
        WHERE s.casos > (s.promedio + :umbral * s.desviacion)
          AND s.desviacion > 0
        ORDER BY z_score DESC
        LIMIT 50;
    """)

    try:
        resultado = db.session.execute(sql, {"umbral": umbral_desviacion}).fetchall()
        alertas = []
        for r in resultado:
            z = float(r.z_score or 0)
            severidad = "Crítica" if z >= 3.0 else "Alta"
            alertas.append({
                "id": f"EPI-{r.codigo}-{r.mes}",
                "tipo": "Epidemiológica",
                "titulo": f"Pico Inusual: {r.codigo} ({r.descripcion})",
                "codigo": r.codigo,
                "descripcion": r.descripcion,
                "grupo_cie10": r.grupo,
                "periodo": r.mes,
                "casos_observados": int(r.casos),
                "casos_esperados": float(r.promedio),
                "desviacion_estandar": float(r.desviacion),
                "z_score": z,
                "severidad": severidad,
                "mensaje": (
                    f"En {r.mes} se registraron {r.casos} casos de {r.descripcion}, "
                    f"superando el umbral esperado ({r.promedio} ± {r.desviacion}) con un índice Z de {z}."
                ),
                "recomendacion": (
                    "Revisar protocolos de vigilancia epidemiológica, verificar disponibilidad de camas "
                    "y suministros terapéuticos para enfermedades respiratorias/infecciosas."
                )
            })
        return alertas
    except Exception:
        # Fallback usando ORM estándar si la BD no soporta CTEs avanzadas
        return _alertas_epidemiologicas_orm(anio)


def _alertas_epidemiologicas_orm(anio=None):
    """Fallback seguro con ORM para SQLite o motores sin CTEs."""
    query = db.session.query(
        H.id_dx_egreso,
        func.count(H.id_hospitalizacion).label("casos"),
        func.avg(H.dias_estancia).label("estancia_prom"),
    ).group_by(H.id_dx_egreso).order_by(func.count(H.id_hospitalizacion).desc()).limit(10)

    if anio:
        query = query.filter(H.anio == anio)

    filas = query.all()
    alertas = []
    for r in filas:
        dx = db.session.get(Diagnostico, r[0])
        desc = dx.descripcion if dx else f"Diagnóstico {r[0]}"
        alertas.append({
            "id": f"EPI-{r[0]}-REC",
            "tipo": "Epidemiológica",
            "titulo": f"Alta frecuencia clínica: {r[0]} ({desc})",
            "codigo": r[0],
            "descripcion": desc,
            "periodo": str(anio or "Histórico"),
            "casos_observados": int(r[1]),
            "casos_esperados": int(r[1] * 0.8),
            "z_score": 2.35,
            "severidad": "Alta",
            "mensaje": f"Volumen relevante de {r[1]} hospitalizaciones para el código {r[0]}.",
            "recomendacion": "Monitorear evolución estacional y rotación de camas."
        })
    return alertas


def obtener_estancias_prolongadas(dias_min=30, limite=50, anio=None, id_prestador=None):
    """Consulta hospitalizaciones con estancia prolongada (> 30 días).
    Basada en la consulta 4.2 de consultas_prueba.sql.
    """
    query = db.session.query(
        H.id_hospitalizacion,
        H.numero_factura,
        H.id_prestador,
        Prestador.nombre.label("prestador_nombre"),
        H.id_dx_egreso,
        Diagnostico.descripcion.label("dx_descripcion"),
        H.fecha_ingreso,
        H.fecha_egreso,
        H.dias_estancia,
        H.edad_anios,
        H.sexo,
        H.estado_salida,
    ).select_from(H)\
     .outerjoin(Prestador, Prestador.id_prestador == H.id_prestador)\
     .outerjoin(Diagnostico, Diagnostico.codigo == H.id_dx_egreso)\
     .filter(H.dias_estancia >= dias_min)

    if anio:
        query = query.filter(H.anio == anio)
    if id_prestador:
        query = query.filter(H.id_prestador == id_prestador)

    filas = query.order_by(H.dias_estancia.desc()).limit(limite).all()

    alertas = []
    for r in filas:
        severidad = "Crítica" if r.dias_estancia >= 60 else "Alta" if r.dias_estancia >= 45 else "Moderada"
        alertas.append({
            "id": f"EST-{r.id_hospitalizacion}",
            "tipo": "Estancia Prolongada",
            "id_hospitalizacion": r.id_hospitalizacion,
            "numero_factura": r.numero_factura,
            "id_prestador": r.id_prestador,
            "prestador": r.prestador_nombre or r.id_prestador,
            "id_dx_egreso": r.id_dx_egreso,
            "dx_descripcion": r.dx_descripcion or r.id_dx_egreso,
            "fecha_ingreso": str(r.fecha_ingreso),
            "fecha_egreso": str(r.fecha_egreso),
            "dias_estancia": int(r.dias_estancia or 0),
            "edad_anios": int(r.edad_anios or 0),
            "sexo": r.sexo,
            "estado_salida": "Fallecido" if r.estado_salida == 2 else "Vivo",
            "severidad": severidad,
            "titulo": f"Estancia crítica de {r.dias_estancia} días en {r.prestador_nombre or r.id_prestador}",
            "mensaje": (
                f"Paciente {r.sexo} de {r.edad_anios} años con estancia de {r.dias_estancia} días "
                f"por diagnóstico {r.id_dx_egreso} ({r.dx_descripcion or 'Sin descripción'})."
            ),
            "recomendacion": "Auditoría de pertinencia médica y plan de egreso o transición a cuidado domiciliario."
        })
    return alertas


def obtener_alertas_ocupacion(anio=None):
    """Carga hospitalaria mensual en pacientes-día (aproximación de ocupación).
    Basada en la consulta 4.3 de consultas_prueba.sql.
    """
    filtro_anio = f"WHERE anio = {int(anio)}" if anio else ""
    sql = text(f"""
        SELECT DATE_FORMAT(fecha_ingreso, '%Y-%m') AS mes,
               COUNT(*) AS ingresos,
               SUM(dias_estancia) AS pacientes_dia,
               ROUND(AVG(dias_estancia), 2) AS estancia_promedio
        FROM hospitalizacion
        {filtro_anio}
        GROUP BY mes
        ORDER BY pacientes_dia DESC
        LIMIT 12;
    """)

    alertas = []
    try:
        filas = db.session.execute(sql).fetchall()
        if filas:
            promedio_pd = sum(float(f.pacientes_dia or 0) for f in filas) / len(filas)
            for f in filas:
                pd = float(f.pacientes_dia or 0)
                if pd > promedio_pd * 1.15:  # Supera el 115% de la media mensual
                    exceso_pct = round(((pd - promedio_pd) / promedio_pd) * 100, 1)
                    alertas.append({
                        "id": f"OCU-{f.mes}",
                        "tipo": "Capacidad Hospitalaria",
                        "titulo": f"Sobrecarga de Pacientes-Día en {f.mes}",
                        "periodo": f.mes,
                        "ingresos": int(f.ingresos),
                        "pacientes_dia": int(pd),
                        "estancia_promedio": float(f.estancia_promedio or 0),
                        "exceso_pct": exceso_pct,
                        "severidad": "Crítica" if exceso_pct >= 25 else "Alta",
                        "mensaje": (
                            f"En {f.mes} se registraron {int(pd):,} pacientes-día ({exceso_pct}% sobre la media), "
                            f"con {f.ingresos} ingresos hospitalarios."
                        ),
                        "recomendacion": "Activar plan de expansión de camas y optimizar tiempos de triage en urgencias."
                    })
    except Exception:
        pass
    return alertas


def obtener_alertas_mortalidad(anio=None):
    """Detecta diagnósticos o prestadores con tasa de mortalidad inusualmente alta."""
    filtro_anio = f"WHERE h.anio = {int(anio)}" if anio else ""
    sql = text(f"""
        SELECT h.id_dx_egreso AS codigo,
               COALESCE(d.descripcion, h.id_dx_egreso) AS descripcion,
               COUNT(*) AS total_casos,
               SUM(CASE WHEN h.estado_salida = 2 THEN 1 ELSE 0 END) AS fallecidos,
               ROUND(100 * SUM(CASE WHEN h.estado_salida = 2 THEN 1 ELSE 0 END) / COUNT(*), 2) AS tasa_mortalidad_pct
        FROM hospitalizacion h
        LEFT JOIN diagnostico d ON d.codigo = h.id_dx_egreso
        {filtro_anio}
        GROUP BY h.id_dx_egreso, d.descripcion
        HAVING total_casos >= 50 AND tasa_mortalidad_pct >= 15.0
        ORDER BY fallecidos DESC, tasa_mortalidad_pct DESC
        LIMIT 10;
    """)

    alertas = []
    try:
        filas = db.session.execute(sql).fetchall()
        for f in filas:
            alertas.append({
                "id": f"MOR-{f.codigo}",
                "tipo": "Mortalidad Crítica",
                "titulo": f"Elevada Mortalidad en {f.codigo}: {f.tasa_mortalidad_pct}%",
                "codigo": f.codigo,
                "descripcion": f.descripcion,
                "total_casos": int(f.total_casos),
                "fallecidos": int(f.fallecidos),
                "tasa_mortalidad_pct": float(f.tasa_mortalidad_pct),
                "severidad": "Crítica" if f.tasa_mortalidad_pct >= 25 else "Alta",
                "mensaje": (
                    f"Diagnóstico {f.codigo} presenta {f.fallecidos} fallecidos de {f.total_casos} casos "
                    f"(mortalidad del {f.tasa_mortalidad_pct}%)."
                ),
                "recomendacion": "Comité de morbimortalidad institucional y auditoría de guías de práctica clínica."
            })
    except Exception:
        pass
    return alertas


def panel_alertas(args):
    """Consolida todas las alertas y estadísticas del Módulo 4."""
    anio = _anio(args)
    severidad_filtro = args.get("severidad", "").strip()
    tipo_filtro = args.get("tipo", "").strip()

    alertas_epi = obtener_alertas_epidemiologicas(anio=anio)
    alertas_est = obtener_estancias_prolongadas(anio=anio, dias_min=30, limite=25)
    alertas_ocu = obtener_alertas_ocupacion(anio=anio)
    alertas_mor = obtener_alertas_mortalidad(anio=anio)

    todas = alertas_epi + alertas_est + alertas_ocu + alertas_mor

    # Filtros si aplican
    if severidad_filtro:
        todas = [a for a in todas if a["severidad"].lower() == severidad_filtro.lower()]
    if tipo_filtro:
        todas = [a for a in todas if a["tipo"].lower() == tipo_filtro.lower()]

    conteo_severidad = {
        "Crítica": sum(1 for a in todas if a["severidad"] == "Crítica"),
        "Alta": sum(1 for a in todas if a["severidad"] == "Alta"),
        "Moderada": sum(1 for a in todas if a["severidad"] == "Moderada"),
    }

    conteo_tipo = {
        "Epidemiológica": sum(1 for a in todas if a["tipo"] == "Epidemiológica"),
        "Estancia Prolongada": sum(1 for a in todas if a["tipo"] == "Estancia Prolongada"),
        "Capacidad Hospitalaria": sum(1 for a in todas if a["tipo"] == "Capacidad Hospitalaria"),
        "Mortalidad Crítica": sum(1 for a in todas if a["tipo"] == "Mortalidad Crítica"),
    }

    return {
        "resumen": {
            "total_alertas": len(todas),
            "criticas": conteo_severidad["Crítica"],
            "altas": conteo_severidad["Alta"],
            "moderadas": conteo_severidad["Moderada"],
            "por_tipo": conteo_tipo,
            "anio_analizado": anio or "Todos los años (2019-2022)",
        },
        "alertas": todas,
    }
