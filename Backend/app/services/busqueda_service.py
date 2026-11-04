"""Servicio de Búsqueda y Filtros Avanzados (Módulo 5).
Permite filtrado multi-criterio sobre hospitalizaciones, diagnósticos primarios
y secundarios, prestadores, EPS, municipios y variables demográficas.
Respeta 100% las convenciones de nombres de la base de datos preexistente.
"""
from datetime import date
from sqlalchemy import func, or_

from app.extensions import db
from app.models import (
    CausaExterna, Departamento, Diagnostico, Eps,
    Hospitalizacion as H, HospitalizacionDiagnostico as HD,
    Municipio, Prestador, TipoUsuario, ViaIngreso,
)
from app.utils.errors import ApiError


def _parse_fecha(valor, campo):
    if not valor:
        return None
    try:
        return date.fromisoformat(str(valor).strip())
    except ValueError:
        raise ApiError(f"'{campo}' debe tener formato YYYY-MM-DD.", 400)


def buscar(args):
    """Ejecuta búsqueda avanzada con paginación, métricas y filtros combinados."""
    # Presets clínicos
    preset = args.get("preset", "").strip()

    query = db.session.query(
        H.id_hospitalizacion,
        H.numero_factura,
        H.fecha_ingreso,
        H.fecha_egreso,
        H.dias_estancia,
        H.sexo,
        H.edad_anios,
        H.edad_valor,
        H.unidad_edad,
        H.zona_residencia,
        H.estado_salida,
        H.anio,
        H.id_dx_ingreso,
        H.id_dx_egreso,
        Diagnostico.descripcion.label("dx_egreso_desc"),
        Diagnostico.grupo_cie10.label("dx_grupo"),
        H.id_prestador,
        Prestador.nombre.label("prestador_nombre"),
        H.id_eps,
        Eps.nombre.label("eps_nombre"),
        H.id_municipio,
        Municipio.nombre.label("municipio_nombre"),
        ViaIngreso.nombre.label("via_ingreso_nombre"),
        CausaExterna.nombre.label("causa_externa_nombre"),
        TipoUsuario.nombre.label("tipo_usuario_nombre"),
    ).select_from(H)\
     .outerjoin(Diagnostico, Diagnostico.codigo == H.id_dx_egreso)\
     .outerjoin(Prestador, Prestador.id_prestador == H.id_prestador)\
     .outerjoin(Eps, Eps.id_eps == H.id_eps)\
     .outerjoin(Municipio, Municipio.id_municipio == H.id_municipio)\
     .outerjoin(ViaIngreso, ViaIngreso.id_via == H.via_ingreso)\
     .outerjoin(CausaExterna, CausaExterna.id_causa == H.causa_externa)\
     .outerjoin(TipoUsuario, TipoUsuario.id_tipo_usuario == H.tipo_usuario)

    # 1. Filtro Diagnóstico CIE-10 (Código o texto)
    dx = args.get("dx", "").strip()
    if dx:
        query = query.filter(
            or_(
                H.id_dx_egreso.like(f"{dx}%"),
                H.id_dx_ingreso.like(f"{dx}%"),
                Diagnostico.descripcion.like(f"%{dx}%")
            )
        )

    # 2. Diagnóstico adicional / tabla puente
    dx_adicional = args.get("dx_adicional", "").strip()
    tipo_dx_adicional = args.get("tipo_dx_adicional", "").strip()
    if dx_adicional or tipo_dx_adicional:
        subquery = db.session.query(HD.id_hospitalizacion)
        if dx_adicional:
            subquery = subquery.filter(HD.codigo.like(f"{dx_adicional}%"))
        if tipo_dx_adicional:
            subquery = subquery.filter(HD.tipo == tipo_dx_adicional)
        query = query.filter(H.id_hospitalizacion.in_(subquery))

    # 3. Demografía: Sexo, Edad, Zona
    sexo = args.get("sexo", "").strip().upper()
    if sexo in ("F", "M"):
        query = query.filter(H.sexo == sexo)

    edad_min = args.get("edad_min")
    if edad_min and edad_min.isdigit():
        query = query.filter(H.edad_anios >= int(edad_min))

    edad_max = args.get("edad_max")
    if edad_max and edad_max.isdigit():
        query = query.filter(H.edad_anios <= int(edad_max))

    grupo_edad = args.get("grupo_edad", "").strip()
    if grupo_edad == "<1":
        query = query.filter(H.edad_anios < 1)
    elif grupo_edad == "1-14":
        query = query.filter(H.edad_anios.between(1, 14))
    elif grupo_edad == "15-29":
        query = query.filter(H.edad_anios.between(15, 29))
    elif grupo_edad == "30-44":
        query = query.filter(H.edad_anios.between(30, 44))
    elif grupo_edad == "45-59":
        query = query.filter(H.edad_anios.between(45, 59))
    elif grupo_edad == "60-74":
        query = query.filter(H.edad_anios.between(60, 74))
    elif grupo_edad == "75+":
        query = query.filter(H.edad_anios >= 75)

    zona = args.get("zona", "").strip().upper()
    if zona in ("U", "R"):
        query = query.filter(H.zona_residencia == zona)

    # 4. Entidades: Prestador, EPS, Municipio
    prestador = args.get("id_prestador", "").strip()
    if prestador:
        query = query.filter(H.id_prestador == prestador)

    eps = args.get("id_eps", "").strip()
    if eps:
        query = query.filter(H.id_eps == eps)

    municipio = args.get("id_municipio", "").strip()
    if municipio:
        query = query.filter(H.id_municipio == municipio)

    # 5. Parámetros clínicos y administrativos
    via_ingreso = args.get("via_ingreso")
    if via_ingreso and via_ingreso.isdigit():
        query = query.filter(H.via_ingreso == int(via_ingreso))

    causa_externa = args.get("causa_externa")
    if causa_externa and causa_externa.isdigit():
        query = query.filter(H.causa_externa == int(causa_externa))

    tipo_usuario = args.get("tipo_usuario")
    if tipo_usuario and tipo_usuario.isdigit():
        query = query.filter(H.tipo_usuario == int(tipo_usuario))

    estado_salida = args.get("estado_salida")
    if estado_salida in ("1", "2"):
        query = query.filter(H.estado_salida == int(estado_salida))

    # 6. Rango de Fechas y Años
    anio = args.get("anio", "").strip()
    if anio and anio.isdigit():
        query = query.filter(H.anio == int(anio))

    desde = _parse_fecha(args.get("desde"), "desde")
    if desde:
        query = query.filter(H.fecha_ingreso >= desde)

    hasta = _parse_fecha(args.get("hasta"), "hasta")
    if hasta:
        query = query.filter(H.fecha_ingreso <= hasta)

    # 7. Estancia
    estancia_min = args.get("estancia_min")
    if estancia_min and estancia_min.isdigit():
        query = query.filter(H.dias_estancia >= int(estancia_min))

    estancia_max = args.get("estancia_max")
    if estancia_max and estancia_max.isdigit():
        query = query.filter(H.dias_estancia <= int(estancia_max))

    # 8. Presets Clínicos
    if preset == "mujeres_60_epoc":
        query = query.filter(
            H.id_dx_egreso.like("J44%"),
            H.sexo == "F",
            H.edad_anios >= 60,
        )
    elif preset == "covid19_estancia_larga":
        query = query.filter(
            H.id_dx_egreso == "U071",
            H.dias_estancia >= 14,
        )
    elif preset == "pediatria_urgente":
        query = query.filter(
            H.edad_anios < 5,
            H.via_ingreso == 1,
        )
    elif preset == "fallecidos_criticos":
        query = query.filter(H.estado_salida == 2)
    elif preset == "rural_remitido":
        query = query.filter(H.zona_residencia == "R", H.via_ingreso == 3)

    # Ordenamiento
    ordenar_por = args.get("ordenar_por", "fecha_ingreso")
    orden = args.get("orden", "desc").lower()

    mapeo_columnas = {
        "fecha_ingreso": H.fecha_ingreso,
        "dias_estancia": H.dias_estancia,
        "edad_anios": H.edad_anios,
        "id_hospitalizacion": H.id_hospitalizacion,
        "id_dx_egreso": H.id_dx_egreso,
    }
    col_orden = mapeo_columnas.get(ordenar_por, H.fecha_ingreso)
    query = query.order_by(col_orden.desc() if orden == "desc" else col_orden.asc())

    # Paginación
    try:
        pagina = max(int(args.get("page", 1)), 1)
        por_pagina = min(max(int(args.get("per_page", 25)), 1), 100)
    except ValueError:
        raise ApiError("'page' y 'per_page' deben ser enteros válidos.", 400)

    # Métricas y conteos agregados
    total = query.count()

    p = query.paginate(page=pagina, per_page=por_pagina, error_out=False)

    registros = []
    for r in p.items:
        registros.append({
            "id_hospitalizacion": r.id_hospitalizacion,
            "numero_factura": r.numero_factura,
            "fecha_ingreso": str(r.fecha_ingreso),
            "fecha_egreso": str(r.fecha_egreso),
            "dias_estancia": int(r.dias_estancia or 0),
            "sexo": r.sexo,
            "edad_anios": int(r.edad_anios or 0),
            "zona_residencia": "Urbana" if r.zona_residencia == "U" else "Rural",
            "estado_salida": "Vivo" if r.estado_salida == 1 else "Fallecido",
            "estado_salida_codigo": r.estado_salida,
            "id_dx_ingreso": r.id_dx_ingreso,
            "id_dx_egreso": r.id_dx_egreso,
            "dx_egreso_desc": r.dx_egreso_desc or r.id_dx_egreso,
            "dx_grupo": r.dx_grupo,
            "id_prestador": r.id_prestador,
            "prestador_nombre": r.prestador_nombre or r.id_prestador,
            "id_eps": r.id_eps,
            "eps_nombre": r.eps_nombre or r.id_eps,
            "id_municipio": r.id_municipio,
            "municipio_nombre": r.municipio_nombre or r.id_municipio,
            "via_ingreso": r.via_ingreso_nombre or str(r.id_hospitalizacion),
            "causa_externa": r.causa_externa_nombre or "Enfermedad general",
            "tipo_usuario": r.tipo_usuario_nombre or "Contributivo",
            "anio": r.anio,
        })

    # Resumen rápido del subconjunto (en la página actual o muestra)
    estancia_prom = 0.0
    fallecidos = 0
    mujeres = 0
    if registros:
        estancia_prom = round(sum(r["dias_estancia"] for r in registros) / len(registros), 1)
        fallecidos = sum(1 for r in registros if r["estado_salida_codigo"] == 2)
        mujeres = sum(1 for r in registros if r["sexo"] == "F")

    tasa_mortalidad = round((fallecidos / len(registros)) * 100, 1) if registros else 0.0
    pct_mujeres = round((mujeres / len(registros)) * 100, 1) if registros else 0.0

    return {
        "datos": registros,
        "paginacion": {
            "pagina": p.page,
            "por_pagina": p.per_page,
            "total": total,
            "paginas": p.pages,
        },
        "estadisticas_segmento": {
            "total_coincidencias": total,
            "estancia_promedio": estancia_prom,
            "tasa_mortalidad_pct": tasa_mortalidad,
            "fallecidos_muestra": fallecidos,
            "pct_mujeres": pct_mujeres,
            "pct_hombres": round(100 - pct_mujeres, 1) if registros else 0.0,
        },
        "filtros_aplicados": {k: v for k, v in args.items() if v},
    }
