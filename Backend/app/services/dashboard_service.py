"""Panel inteligente: indicadores y series ya agregadas para las gráficas.
Todo se calcula en la base de datos (GROUP BY); el frontend solo dibuja.
"""
from sqlalchemy import case, func

from app.extensions import db
from app.models import Diagnostico, Hospitalizacion as H, ViaIngreso
from app.utils.errors import ApiError
from app.utils.cache import cacheado

GRUPOS_EDAD = [  # (etiqueta, edad mínima, edad máxima exclusiva)
    ("< 1", 0, 1), ("1-14", 1, 15), ("15-29", 15, 30), ("30-44", 30, 45),
    ("45-59", 45, 60), ("60-74", 60, 75), ("75+", 75, 500),
]


def _anio(args):
    valor = args.get("anio", "").strip()
    if not valor or valor.lower() == "todos":
        return None
    if not valor.isdigit():
        raise ApiError("'anio' debe ser un número (por ejemplo 2022) o 'todos'.", 400)
    return int(valor)


def _filtrar(consulta, f):
    """f = {"anio": int|None, "municipio": str|None, "eps": str|None}"""
    if f.get("anio"):
        consulta = consulta.filter(H.anio == f["anio"])
    if f.get("municipio"):
        consulta = consulta.filter(H.id_municipio == f["municipio"])
    if f.get("eps"):
        consulta = consulta.filter(H.id_eps == f["eps"])
    return consulta


def _pct(parte, total):
    return round(100 * parte / total, 2) if total else 0.0


def _indicadores(anio):
    fila = _filtrar(
        db.session.query(
            func.count(H.id_hospitalizacion),
            func.avg(H.dias_estancia),
            func.sum(case((H.estado_salida == 1, 1), else_=0)),
            func.sum(case((H.estado_salida == 2, 1), else_=0)),
        ),
        anio,
    ).one()
    total = fila[0] or 0
    return {
        "hospitalizaciones": total,
        "estancia_promedio": round(float(fila[1] or 0), 2),
        "tasa_egreso": _pct(int(fila[2] or 0), total),
        "mortalidad": _pct(int(fila[3] or 0), total),
        "fallecidos": int(fila[3] or 0),
    }


def _variacion(actual, anterior):
    """Diferencia entre dos periodos: porcentual para conteos, en puntos para tasas."""
    return {
        "hospitalizaciones_pct": round(100 * (actual["hospitalizaciones"] - anterior["hospitalizaciones"])
                                       / anterior["hospitalizaciones"], 1) if anterior["hospitalizaciones"] else None,
        "estancia_promedio": round(actual["estancia_promedio"] - anterior["estancia_promedio"], 2),
        "tasa_egreso": round(actual["tasa_egreso"] - anterior["tasa_egreso"], 2),
        "mortalidad": round(actual["mortalidad"] - anterior["mortalidad"], 2),
    }


def _mensual(anio):
    """Hospitalizaciones por mes de ingreso, una serie por año (12 posiciones, enero = 0)."""
    filas = _filtrar(
        db.session.query(H.anio, func.month(H.fecha_ingreso), func.count()), anio
    ).group_by(H.anio, func.month(H.fecha_ingreso)).order_by(H.anio).all()
    series = {}
    for a, mes, n in filas:
        series.setdefault(a, [0] * 12)[mes - 1] = n
    return [{"anio": a, "meses": m} for a, m in sorted(series.items())]


def _diagnosticos(anio, tipo, limite, total):
    col = H.id_dx_ingreso if tipo == "ingreso" else H.id_dx_egreso
    casos = func.count().label("casos")
    filas = _filtrar(
        db.session.query(col, Diagnostico.descripcion, Diagnostico.grupo_cie10,
                         casos, func.avg(H.dias_estancia))
        .select_from(H).join(Diagnostico, Diagnostico.codigo == col),
        anio,
    ).group_by(col, Diagnostico.descripcion, Diagnostico.grupo_cie10) \
     .order_by(casos.desc()).limit(limite).all()
    return [{
        "codigo": c, "descripcion": d, "grupo": g, "casos": n,
        "porcentaje": _pct(n, total), "estancia_promedio": round(float(e or 0), 1),
    } for c, d, g, n, e in filas]


def _edad_sexo(anio):
    grupo = case(*[(db.and_(H.edad_anios >= lo, H.edad_anios < hi), i)
                   for i, (_, lo, hi) in enumerate(GRUPOS_EDAD)], else_=len(GRUPOS_EDAD) - 1)
    filas = _filtrar(
        db.session.query(
            grupo,
            func.sum(case((H.sexo == "F", 1), else_=0)),
            func.sum(case((H.sexo == "M", 1), else_=0)),
        ), anio,
    ).group_by(grupo).all()
    por_indice = {i: (int(m or 0), int(h or 0)) for i, m, h in filas}
    return [{"grupo": et, "mujeres": por_indice.get(i, (0, 0))[0], "hombres": por_indice.get(i, (0, 0))[1]}
            for i, (et, _, _) in enumerate(GRUPOS_EDAD)]


def _vias_ingreso(anio):
    filas = _filtrar(
        db.session.query(ViaIngreso.nombre, func.count())
        .select_from(H).join(ViaIngreso, ViaIngreso.id_via == H.via_ingreso), anio,
    ).group_by(ViaIngreso.nombre).order_by(func.count().desc()).all()
    return [{"via": v, "casos": n} for v, n in filas]


@cacheado()
def panel(args):
    anio = _anio(args)
    tipo = "ingreso" if args.get("dx") == "ingreso" else "egreso"

    anios = [a for (a,) in db.session.query(H.anio).distinct().order_by(H.anio).all()]
    if anio and anio not in anios:
        raise ApiError(f"No hay datos para el año {anio}.", 404, {"anios_disponibles": anios})

    f = {"anio": anio,
         "municipio": args.get("municipio", "").strip() or None,
         "eps": args.get("eps", "").strip() or None}
    kpis = _indicadores(f)
    variacion = None
    if anio and (anio - 1) in anios:
        variacion = _variacion(kpis, _indicadores({**f, "anio": anio - 1}))

    return {
        "filtros": {"anio": anio, "dx": tipo, "municipio": f["municipio"], "eps": f["eps"],
                    "anios_disponibles": anios},
        "indicadores": kpis,
        "variacion_vs_anio_anterior": variacion,
        "mensual": _mensual(f),
        "diagnosticos": _diagnosticos(f, tipo, 10, kpis["hospitalizaciones"]),
        "edad_sexo": _edad_sexo(f),
        "vias_ingreso": _vias_ingreso(f),
    }
