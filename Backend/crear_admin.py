import getpass

from sqlalchemy import text
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db

app = create_app()

with app.app_context():
    ya_hay = db.session.execute(text(
        "SELECT COUNT(*) FROM usuario u JOIN rol r ON r.id_rol = u.id_rol "
        "WHERE r.nombre = 'Administrador'"
    )).scalar()
    if ya_hay:
        raise SystemExit("Ya existe un Administrador. No se creó nada.")

    nombre = input("Nombre completo: ").strip()
    correo = input("Correo: ").strip().lower()
    clave = getpass.getpass("Contraseña (mínimo 8 caracteres): ")
    if not nombre or not correo or len(clave) < 8:
        raise SystemExit("Datos incompletos o contraseña muy corta.")

    db.session.execute(text(
        "INSERT INTO usuario (nombre, correo, password_hash, id_rol, activo, debe_cambiar_clave) "
        "SELECT :n, :c, :h, id_rol, 1, 0 FROM rol WHERE nombre = 'Administrador'"
    ), {"n": nombre, "c": correo, "h": generate_password_hash(clave)})
    db.session.commit()
    print("Administrador creado.")