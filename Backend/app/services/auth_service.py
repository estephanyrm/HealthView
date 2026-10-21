from datetime import datetime
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models import Usuario
from app.utils.errors import ApiError


def autenticar_usuario(datos):
    if not isinstance(datos, dict):
        raise ApiError("El cuerpo de la petición debe ser un objeto JSON.", 400)

    correo = str(datos.get("correo") or "").strip().lower()
    contrasena = str(datos.get("contrasena") or "")

    if not correo or not contrasena:
        raise ApiError("Debes ingresar el correo y la contraseña.", 400)

    # Buscar al usuario por correo
    usuario = Usuario.query.filter_by(correo=correo).first()

    # Verificar existencia y comparar el hash con la contraseña enviada
    # Usamos un mensaje genérico por seguridad para no revelar si el correo existe o no
    if usuario is None or not check_password_hash(usuario.password_hash, contrasena):
        raise ApiError("Correo o contraseña incorrectos.", 401)

    # 3. Verificar que la cuenta esté activa
    if not usuario.activo:
        raise ApiError("Tu cuenta está desactivada. Contacta al administrador.", 403)

    # 4. Registrar fecha y hora del acceso
    usuario.ultimo_acceso = datetime.now()
    db.session.commit()

    return usuario