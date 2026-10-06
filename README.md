# Plataforma Inteligente para la Gestión Hospitalaria y Analítica Clínica

> Proyecto del **Grupo Chill** · Programación Web · Universidad Libre

Plataforma web que convierte los datos de hospitalizaciones en información útil para la toma de decisiones: tendencias, enfermedades frecuentes, tiempos de estancia, alertas y reportes automáticos.

## Problema que resuelve

Muchos hospitales almacenan enormes cantidades de datos de hospitalizaciones pero no los aprovechan para:

- Detectar tendencias.
- Predecir la ocupación hospitalaria.
- Conocer las enfermedades más frecuentes.
- Medir los tiempos de hospitalización.
- Generar reportes de forma automática.

**La plataforma centraliza esa información** y la presenta de forma clara, visual y accesible.

## Datos del proyecto

| | |
|---|---|
| **Dataset** | Registro de hospitalización y prestación de servicios médicos |
| **Fuente** | *(completar: entidad y enlace)* |
| **Registros originales** | 839.738 (24 columnas) |
| **Registros tras la limpieza** | 833.586 (se eliminaron 6.152 duplicados) |
| **Cobertura** | Medellín / Antioquia, 2019-2022 |

> Los archivos de datos (CSV) pesan más de 100 MB y **no están en el repositorio**, porque GitHub no admite archivos de ese tamaño. Descárgalos de: *(completar enlace)*.

## Módulos de la plataforma

| # | Módulo | Qué permite |
|---|---|---|
| 1 | **Dashboard inteligente** | Hospitalizaciones, pacientes por edad y sexo, diagnósticos frecuentes, estancia promedio, egresos y mortalidad |
| 2 | **Análisis de tendencias** | Comparación mensual y anual, enfermedades con mayor crecimiento, temporadas de mayor demanda |
| 3 | **Mapa epidemiológico** | Hospitalizaciones por municipio o departamento y comparación entre regiones |
| 4 | **Sistema de alertas** | Avisos ante aumentos repentinos de una enfermedad, alta ocupación o estancias muy largas |
| 5 | **Búsqueda y filtros avanzados** | Filtros por diagnóstico, edad, sexo, EPS, prestador, municipio y fechas |
| 6 | **Reportes automáticos** | Exportación a PDF y Excel, indicadores personalizados y resúmenes ejecutivos |
| 7 | **Comparador de indicadores** | Comparar hospitales, municipios, EPS y periodos de tiempo |
| 8 | **Predicción** *(innovación)* | Hospitalizaciones futuras, ocupación estimada y enfermedades más frecuentes con Machine Learning |

## Roles de usuario

| Rol | Uso principal |
|---|---|
| **Administrador** | Gestiona usuarios y configuración |
| **Analista** | Explora tendencias, filtros y reportes |
| **Investigador** | Consulta y compara datos epidemiológicos |
| **Médico** | Revisa indicadores clínicos y alertas |

## Arquitectura y tecnologías

```
Datos originales (CSV)  →  Limpieza (Python)  →  Base de datos (MariaDB/MySQL)  →  Backend  →  Frontend web
```

| Capa | Tecnología |
|---|---|
| Limpieza de datos | Python 3 + pandas |
| Base de datos | MariaDB 10.4+ / MySQL (XAMPP) |
| Frontend | HTML, CSS y JavaScript |
| Backend | *(por definir)* |
| Predicción | *(por definir: Python / scikit-learn)* |

## Modelo entidad-relación

![Diagrama entidad-relación](docs/diagrama_entidad_relacion.png)

La hospitalización es la entidad central. Las demás tablas describen quién la atendió (prestador), quién la afilia (EPS), dónde vive el paciente (municipio) y qué diagnósticos tuvo, además de gestionar el acceso a la plataforma (rol y usuario).

| Elemento | Cantidad |
|---|---|
| Tablas | 12 |
| Vistas para el backend | 3 (`vw_hospitalizaciones_mensuales`, `vw_hospitalizacion_detalle`, `vw_estancia_unica`) |
| Registros en `hospitalizacion` | 833.586 |

## Estructura del repositorio

```
proyecto/
├── README.md
├── html/                         # Páginas de la plataforma
├── css/                          # Estilos
├── javascript/                   # Lógica del frontend
├── docs/                         # Diagramas y documentación
└── db/
    └── scripts/
        ├── crear_base_datos.sql  # Crea la BD, tablas y restricciones
        ├── importar_datos.sql    # Carga los CSV
        ├── validaciones.sql      # Verifica la calidad de la carga
        └── consultas_prueba.sql  # Consultas por módulo y vistas
```

## Cómo ejecutar la base de datos

**Requisitos:** [XAMPP](https://www.apachefriends.org/) con MySQL iniciado y los CSV limpios descargados.

> Clona el proyecto en una ruta **corta, sin espacios y fuera de OneDrive** (por ejemplo `C:\proyecto\`). Las rutas con espacios o sincronizadas con OneDrive causan errores al importar.

**1. Habilita `LOCAL INFILE`** en `C:\xampp\mysql\bin\my.ini` y reinicia MySQL desde el panel de XAMPP:

```ini
[mysqld]
local_infile=1

[mysql]
local-infile=1
```

**2. Abre el cliente de MySQL:**

```bash
C:\xampp\mysql\bin\mysql.exe -u root --local-infile=1
```

> El mensaje dirá "MariaDB monitor". Es normal: XAMPP incluye MariaDB, compatible con MySQL.

**3. Crea la base de datos** (¡borra `hospitalizacion_db` si ya existe!):

```sql
SOURCE C:/proyecto/db/scripts/crear_base_datos.sql;
```

**4. Importa los datos.** Antes, abre `importar_datos.sql` y confirma que la ruta de los CSV coincida con la carpeta donde los guardaste. Tarda entre 1 y 3 minutos:

```sql
SOURCE C:/proyecto/db/scripts/importar_datos.sql;
```

**5. Valida y prueba:**

```sql
SOURCE C:/proyecto/db/scripts/validaciones.sql;
SOURCE C:/proyecto/db/scripts/consultas_prueba.sql;
```

## Equipo

**Grupo Chill**

- Brandon Camilo Londoño
- Maria Paulina Páez
- Estephany Ruales
