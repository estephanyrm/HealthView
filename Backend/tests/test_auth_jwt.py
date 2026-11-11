"""Pruebas de seguridad JWT. Ejecutar desde Backend/:  python -m unittest tests.test_auth_jwt -v"""
import unittest
from datetime import timedelta

from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models.usuario import Rol, Usuario
from config import TestingConfig

CLAVE = "Clave-Segura-123"


class AuthJWTTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        with self.app.app_context():
            # Solo las tablas necesarias (el resto del esquema usa columnas propias de MySQL)
            Rol.__table__.create(db.engine)
            Usuario.__table__.create(db.engine)
            admin, analista = Rol(id_rol=1, nombre="Administrador"), Rol(id_rol=2, nombre="Analista")
            db.session.add_all([admin, analista])
            db.session.flush()
            db.session.add_all([
                Usuario(nombre="Ada", correo="admin@hv.co", id_rol=admin.id_rol,
                        password_hash=generate_password_hash(CLAVE), debe_cambiar_clave=False),
                Usuario(nombre="Ana", correo="ana@hv.co", id_rol=analista.id_rol,
                        password_hash=generate_password_hash(CLAVE), debe_cambiar_clave=False),
                Usuario(nombre="Temp", correo="temp@hv.co", id_rol=analista.id_rol,
                        password_hash=generate_password_hash(CLAVE), debe_cambiar_clave=True),
            ])
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    # utilidades
    def login(self, correo, clave=CLAVE):
        return self.client.post("/api/auth/login", json={"correo": correo, "contrasena": clave})

    def cabecera(self, correo):
        token = self.login(correo).get_json()["token"]
        return {"Authorization": f"Bearer {token}"}

    # login
    def test_login_devuelve_token_y_rol(self):
        r = self.login("admin@hv.co")
        self.assertEqual(r.status_code, 200)
        d = r.get_json()
        self.assertTrue(d["token"])
        self.assertEqual(d["usuario"]["rol"], "Administrador")
        self.assertNotIn("password_hash", d["usuario"])

    def test_login_clave_incorrecta(self):
        self.assertEqual(self.login("admin@hv.co", "mala-clave-1").status_code, 401)

    # /api/usuarios: solo administrador
    def test_usuarios_sin_token_401(self):
        self.assertEqual(self.client.get("/api/usuarios").status_code, 401)

    def test_usuarios_token_invalido_401(self):
        r = self.client.get("/api/usuarios", headers={"Authorization": "Bearer abc.def.ghi"})
        self.assertEqual(r.status_code, 401)

    def test_usuarios_como_analista_403(self):
        r = self.client.get("/api/usuarios", headers=self.cabecera("ana@hv.co"))
        self.assertEqual(r.status_code, 403)

    def test_usuarios_como_admin_200(self):
        r = self.client.get("/api/usuarios", headers=self.cabecera("admin@hv.co"))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.get_json()["datos"]), 3)

    def test_todas_las_rutas_de_usuarios_exigen_admin(self):
        h = self.cabecera("ana@hv.co")
        pruebas = [
            ("post", "/api/usuarios", {"nombre": "X", "correo": "x@hv.co", "rol": "Analista"}),
            ("patch", "/api/usuarios/1/rol", {"rol": "Administrador"}),
            ("patch", "/api/usuarios/1/estado", {"activo": False}),
            ("post", "/api/usuarios/1/reiniciar-clave", None),
        ]
        for metodo, url, cuerpo in pruebas:
            r = getattr(self.client, metodo)(url, headers=h, json=cuerpo)
            self.assertEqual(r.status_code, 403, f"{metodo.upper()} {url}")

    def test_token_expirado_401(self):
        with self.app.app_context():
            uid = Usuario.query.filter_by(correo="admin@hv.co").first().id_usuario
            token = create_access_token(identity=str(uid), expires_delta=timedelta(seconds=-5))
        r = self.client.get("/api/usuarios", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r.status_code, 401)

    # el rol se toma de la BD, no del token
    def test_cambio_de_rol_en_bd_tiene_efecto_inmediato(self):
        h = self.cabecera("admin@hv.co")
        with self.app.app_context():
            u = Usuario.query.filter_by(correo="admin@hv.co").first()
            u.id_rol = Rol.query.filter_by(nombre="Analista").first().id_rol
            db.session.commit()
        self.assertEqual(self.client.get("/api/usuarios", headers=h).status_code, 403)

    def test_usuario_desactivado_pierde_acceso_con_token_vigente(self):
        h = self.cabecera("admin@hv.co")
        with self.app.app_context():
            Usuario.query.filter_by(correo="admin@hv.co").first().activo = False
            db.session.commit()
        self.assertEqual(self.client.get("/api/usuarios", headers=h).status_code, 401)

    # contraseña temporal
    def test_clave_temporal_bloquea_rutas_y_permite_cambiarla(self):
        h = self.cabecera("temp@hv.co")
        self.assertEqual(self.client.get("/api/dashboard", headers=h).status_code, 403)
        self.assertEqual(self.client.get("/api/auth/me", headers=h).status_code, 200)
        r = self.client.post("/api/auth/cambiar-clave", headers=h,
                             json={"contrasena_actual": CLAVE, "contrasena_nueva": "Nueva-Clave-456"})
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.get_json()["usuario"]["debe_cambiar_clave"])
        self.assertEqual(self.login("temp@hv.co", "Nueva-Clave-456").status_code, 200)

    def test_cambiar_clave_validaciones(self):
        h = self.cabecera("temp@hv.co")
        casos = [
            {"contrasena_actual": "incorrecta-1", "contrasena_nueva": "Nueva-Clave-456"},
            {"contrasena_actual": CLAVE, "contrasena_nueva": "corta"},
            {"contrasena_actual": CLAVE, "contrasena_nueva": CLAVE},
        ]
        for cuerpo in casos:
            r = self.client.post("/api/auth/cambiar-clave", headers=h, json=cuerpo)
            self.assertEqual(r.status_code, 400, cuerpo)

    def test_rutas_de_datos_exigen_token(self):
        for url in ["/api/dashboard", "/api/mapa/resumen", "/api/alertas", "/api/busqueda"]:
            self.assertIn(self.client.get(url).status_code, (401, 404), url)


if __name__ == "__main__":
    unittest.main()
