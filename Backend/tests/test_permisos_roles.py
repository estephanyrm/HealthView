"""Matriz de permisos por rol de la API (debe coincidir con la tabla de Configuración).
Ejecutar desde Backend/:  python -m unittest tests.test_permisos_roles -v

Para cada endpoint y cada rol comprueba que:
  · un rol SIN permiso recibe 403;
  · un rol CON permiso no recibe 401/403 (en SQLite las consultas de datos pueden fallar
    con 500 porque solo se crean las tablas de usuarios; lo que se prueba es la autorización).
"""
import unittest

from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models.usuario import Rol, Usuario
from config import TestingConfig

ADMIN, ANALISTA, INVESTIGADOR, MEDICO = "Administrador", "Analista", "Investigador", "Médico"
TODOS = (ADMIN, ANALISTA, INVESTIGADOR, MEDICO)

MATRIZ = [
    # (método, url, roles permitidos)
    ("get", "/api/dashboard", TODOS),                                   # Panel inteligente
    ("get", "/api/catalogos/municipios", TODOS),
    ("get", "/api/dashboard/tendencias", (ADMIN, ANALISTA)),            # Tendencias
    ("get", "/api/mapa", (ADMIN, ANALISTA, INVESTIGADOR)),              # Mapa epidemiológico
    ("get", "/api/mapa/05001", (ADMIN, ANALISTA, INVESTIGADOR)),
    ("get", "/api/alertas", (ADMIN, MEDICO)),                           # Alertas
    ("get", "/api/alertas/estancias-prolongadas", (ADMIN, MEDICO)),
    ("get", "/api/busqueda", (ADMIN, ANALISTA)),                        # Búsqueda y filtros
    ("get", "/api/busqueda/presets", (ADMIN, ANALISTA)),
    ("get", "/api/reportes/resumen", (ADMIN, ANALISTA)),                # Reportes
    ("get", "/api/reportes/exportar/csv", (ADMIN, ANALISTA)),
    ("get", "/api/mapa/comparador/municipios", (ADMIN,)),               # Comparador
    ("get", "/api/usuarios", (ADMIN,)),                                 # Usuarios
    ("get", "/api/hospitalizaciones", (ADMIN,)),                        # Registros
    ("delete", "/api/hospitalizaciones/1", (ADMIN,)),
]
CLAVE = "Clave-Segura-123"


class PermisosPorRolTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        with self.app.app_context():
            Rol.__table__.create(db.engine)
            Usuario.__table__.create(db.engine)
            for i, rol in enumerate(TODOS, start=1):
                db.session.add(Rol(id_rol=i, nombre=rol))
                db.session.add(Usuario(nombre=rol, correo=f"{i}@hv.co", id_rol=i,
                                       password_hash=generate_password_hash(CLAVE),
                                       debe_cambiar_clave=False))
            db.session.commit()
        self.cabeceras = {}
        for i, rol in enumerate(TODOS, start=1):
            r = self.client.post("/api/auth/login", json={"correo": f"{i}@hv.co", "contrasena": CLAVE})
            self.cabeceras[rol] = {"Authorization": f"Bearer {r.get_json()['token']}"}

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_matriz_de_permisos(self):
        for metodo, url, permitidos in MATRIZ:
            for rol in TODOS:
                with self.subTest(url=url, rol=rol):
                    codigo = getattr(self.client, metodo)(url, headers=self.cabeceras[rol]).status_code
                    if rol in permitidos:
                        self.assertNotIn(codigo, (401, 403), f"{rol} debería poder usar {url}")
                    else:
                        self.assertEqual(codigo, 403, f"{rol} NO debería poder usar {url}")

    def test_sin_token_401(self):
        for metodo, url, _ in MATRIZ:
            with self.subTest(url=url):
                self.assertEqual(getattr(self.client, metodo)(url).status_code, 401)


if __name__ == "__main__":
    unittest.main()
