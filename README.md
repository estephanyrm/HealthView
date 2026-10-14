# HealthView — Plataforma inteligente para la gestión hospitalaria y analítica clínica

> Proyecto del **Grupo Chill** · Programación Web · Universidad Libre

HealthView convierte los registros de hospitalización en información útil para tomar decisiones: tendencias, enfermedades frecuentes, estancias, alertas y reportes automáticos.

## Contenido

1. [El problema](#el-problema)
2. [Datos del proyecto](#datos-del-proyecto)
3. [Módulos de la plataforma](#módulos-de-la-plataforma)
4. [Roles de usuario](#roles-de-usuario)
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
| 7   | **Comparador de indicadores**    | Compara hospitales, municipios, aseguradoras y periodos                                                                |                          |

## Roles de usuario

| Rol               | Uso principal                            |
| ----------------- | ---------------------------------------- |
| **Administrador** | Gestiona usuarios y configuración        |
| **Analista**      | Explora tendencias, filtros y reportes   |
| **Investigador**  | Consulta y compara datos epidemiológicos |
| **Médico**        | Revisa indicadores clínicos y alertas    |

## Arquitectura y tecnologías

```
Datos originales (CSV) → Limpieza (Python/pandas) → Base de datos (MariaDB/MySQL) → API (Flask) → Frontend web
```

| Capa              | Tecnología                                                |
| ----------------- | --------------------------------------------------------- |
| Limpieza de datos | Python 3 + pandas                                         |
| Base de datos     | MariaDB 10.4+ / MySQL 8 (XAMPP)                           |
| Backend           | Python 3 + Flask 3, Flask-SQLAlchemy, Flask-CORS, PyMySQL |
| Frontend          | HTML, CSS (Bootstrap 5 en el login) y JavaScript          |


Cómo se comunican las partes: el navegador carga las páginas HTML, el JavaScript pide datos a la API en `http://127.0.0.1:5000/api/...`, la API consulta la base de datos con SQLAlchemy y responde en JSON.

## Estado del proyecto

| Parte                                                                                       | Estado    |
| ------------------------------------------------------------------------------------------- | --------- |
| Base de datos (12 tablas, 3 vistas, scripts de carga y validación)                          | Hecho     |
| API: CRUD de hospitalizaciones, catálogos, `/health`, manejo de errores                     | Hecho     |
| Frontend: página de presentación y pantalla de login (solo diseño)                          | Hecho     |
| Login real (usuarios, contraseñas cifradas, sesión)                                         | Pendiente |
| Control de acceso por rol en la API                                                         | Pendiente |
| Endpoints de los módulos 1-7 (estadísticas, tendencias, mapa, alertas, filtros, comparador) | Pendiente |
| Páginas internas (panel, tendencias, mapa, etc.) y su JavaScript                            | Pendiente |
| Reportes PDF / Excel                                                                        | Pendiente |
| Predicción con Machine Learning                                                             | Pendiente |
| Pruebas automáticas                                                                         | Pendiente |

## Estructura del repositorio

```
HealthView/
├── README.md
├── .gitignore
├── Backend/                          # API en Flask
│   ├── run.py                        # Arranca el servidor
│   ├── config.py                     # Configuración (lee el .env)
│   ├── requirements.txt              # Dependencias de Python
│   ├── .env.example                  # Plantilla de variables de entorno
│   └── app/
│       ├── __init__.py               # Fábrica de la app (create_app)
│       ├── extensions.py             # db y cors
│       ├── models/                   # Tablas como clases de Python
│       ├── routes/                   # Endpoints HTTP
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
│   │   └── login.js                  # Lógica del login
│   └── img/                          # Logotipos
├── docs/                             # Diagrama entidad-relación
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

> El mensaje de bienvenida dirá "MariaDB monitor". Es normal: XAMPP trae MariaDB, compatible con MySQL.

**1.3. Crea la base de datos** (¡borra `hospitalizacion_db` si ya existe!):

```sql
SOURCE C:/proyecto/db/scripts/crear_base_datos.sql;
```

**1.4. Importa los datos.** Antes, abre `importar_datos.sql` y cambia la ruta de cada `LOAD DATA LOCAL INFILE` por la carpeta donde guardaste los CSV (`db/datos_limpios/`). Tarda de 1 a 3 minutos:

```sql
SOURCE C:/proyecto/db/scripts/importar_datos.sql;
```

**1.5. Valida y prueba:**

```sql
SOURCE C:/proyecto/db/scripts/validaciones.sql;
SOURCE C:/proyecto/db/scripts/consultas_prueba.sql;
```

### Paso 2. Backend (API)

Desde la carpeta `Backend/`:

```bash
# 1. Crear y activar el entorno virtual
python -m venv .venv
.venv\Scripts\activate            # Windows
# source .venv/bin/activate       # Linux / macOS

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Crear tu archivo de configuración
copy .env.example .env            # Windows  (cp .env.example .env en Linux/macOS)
# Edita .env: usuario y contraseña de MySQL, y SECRET_KEY

# 4. Arrancar
python run.py
```

La API queda en `http://127.0.0.1:5000`. Compruébalo abriendo `http://127.0.0.1:5000/api/health`: debe responder `{"estado": "ok", "base_de_datos": "conectada"}`.

Variables del `.env`:

| Variable                 | Para qué sirve                                        | Valor típico en XAMPP                         |
| ------------------------ | ----------------------------------------------------- | --------------------------------------------- |
| `SECRET_KEY`             | Clave para firmar sesiones. Usa una larga y aleatoria | —                                             |
| `DB_HOST`, `DB_PORT`     | Dónde está MySQL                                      | `localhost`, `3306`                           |
| `DB_USER`, `DB_PASSWORD` | Credenciales de MySQL                                 | `root`, _(vacía)_                             |
| `DB_NAME`                | Nombre de la base                                     | `hospitalizacion_db`                          |
| `CORS_ORIGINS`           | Orígenes del frontend que pueden llamar a la API      | `http://127.0.0.1:5500,http://localhost:5500` |

> `CORS_ORIGINS` debe incluir exactamente la dirección desde la que abres el frontend. Si la API responde pero el navegador la bloquea, casi siempre es esto.

### Paso 3. Frontend

Abre `Frontend/html/index.html` con **Live Server** (clic derecho → _Open with Live Server_). Normalmente queda en `http://127.0.0.1:5500/Frontend/html/index.html`. Desde ahí el botón "Iniciar sesión" lleva a `login.html`.

> Las páginas también se ven abriendo el archivo directamente, pero para llamar a la API usa siempre Live Server para que coincida con `CORS_ORIGINS`. El login carga Bootstrap desde internet.

## Guía de archivos

### Frontend

| Archivo               | Qué hace                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `html/index.html`     | Página de presentación. Tiene encabezado con menú, hero con vista previa, problema y solución, los 8 módulos, roles, datos, "Quiénes somos" (equipo) y llamado a la acción. Solo contiene estructura y texto. |
| `html/login.html`     | Formulario de inicio de sesión con Bootstrap. **Aún no envía nada**: el `action` es `#`.                                                                                                                      |
| `css/base.css`        | Lo común a todas las páginas: colores (`--green`, `--ink`, `--accent`...) y `box-sizing`. Cambiar un color aquí lo cambia en todo el sitio.                                                                   |
| `css/landing.css`     | Estilos de `index.html`: menú fijo, hero, tarjetas, cuadrícula de módulos, equipo y versión móvil (`@media`).                                                                                                 |
| `css/login.css`       | Estilos de `login.html`: encabezado verde, tarjeta del formulario, ajustes sobre Bootstrap.                                                                                                                   |
| `javascript/login.js` | Botón "Mostrar / Ocultar" de la contraseña. Aquí irá la llamada al login de la API.                                                                                                                           |
| `img/`                | `logo-icono.png` (encabezado) y `logo.png` (sección "Quiénes somos").                                                                                                                                         |

### Backend

| Archivo                                   | Qué hace                                                                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run.py`                                  | Punto de entrada. Crea la app y la sirve en el puerto 5000 con `debug=True` (solo para desarrollo).                                                                                         |
| `config.py`                               | Lee el `.env` y arma la conexión `mysql+pymysql://...`. `TestingConfig` usa SQLite en memoria para pruebas.                                                                                 |
| `app/__init__.py`                         | `create_app()`: crea la app, conecta la base, activa CORS solo para los orígenes permitidos, registra rutas y errores.                                                                      |
| `app/extensions.py`                       | Crea `db` (SQLAlchemy) y `cors` una sola vez para que todos los módulos los compartan.                                                                                                      |
| `app/models/base.py`                      | `SerializableMixin`: agrega `to_dict()` a cada modelo para convertirlo en JSON (las fechas pasan a texto).                                                                                  |
| `app/models/catalogos.py`                 | Tablas de referencia: Departamento, Municipio, Eps, Prestador, Diagnostico, ViaIngreso, CausaExterna, TipoUsuario.                                                                          |
| `app/models/hospitalizacion.py`           | `Hospitalizacion` (tabla central, 1 fila = 1 factura) y `HospitalizacionDiagnostico` (diagnósticos adicionales). `dias_estancia` y `edad_anios` los calcula MySQL: se leen, no se escriben. |
| `app/routes/health.py`                    | `GET /api/health`: comprueba que la API y la base responden.                                                                                                                                |
| `app/routes/catalogos.py`                 | `GET /api/catalogos/<nombre>`: listas para los filtros del frontend, con búsqueda `?q=` y máximo 500 filas.                                                                                 |
| `app/routes/hospitalizaciones.py`         | CRUD de hospitalizaciones. Solo traduce HTTP a llamadas del servicio, sin lógica propia.                                                                                                    |
| `app/services/hospitalizacion_service.py` | Las reglas: campos obligatorios, tipos, valores permitidos (`sexo` F/M, `zona_residencia` U/R...), que el egreso no sea anterior al ingreso, filtros y paginación (máx. 100 por página).    |
| `app/utils/errors.py`                     | Todos los errores salen con el mismo formato `{"error": {"codigo", "mensaje", "detalles"}}` y sin revelar SQL interno.                                                                      |

La idea de las capas: **ruta** (recibe la petición) → **servicio** (valida y decide) → **modelo** (habla con la base). Así cada archivo hace una sola cosa y es fácil de probar.

### Base de datos

| Archivo                | Qué hace                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crear_base_datos.sql` | Crea `hospitalizacion_db` con 12 tablas: 8 catálogos, `rol`, `usuario`, `hospitalizacion` y `hospitalizacion_diagnostico`. Inserta los roles y los catálogos pequeños.                                                                         |
| `importar_datos.sql`   | Carga los CSV con `LOAD DATA LOCAL INFILE`, en orden: primero las tablas referenciadas y luego las que dependen de ellas.                                                                                                                      |
| `validaciones.sql`     | Cuenta filas por tabla y busca registros huérfanos y datos inconsistentes.                                                                                                                                                                     |
| `consultas_prueba.sql` | Una consulta por módulo (panel, tendencias, mapa, alertas, filtros, reportes, comparador) y 3 vistas para el backend: `vw_hospitalizaciones_mensuales`, `vw_hospitalizacion_detalle` y `vw_estancia_unica`. Requiere MySQL 8+ o MariaDB 10.2+. |

> La fuente trae **una fila por factura**, no por paciente. Varias facturas pueden ser la misma estancia; por eso existe la vista `vw_estancia_unica` para contar hospitalizaciones "reales". Tampoco hay tabla de pacientes, porque el dataset no trae identificador.

## API: endpoints disponibles

Todas las respuestas son JSON. Prefijo común: `/api`.

| Método | Ruta                      | Descripción                                                                                                                                                     |
| ------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`                 | Estado de la API y la base                                                                                                                                      |
| GET    | `/catalogos/<nombre>`     | `departamentos`, `municipios`, `eps`, `prestadores`, `diagnosticos`, `vias-ingreso`, `causas-externas`, `tipos-usuario`. Admite `?q=texto`                      |
| GET    | `/hospitalizaciones`      | Lista paginada. Filtros: `anio`, `id_prestador`, `id_eps`, `id_municipio`, `sexo`, `dx_ingreso`, `dx_egreso`, `desde`, `hasta` (YYYY-MM-DD), `page`, `per_page` |
| GET    | `/hospitalizaciones/<id>` | Detalle de una hospitalización                                                                                                                                  |
| POST   | `/hospitalizaciones`      | Crea una (201, con cabecera `Location`)                                                                                                                         |
| PUT    | `/hospitalizaciones/<id>` | Reemplaza todos los campos                                                                                                                                      |
| PATCH  | `/hospitalizaciones/<id>` | Cambia solo los campos enviados                                                                                                                                 |
| DELETE | `/hospitalizaciones/<id>` | Elimina (204)                                                                                                                                                   |

Ejemplo:

```bash
curl "http://127.0.0.1:5000/api/hospitalizaciones?anio=2022&sexo=F&per_page=5"
```

Códigos de error: `400` datos inválidos, `404` no existe, `409` viola una restricción de la base, `500` error interno.

> **Pendiente:** hoy ningún endpoint exige autenticación. Debe resolverse antes de publicar el sistema.

## Modelo entidad-relación

![Diagrama entidad-relación](docs/Diagrama%20entidad%20relacion.png)

`hospitalizacion` es la entidad central. Las demás tablas describen quién prestó la atención (prestador), quién asegura al paciente (EPS), dónde vive (municipio) y qué diagnósticos tuvo, además de la gestión de acceso (rol y usuario).

## Equipo

**Grupo Chill**

- Brandon Camilo Londoño
- Maria Paulina Páez
- Estephany Ruales
