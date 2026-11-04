"""Mapa epidemiológico (módulo 3): hospitalizaciones por municipio y departamento de residencia.
GET /api/mapa?anio=2022            -> todas las regiones con casos
GET /api/mapa/<id_municipio>?anio= -> detalle de un municipio (para comparar regiones)
"""
from sqlalchemy import case, func

from app.extensions import db
from app.models import Departamento, Hospitalizacion as H, Municipio
from app.services import dashboard_service as dash
from app.utils.errors import ApiError
from app.utils.cache import cacheado


def _fila(n, estancia, muertos):
    return {"hospitalizaciones": int(n), "estancia_promedio": round(float(estancia or 0), 2),
            "mortalidad": dash._pct(int(muertos or 0), n)}


@cacheado()
def panel(args):
    anio = dash._anio(args)
    anios = [a for (a,) in db.session.query(H.anio).distinct().order_by(H.anio).all()]
    if anio and anio not in anios:
        raise ApiError(f"No hay datos para el año {anio}.", 404, {"anios_disponibles": anios})
    f = {"anio": anio}

    filas = dash._filtrar(
        db.session.query(
            Municipio.id_municipio, Municipio.nombre, Municipio.cod_depto, Departamento.nombre,
            func.count(), func.avg(H.dias_estancia), func.sum(case((H.estado_salida == 2, 1), else_=0)),
        ).select_from(H)
        .join(Municipio, Municipio.id_municipio == H.id_municipio)
        .join(Departamento, Departamento.cod_depto == Municipio.cod_depto), f,
    ).group_by(Municipio.id_municipio, Municipio.nombre, Municipio.cod_depto, Departamento.nombre).all()

    municipios, deptos = [], {}
    for idm, nombre, cod, dep, n, est, mu in filas:
        municipios.append({"id_municipio": idm, "nombre": nombre, "cod_depto": cod,
                           "departamento": dep, **_fila(n, est, mu)})
        d = deptos.setdefault(cod, {"cod_depto": cod, "nombre": dep, "n": 0, "est": 0.0, "mu": 0})
        d["n"] += n; d["est"] += float(est or 0) * n; d["mu"] += int(mu or 0)
    departamentos = sorted(
        [{"cod_depto": d["cod_depto"], "nombre": d["nombre"], **_fila(d["n"], d["est"] / d["n"], d["mu"])}
         for d in deptos.values()], key=lambda x: -x["hospitalizaciones"])

    sin_municipio = dash._filtrar(db.session.query(func.count()).select_from(H)
                                  .filter(H.id_municipio.is_(None)), f).scalar() or 0
    return {"filtros": {"anio": anio, "anios_disponibles": anios},
            "municipios": sorted(municipios, key=lambda x: -x["hospitalizaciones"]),
            "departamentos": departamentos, "sin_municipio": int(sin_municipio)}


@cacheado()
def detalle(id_municipio, args):
    muni = db.session.get(Municipio, id_municipio)
    if not muni:
        raise ApiError("Municipio no encontrado.", 404)
    f = {"anio": dash._anio(args), "municipio": id_municipio}
    kpis = dash._indicadores(f)
    return {"id_municipio": id_municipio, "nombre": muni.nombre, "indicadores": kpis,
            "diagnosticos": dash._diagnosticos(f, "egreso", 3, kpis["hospitalizaciones"])}
