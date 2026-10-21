# HealthView — Plataforma inteligente para la gestión hospitalaria y analítica clínica

> Proyecto del **Grupo Chill** · Programación Web · Universidad Libre

HealthView convierte los registros de hospitalización en información útil para tomar decisiones: tendencias, enfermedades frecuentes, estancias, alertas y reportes automáticos.

## Contenido

1. [El problema](#el-problema)
2. [Datos del proyecto](#datos-del-proyecto)
3. [Módulos de la plataforma](#módulos-de-la-plataforma)
4. [Roles de usuario y flujo de autenticación](#roles-de-usuario-y-flujo-de-autenticación)
5. [Arquitectura y tecnologías](#arquitectura-y-tecnologías)
6. [Estado del proyecto](#estado-del-proyecto)
7. [Estructura del repositorio](#estructura-del-repositorio)
8. [Cómo ejecutar el proyecto](#cómo-ejecutar-el-proyecto)
9. [Guía de archivos](#guía-de-archivos)
10. [API: endpoints disponibles](#api-endpoints-disponibles)
11. [Modelo entidad-relación](#modelo-entidad-relación)
12. [Equipo](#equipo)

---

## El problema

Muchos hospitales guardan enormes cantidades de registros de hospitalización y no los aprovechan para:

- Detectar tendencias.
- Anticipar la ocupación hospitalaria.
- Identificar las enfermedades más frecuentes.
- Medir la duración de las estancias.
- Generar reportes automáticamente.

**HealthView centraliza esta información y la presenta de forma clara, visual y accesible.**

## Datos del proyecto

|                                |                                                                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fuente**                     | Registro de prestación de servicios médicos en hospitalización ([datos.gov.co](https://www.datos.gov.co/dataset/Registro-Prestaci-n-Servicios-M-dicos-en-Hospitali/6bjy-46fk/about_data)) |
| **Registros originales**       | 839.738 (24 columnas)                                                                                                                                                                     |
| **Registros tras la limpieza** | 833.586 (se eliminaron 6.152 duplicados)                                                                                                                                                  |
| **Cobertura**                  | Medellín / Antioquia, Colombia, 2019-2022                                                                                                                                                 |

> Los archivos CSV pesan más de 100 MB y **no están en el repositorio** (GitHub no los acepta). Descárgalos de la fuente y límpialos antes de importarlos.

## Módulos de la plataforma

| #   | Módulo                           | Qué ofrece                                                                                                             |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | **Panel inteligente**            | Hospitalizaciones, pacientes por edad y sexo, diagnósticos frecuentes, estancia promedio, tasas de egreso y mortalidad |
| 2   | **Análisis de tendencias**       | Comparación mensual y anual, enfermedades que más crecen, temporadas de mayor demanda                                  |
| 3   | **Mapa epidemiológico**          | Hospitalizaciones por municipio o departamento y comparación entre regiones                                            |
| 4   | **Sistema de alertas**           | Avisos por aumentos repentinos de una enfermedad, ocupación alta o estancias muy largas                                |
| 5   | **Búsqueda y filtros avanzados** | Por diagnóstico, edad, sexo, EPS, prestador, municipio y fechas                                                        |
| 6   | **Reportes automáticos**         | Exportación a PDF y Excel, indicadores a medida, resúmenes ejecutivos                                                  |
| 7   | **Comparador de indicadores**    | Compara hospitales, municipios, aseguradoras y periodos                                                                |

## Roles de usuario y flujo de autenticación

| Rol               | Uso principal                            |
| ----------------- | ---------------------------------------- |
| **Administrador** | Gestiona usuarios y configuración        |
| **Analista**      | Explora tendencias, filtros y reportes   |
| **Investigador**  | Consulta y compara datos epidemiológicos |
| **Médico**        | Revisa indicadores clínicos y alertas    |

### Flujo de cuentas y seguridad (Sin registro público)

La plataforma **no cuenta con registro público** (`signin.html` / `/api/auth/registro` quedan descartados). Las cuentas solo las crea un **Administrador** autenticado:

1. **Primer Administrador**: Se crea una única vez desde consola mediante `python crear_admin.py`, el cual inserta el usuario directamente en la base de datos con un hash generado por `werkzeug.security` (`debe_cambiar_clave = 0`).
2. **Creación de cuentas**: El Administrador inicia sesión, entra a gestión de usuarios y registra cuentas nuevas (nombre, correo y rol) mediante `POST /api/usuarios`. Toda cuenta creada por el Administrador nace activa (`activo = 1`).
3. **Contraseña temporal**: El sistema genera automáticamente una contraseña temporal aleatoria y se la muestra al Administrador **una sola vez** para que la entregue al usuario. El Administrador no escoge la contraseña.
4. **Cambio obligatorio en primer ingreso**: Cuando el usuario inicia sesión con su clave temporal (`debe_cambiar_clave = 1`), el sistema lo obliga a cambiarla antes de permitirle navegar por la plataforma.
5. **Recuperación de contraseña**: Si un usuario olvida su contraseña, solicita al hospital/Administrador la generación de una nueva clave temporal, lo cual vuelve a activar `debe_cambiar_clave = 1`.

## Arquitectura y tecnologías

```
Datos originales (CSV) → Limpieza (Python/pandas) → Base de datos (MariaDB/MySQL) → API (Flask) → Frontend web
```

| Capa              | Tecnología                                                          |
| ----------------- | ------------------------------------------------------------------- |
| Limpieza de datos | Python 3 + pandas                                                   |
| Base de datos     | MariaDB 10.4+ / MySQL 8 (XAMPP)                                     |
| Backend           | Python 3 + Flask 3, Flask-SQLAlchemy, Flask-CORS, PyMySQL, Werkzeug |
| Frontend          | HTML5, CSS3 (Bootstrap 5 en el login) y JavaScript (Fetch API)      |

Cómo se comunican las partes: el navegador carga las páginas HTML, el JavaScript pide datos a la API en `http://127.0.0.1:5000/api/...`, la API consulta la base de datos con SQLAlchemy y responde en JSON.

## Estado del proyecto

| Parte                                                                                       | Estado      |
| ------------------------------------------------------------------------------------------- | ----------- |
| Base de datos (12 tablas, 3 vistas, scripts de carga y validación, columnas de acceso)      | Hecho       |
| Script de arranque para el primer Administrador (`Backend/crear_admin.py`)                  | Hecho       |
| API: CRUD de hospitalizaciones, catálogos, `/health`, manejo de errores                     | Hecho       |
| Frontend: página de presentación y pantalla de login                                        | Hecho       |
| Login funcional (validación contra BD con hashes Werkzeug, sesión y cambio de clave)        | En progreso |
| Gestión de usuarios por el Administrador (`POST /api/usuarios` y clave temporal)            | Pendiente   |
| Control de acceso por rol en la API                                                         | Pendiente   |
| Endpoints de los módulos 1-7 (estadísticas, tendencias, mapa, alertas, filtros, comparador) | Pendiente   |
| Páginas internas (panel, tendencias, mapa, etc.) y su JavaScript                            | Pendiente   |
| Reportes PDF / Excel                                                                        | Pendiente   |
| Predicción con Machine Learning                                                             | Pendiente   |
| Pruebas automáticas                                                                         | Pendiente   |

## Estructura del repositorio

```
HealthView/
├── README.md
├── .gitignore
├── Backend/                          # API en Flask
│   ├── run.py                        # Arranca el servidor
│   ├── crear_admin.py                # Crea el primer usuario Administrador en BD
│   ├── config.py                     # Configuración (lee el .env)
│   ├── requirements.txt              # Dependencias de Python
│   ├── .env.example                  # Plantilla de variables de entorno
│   └── app/
│       ├── __init__.py               # Fábrica de la app (create_app)
│       ├── extensions.py             # db y cors
│       ├── models/                   # Tablas como clases de Python (catalogos, hospitalizacion, usuario)
│       ├── routes/                   # Endpoints HTTP (health, catalogos, hospitalizaciones, auth)
│       ├── services/                 # Reglas de negocio y validaciones
│       └── utils/                    # Manejo de errores
├── Frontend/
│   ├── html/
│   │   ├── index.html                # Página de presentación
│   │   └── login.html                # Inicio de sesión
│   ├── css/
│   │   ├── base.css                  # Paleta y reinicio compartidos
│   │   ├── landing.css               # Estilos de index.html
│   │   └── login.css                 # Estilos de login.html
│   ├── javascript/
│   │   └── login.js                  # Lógica del login y conexión con /api/auth/login
│   └── img/                          # Logotipos
├── docs/                             # Diagrama entidad-relación y especificación OpenAPI
└── db/
    └── scripts/
        ├── crear_base_datos.sql      # Crea la base, tablas y restricciones
        ├── importar_datos.sql        # Carga los CSV
        ├── validaciones.sql          # Revisa la calidad de los datos
        └── consultas_prueba.sql      # Consultas por módulo y vistas
```

## Cómo ejecutar el proyecto

### Requisitos

- [XAMPP](https://www.apachefriends.org/) con MySQL/MariaDB.
- Python 3.10 o superior.
- Los CSV limpios (ver [Datos del proyecto](#datos-del-proyecto)).
- Para el frontend: la extensión **Live Server** de VS Code, o cualquier servidor estático.

> Clona el proyecto en una **ruta corta, sin espacios y fuera de OneDrive** (por ejemplo `C:\proyecto\`). Las rutas con espacios o sincronizadas por OneDrive dan errores al importar.

### Paso 1. Base de datos

**1.1. Habilita `LOCAL INFILE`** en `C:\xampp\mysql\bin\my.ini` y reinicia MySQL desde el panel de XAMPP:

```ini
[mysqld]
local_infile=1

[mysql]
local-infile=1
```

**1.2. Abre el cliente de MySQL:**

```bash
C:\xampp\mysql\bin\mysql.exe -u root --local-infile=1
```

**1.3. Crea la base de datos** (¡borra `hospitalizacion_db` si ya existe!):

```sql
SOURCE C:/proyecto/db/scripts/crear_base_datos.sql;
```

**1.4. Actualiza la tabla `usuario` (si aún no tiene las columnas de control de acceso):**

```sql
USE hospitalizacion_db;
ALTER TABLE usuario
  ADD COLUMN fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN ultimo_acceso DATETIME NULL,
  ADD COLUMN debe_cambiar_clave TINYINT(1) NOT NULL DEFAULT 1;
```

**1.5. Importa los datos y valida:**

```sql
SOURCE C:/proyecto/db/scripts/importar_datos.sql;
SOURCE C:/proyecto/db/scripts/validaciones.sql;
SOURCE C:/proyecto/db/scripts/consultas_prueba.sql;
```

### Paso 2. Backend (API) y creación del primer Administrador

Desde la carpeta `Backend/`:

```bash
# 1. Crear y activar el entorno virtual
python -m venv .venv
.venv\Scripts\activate            # Windows
# source .venv/bin/activate       # Linux / macOS

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Crear tu archivo de configuración
copy .env.example .env            # Windows (cp .env.example .env en Linux/macOS)

# 4. Crear el primer Administrador (se ejecuta una sola vez)
python crear_admin.py

# 5. Arrancar el servidor
python run.py
```

La API queda en `http://127.0.0.1:5000`. Compruébalo abriendo `http://127.0.0.1:5000/api/health`: debe responder `{"estado": "ok", "base_de_datos": "conectada"}`.

### Paso 3. Frontend

Abre `Frontend/html/index.html` con **Live Server** (clic derecho → _Open with Live Server_). Desde ahí el botón "Iniciar sesión" lleva a `login.html`.

## Guía de archivos

### Frontend

| Archivo               | Qué hace                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `html/index.html`     | Página de presentación con hero, módulos, roles, datos y equipo.                                                           |
| `html/login.html`     | Formulario de inicio de sesión con Bootstrap.                                                                              |
| `css/base.css`        | Paleta de colores compartida (`--green`, `--ink`, `--accent`...) y `box-sizing`.                                           |
| `css/landing.css`     | Estilos de `index.html`.                                                                                                   |
| `css/login.css`       | Estilos de `login.html`.                                                                                                   |
| `javascript/login.js` | Alterna visibilidad de contraseña, envía credenciales a `POST /api/auth/login` con `fetch` y redirige según el estado/rol. |

### Backend

| Archivo                                   | Qué hace                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `run.py`                                  | Punto de entrada. Arranca Flask en el puerto 5000.                                                                            |
| `crear_admin.py`                          | Script CLI interactivo que crea el primer Administrador con contraseña hasheada (`werkzeug.security.generate_password_hash`). |
| `config.py`                               | Lee el `.env` y configura SQLAlchemy y CORS.                                                                                  |
| `app/__init__.py`                         | `create_app()`: inicializa Flask, SQLAlchemy, CORS, modelos, blueprints y manejadores de error.                               |
| `app/models/usuario.py`                   | Modelos `Rol` y `Usuario` (incluye `fecha_creacion`, `ultimo_acceso` y `debe_cambiar_clave`).                                 |
| `app/routes/auth.py`                      | Endpoints de autenticación (`/api/auth/login`, `/api/auth/cambiar-clave`, `/api/auth/logout`, `/api/auth/me`).                |
| `app/services/auth_service.py`            | Validación de credenciales con `check_password_hash`, actualización de `ultimo_acceso` y cambio de contraseña.                |
| `app/models/catalogos.py`                 | Modelos de las 8 tablas catálogo.                                                                                             |
| `app/models/hospitalizacion.py`           | Modelos `Hospitalizacion` y `HospitalizacionDiagnostico`.                                                                     |
| `app/routes/hospitalizaciones.py`         | Endpoints CRUD de hospitalizaciones.                                                                                          |
| `app/services/hospitalizacion_service.py` | Validaciones de negocio, filtros y paginación de hospitalizaciones.                                                           |
| `app/utils/errors.py`                     | Formato JSON unificado para errores HTTP y de base de datos.                                                                  |

## API: endpoints disponibles

Todas las respuestas son JSON. Prefijo común: `/api`.

| Método | Ruta                      | Descripción                                                                                                      |
| ------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`                 | Estado de la API y la base                                                                                       |
| POST   | `/auth/login`             | Inicia sesión validando correo y contraseña contra MySQL. Indica si `debe_cambiar_clave` es verdadero            |
| POST   | `/auth/cambiar-clave`     | Permite al usuario cambiar su contraseña temporal o actual                                                       |
| POST   | `/auth/logout`            | Cierra la sesión activa                                                                                          |
| GET    | `/catalogos/<nombre>`     | Lista catálogos (`departamentos`, `municipios`, `eps`, `prestadores`, `diagnosticos`, etc.) con filtro `?q=`     |
| GET    | `/hospitalizaciones`      | Lista paginada con filtros (`anio`, `id_prestador`, `id_eps`, `id_municipio`, `sexo`, `dx_ingreso`, `dx_egreso`) |
| GET    | `/hospitalizaciones/<id>` | Detalle de una hospitalización                                                                                   |
| POST   | `/hospitalizaciones`      | Crea un registro de hospitalización                                                                              |
| PUT    | `/hospitalizaciones/<id>` | Reemplaza todos los campos de una hospitalización                                                                |
| PATCH  | `/hospitalizaciones/<id>` | Modifica parcialmente una hospitalización                                                                        |
| DELETE | `/hospitalizaciones/<id>` | Elimina una hospitalización                                                                                      |

## Modelo entidad-relación

![Diagrama entidad-relación](docs/Diagrama%20entidad%20relacion.png)

## Equipo

**Grupo Chill**

- Brandon Camilo Londoño
- Maria Paulina Páez
- Estephany Ruales
