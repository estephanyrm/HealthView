from datetime import datetime
from app.extensions import db
from .base import SerializableMixin


class Rol(db.Model, SerializableMixin):
    __tablename__ = "rol"
    id_rol = db.Column(db.SmallInteger, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(30), nullable=False, unique=True)


class Usuario(db.Model, SerializableMixin):
    __tablename__ = "usuario"

    id_usuario = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(100), nullable=False)
    correo = db.Column(db.String(100), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    id_rol = db.Column(db.SmallInteger, db.ForeignKey("rol.id_rol"), nullable=False)
    activo = db.Column(db.Boolean, nullable=False, default=True)
    fecha_creacion = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    ultimo_acceso = db.Column(db.DateTime, nullable=True)
    debe_cambiar_clave = db.Column(db.Boolean, nullable=False, default=True)

    rol = db.relationship("Rol", backref="usuarios")

    def to_dict_publico(self):
        """Devuelve los datos del usuario NUNCA incluyendo el password_hash."""
        return {
            "id_usuario": self.id_usuario,
            "nombre": self.nombre,
            "correo": self.correo,
            "id_rol": self.id_rol,
            "rol": self.rol.nombre if self.rol else None,
            "activo": bool(self.activo),
            "debe_cambiar_clave": bool(self.debe_cambiar_clave),
            "ultimo_acceso": self.ultimo_acceso.isoformat() if self.ultimo_acceso else None,
        }