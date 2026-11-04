import secrets
import string
from datetime import datetime
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models.usuario import Usuario, Rol
from app.utils.errors import ApiError


def generar_clave_temporal(longitud=10):
    """Genera una contraseña temporal segura de uso único."""
    alfabeto = string.ascii_letters + string.digits + "!@#$%"
    return "HV-" + "".join(secrets.choice(alfabeto) for _ in range(longitud))


def listar_usuarios():
    """Retorna la lista de todos los usuarios registrados sin exponer el hash de contraseña."""
    usuarios = Usuario.query.order_by(Usuario.id_usuario.asc()).all()
    return [u.to_dict_publico() for u in usuarios]


def obtener_usuario_por_id(id_usuario):
    usuario = Usuario.query.get(id_usuario)
    if usuario is None:
        raise ApiError(f"No existe un usuario con id {id_usuario}.", 404)
    return usuario


def crear_usuario(datos):
    """
    Crea un nuevo usuario en la plataforma.
    El sistema genera una contraseña temporal de uso único y marca debe_cambiar_clave=True.
    """
    if not isinstance(datos, dict):
        raise ApiError("El cuerpo de la petición debe ser un objeto JSON.", 400)

    nombre = str(datos.get("nombre") or "").strip()
    correo = str(datos.get("correo") or "").strip().lower()
    nombre_rol = str(datos.get("rol") or "").strip()

    if not nombre:
        raise ApiError("El nombre completo es obligatorio.", 400)
    if not correo or "@" not in correo:
        raise ApiError("Debes ingresar un correo electrónico válido.", 400)
    if not nombre_rol:
        raise ApiError("El rol es obligatorio.", 400)

    # Validar rol en base de datos
    rol = Rol.query.filter_by(nombre=nombre_rol).first()
    if rol is None:
        roles_validos = [r.nombre for r in Rol.query.all()] or ["Administrador", "Analista", "Investigador", "Médico"]
        raise ApiError(f"Rol inválido '{nombre_rol}'. Roles disponibles: {', '.join(roles_validos)}", 400)

    # Validar correo único
    existente = Usuario.query.filter_by(correo=correo).first()
    if existente is not None:
        raise ApiError("Ya existe un usuario registrado con este correo electrónico.", 409)

    clave_temporal = generar_clave_temporal()
    hash_clave = generate_password_hash(clave_temporal)

    nuevo_usuario = Usuario(
        nombre=nombre,
        correo=correo,
        password_hash=hash_clave,
        id_rol=rol.id_rol,
        activo=True,
        debe_cambiar_clave=True,
        fecha_creacion=datetime.utcnow(),
        ultimo_acceso=None
    )

    db.session.add(nuevo_usuario)
    db.session.commit()

    return {
        "usuario": nuevo_usuario.to_dict_publico(),
        "contrasena_temporal": clave_temporal,
        "mensaje": "Usuario creado exitosamente. La contraseña temporal se muestra una sola vez."
    }


def cambiar_rol(id_usuario, nuevo_rol_nombre):
    """Actualiza el rol de un usuario."""
    usuario = obtener_usuario_por_id(id_usuario)

    rol = Rol.query.filter_by(nombre=nuevo_rol_nombre).first()
    if rol is None:
        raise ApiError(f"El rol '{nuevo_rol_nombre}' no existe en el sistema.", 400)

    usuario.id_rol = rol.id_rol
    db.session.commit()

    return usuario.to_dict_publico()


def cambiar_estado(id_usuario, activo):
    """Activa o desactiva la cuenta de un usuario."""
    usuario = obtener_usuario_por_id(id_usuario)
    usuario.activo = bool(activo)
    db.session.commit()

    return usuario.to_dict_publico()


def reiniciar_clave(id_usuario):
    """
    Genera una nueva contraseña temporal para el usuario y marca
    debe_cambiar_clave=True.
    """
    usuario = obtener_usuario_por_id(id_usuario)

    clave_temporal = generar_clave_temporal()
    usuario.password_hash = generate_password_hash(clave_temporal)
    usuario.debe_cambiar_clave = True
    db.session.commit()

    return {
        "id_usuario": usuario.id_usuario,
        "nombre": usuario.nombre,
        "correo": usuario.correo,
        "contrasena_temporal": clave_temporal,
        "mensaje": "Contraseña restablecida exitosamente."
    }
