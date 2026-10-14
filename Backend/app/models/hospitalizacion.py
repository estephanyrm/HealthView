from app.extensions import db

from .base import SerializableMixin


class Hospitalizacion(db.Model, SerializableMixin):
    """1 fila = 1 factura de una atención hospitalaria."""

    __tablename__ = "hospitalizacion"

    id_hospitalizacion = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    numero_factura = db.Column(db.String(25))
    id_prestador = db.Column(db.CHAR(12), db.ForeignKey("prestador.id_prestador"), nullable=False)
    id_eps = db.Column(db.String(12), db.ForeignKey("eps.id_eps"), nullable=False)
    id_municipio = db.Column(db.CHAR(5), db.ForeignKey("municipio.id_municipio"))
    via_ingreso = db.Column(db.SmallInteger, db.ForeignKey("via_ingreso.id_via"), nullable=False)
    causa_externa = db.Column(db.SmallInteger, db.ForeignKey("causa_externa.id_causa"), nullable=False)
    tipo_usuario = db.Column(db.SmallInteger, db.ForeignKey("tipo_usuario.id_tipo_usuario"), nullable=False)
    fecha_ingreso = db.Column(db.Date, nullable=False)
    hora_ingreso = db.Column(db.Time)
    fecha_egreso = db.Column(db.Date, nullable=False)
    # Columnas generadas por MySQL: se leen, nunca se escriben
    dias_estancia = db.Column(db.Integer, db.Computed("DATEDIFF(fecha_egreso, fecha_ingreso)", persisted=True))
    estado_salida = db.Column(db.SmallInteger, nullable=False)  # 1 = vivo, 2 = muerto
    id_dx_ingreso = db.Column(db.String(10), db.ForeignKey("diagnostico.codigo"), nullable=False)
    id_dx_egreso = db.Column(db.String(10), db.ForeignKey("diagnostico.codigo"), nullable=False)
    sexo = db.Column(db.CHAR(1), nullable=False)
    edad_valor = db.Column(db.SmallInteger, nullable=False)
    unidad_edad = db.Column(db.SmallInteger, nullable=False)  # 1 años, 2 meses, 3 días
    edad_anios = db.Column(
        db.SmallInteger,
        db.Computed(
            "CASE unidad_edad WHEN 1 THEN edad_valor "
            "WHEN 2 THEN FLOOR(edad_valor / 12) ELSE FLOOR(edad_valor / 365) END",
            persisted=True,
        ),
    )
    zona_residencia = db.Column(db.CHAR(1), nullable=False)  # U / R
    anio = db.Column(db.SmallInteger, nullable=False)

    diagnosticos = db.relationship(
        "HospitalizacionDiagnostico", backref="hospitalizacion",
        cascade="all, delete-orphan", passive_deletes=True,
    )


class HospitalizacionDiagnostico(db.Model, SerializableMixin):
    """Tabla puente N:M: diagnósticos adicionales de cada hospitalización."""

    __tablename__ = "hospitalizacion_diagnostico"

    id_hospitalizacion = db.Column(
        db.BigInteger, db.ForeignKey("hospitalizacion.id_hospitalizacion", ondelete="CASCADE"),
        primary_key=True,
    )
    tipo = db.Column(
        db.Enum("RELACIONADO_1", "RELACIONADO_2", "RELACIONADO_3", "COMPLICACION", "CAUSA_MUERTE"),
        primary_key=True,
    )
    codigo = db.Column(db.String(10), db.ForeignKey("diagnostico.codigo"), nullable=False)
