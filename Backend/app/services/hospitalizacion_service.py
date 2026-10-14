"""Capa de servicio: validaciones y reglas de negocio de Hospitalizacion.
Las rutas (HTTP) solo llaman a estas funciones; aquí no se usa `request`.
"""
from datetime import date, time

from flask import current_app

from app.extensions import db
from app.models import Hospitalizacion
from app.utils.errors import ApiError

OBLIGATORIOS = [
    "id_prestador", "id_eps", "via_ingreso", "causa_externa", "tipo_usuario",
    "fecha_ingreso", "fecha_egreso", "estado_salida", "id_dx_ingreso",
    "id_dx_egreso", "sexo", "edad_valor", "unidad_edad", "zona_residencia",
]
OPCIONALES = ["numero_factura", "id_municipio", "hora_ingreso"]
PERMITIDOS = set(OBLIGATORIOS + OPCIONALES)

CAMPOS_TEXTO = {  # campo: longitud máxima
    "numero_factura": 25, "id_prestador": 12, "id_eps": 12, "id_municipio": 5,
    "id_dx_ingreso": 10, "id_dx_egreso": 10,
}
CAMPOS_ENTERO = ["via_ingreso", "causa_externa", "tipo_usuario", "edad_valor",
                 "estado_salida", "unidad_edad"]
VALORES_VALIDOS = {
    "estado_salida": (1, 2),
    "unidad_edad": (1, 2, 3),
    "sexo": ("F", "M"),
    "zona_residencia": ("U", "R"),
}

FILTROS_IGUALDAD = {  # parámetro de la URL -> columna
    "anio": "anio", "id_prestador": "id_prestador", "id_eps": "id_eps",
    "id_municipio": "id_municipio", "sexo": "sexo",
    "dx_egreso": "id_dx_egreso", "dx_ingreso": "id_dx_ingreso",
}


def _fecha(valor, campo):
    try:
        return date.fromisoformat(str(valor))
    except ValueError:
        raise ApiError(f"'{campo}' debe tener formato YYYY-MM-DD.", 400)


def validar(datos, parcial=False):
    """Valida y limpia el JSON recibido. Con parcial=True (PATCH) no exige todos los campos."""
    if not isinstance(datos, dict):
        raise ApiError("El cuerpo de la petición debe ser un objeto JSON.", 400)

    desconocidos = set(datos) - PERMITIDOS
    if desconocidos:
        raise ApiError("Campos no permitidos.", 400, {"campos": sorted(desconocidos)})

    if not parcial:
        faltantes = [c for c in OBLIGATORIOS if datos.get(c) in (None, "")]
        if faltantes:
            raise ApiError("Faltan campos obligatorios.", 400, {"campos": faltantes})

    limpio = {}
    for campo, valor in datos.items():
        if valor in (None, "") and campo in OPCIONALES:
            limpio[campo] = None
            continue
        if valor in (None, ""):
            raise ApiError(f"'{campo}' no puede estar vacío.", 400)

        if campo in CAMPOS_TEXTO:
            texto = str(valor).strip()
            if len(texto) > CAMPOS_TEXTO[campo]:
                raise ApiError(f"'{campo}' excede {CAMPOS_TEXTO[campo]} caracteres.", 400)
            limpio[campo] = texto
        elif campo in CAMPOS_ENTERO:
            if isinstance(valor, bool) or not isinstance(valor, int) or valor < 0:
                raise ApiError(f"'{campo}' debe ser un entero positivo.", 400)
            limpio[campo] = valor
        elif campo in ("fecha_ingreso", "fecha_egreso"):
            limpio[campo] = _fecha(valor, campo)
        elif campo == "hora_ingreso":
            try:
                limpio[campo] = time.fromisoformat(str(valor))
            except ValueError:
                raise ApiError("'hora_ingreso' debe tener formato HH:MM[:SS].", 400)
        else:  # sexo, zona_residencia
            limpio[campo] = str(valor).strip().upper()

    for campo, validos in VALORES_VALIDOS.items():
        if campo in limpio and limpio[campo] not in validos:
            raise ApiError(f"'{campo}' debe ser uno de {list(validos)}.", 400)

    return limpio


def _validar_fechas(h):
    if h.fecha_egreso < h.fecha_ingreso:
        raise ApiError("'fecha_egreso' no puede ser anterior a 'fecha_ingreso'.", 400)
    h.anio = h.fecha_ingreso.year


def listar(args):
    consulta = Hospitalizacion.query

    for param, columna in FILTROS_IGUALDAD.items():
        if args.get(param):
            consulta = consulta.filter(getattr(Hospitalizacion, columna) == args[param])
    if args.get("desde"):
        consulta = consulta.filter(Hospitalizacion.fecha_ingreso >= _fecha(args["desde"], "desde"))
    if args.get("hasta"):
        consulta = consulta.filter(Hospitalizacion.fecha_ingreso <= _fecha(args["hasta"], "hasta"))

    try:
        pagina = max(int(args.get("page", 1)), 1)
        por_pagina = int(args.get("per_page", 20))
    except ValueError:
        raise ApiError("'page' y 'per_page' deben ser enteros.", 400)
    por_pagina = min(max(por_pagina, 1), current_app.config["MAX_PER_PAGE"])  # la tabla tiene ~830 mil filas

    p = consulta.order_by(Hospitalizacion.id_hospitalizacion).paginate(
        page=pagina, per_page=por_pagina, error_out=False)
    return {
        "datos": [h.to_dict() for h in p.items],
        "paginacion": {"pagina": p.page, "por_pagina": p.per_page,
                       "total": p.total, "paginas": p.pages},
    }


def obtener(id_):
    h = db.session.get(Hospitalizacion, id_)
    if h is None:
        raise ApiError("Hospitalización no encontrada.", 404)
    return h


def crear(datos):
    h = Hospitalizacion(**validar(datos))
    _validar_fechas(h)
    db.session.add(h)
    db.session.commit()
    db.session.refresh(h)  # recarga las columnas generadas (dias_estancia, edad_anios)
    return h


def actualizar(id_, datos, parcial):
    h = obtener(id_)
    for campo, valor in validar(datos, parcial=parcial).items():
        setattr(h, campo, valor)
    if parcial is False:  # PUT: los opcionales omitidos quedan en NULL
        for campo in OPCIONALES:
            if campo not in datos:
                setattr(h, campo, None)
    _validar_fechas(h)
    db.session.commit()
    db.session.refresh(h)
    return h


def eliminar(id_):
    h = obtener(id_)
    db.session.delete(h)
    db.session.commit()
