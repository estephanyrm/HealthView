"""Tablas de referencia (catálogos). Reflejan db/scripts/crear_base_datos.sql."""
from app.extensions import db

from .base import SerializableMixin


class Departamento(db.Model, SerializableMixin):
    __tablename__ = "departamento"
    cod_depto = db.Column(db.CHAR(2), primary_key=True)
    nombre = db.Column(db.String(60))


class Municipio(db.Model, SerializableMixin):
    __tablename__ = "municipio"
    id_municipio = db.Column(db.CHAR(5), primary_key=True)
    cod_depto = db.Column(db.CHAR(2), db.ForeignKey("departamento.cod_depto"), nullable=False)
    cod_municipio = db.Column(db.CHAR(3), nullable=False)
    nombre = db.Column(db.String(80))


class Eps(db.Model, SerializableMixin):
    __tablename__ = "eps"
    id_eps = db.Column(db.String(12), primary_key=True)
    nombre = db.Column(db.String(120))


class Prestador(db.Model, SerializableMixin):
    __tablename__ = "prestador"
    id_prestador = db.Column(db.CHAR(12), primary_key=True)
    nombre = db.Column(db.String(150))
    id_municipio = db.Column(db.CHAR(5), db.ForeignKey("municipio.id_municipio"), nullable=False)


class Diagnostico(db.Model, SerializableMixin):
    __tablename__ = "diagnostico"
    codigo = db.Column(db.String(10), primary_key=True)
    descripcion = db.Column(db.String(255))
    grupo_cie10 = db.Column(db.CHAR(1), nullable=False)


class ViaIngreso(db.Model, SerializableMixin):
    __tablename__ = "via_ingreso"
    id_via = db.Column(db.SmallInteger, primary_key=True, autoincrement=False)
    nombre = db.Column(db.String(60), nullable=False)


class CausaExterna(db.Model, SerializableMixin):
    __tablename__ = "causa_externa"
    id_causa = db.Column(db.SmallInteger, primary_key=True, autoincrement=False)
    nombre = db.Column(db.String(60), nullable=False)


class TipoUsuario(db.Model, SerializableMixin):
    __tablename__ = "tipo_usuario"
    id_tipo_usuario = db.Column(db.SmallInteger, primary_key=True, autoincrement=False)
    nombre = db.Column(db.String(80), nullable=False)
