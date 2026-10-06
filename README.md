# Smart Platform for Hospital Management and Clinical Analytics

> Project by **Grupo Chill** · Web Programming · Universidad Libre

A web platform that turns hospitalization data into useful information for decision-making: trends, frequent diseases, length of stay, alerts, and automatic reports.

## Problem Statement

Many hospitals store huge amounts of hospitalization data but don't use it to:

- Detect trends.
- Predict hospital occupancy.
- Identify the most frequent diseases.
- Measure length of hospital stay.
- Generate reports automatically.

**The platform centralizes this information** and presents it in a clear, visual, and accessible way.

## Project Data

|                            |                                                          |
| -------------------------- | -------------------------------------------------------- |
| **Dataset**                | Hospitalization and healthcare service provision records |
| **Source**                 | _(to complete: organization and link)_                   |
| **Original records**       | 839,738 (24 columns)                                     |
| **Records after cleaning** | 833,586 (6,152 duplicates removed)                       |
| **Coverage**               | Medellín / Antioquia, Colombia, 2019-2022                |

> The data files (CSV) are larger than 100 MB and are **not included in the repository**, because GitHub does not accept files of that size. Download them from: _(to complete: link)_.

## Platform Modules

| #   | Module                          | What it provides                                                                                                     |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | **Smart Dashboard**             | Hospitalizations, patients by age and sex, frequent diagnoses, average length of stay, discharge and mortality rates |
| 2   | **Trend Analysis**              | Monthly and yearly comparison, fastest-growing diseases, peak-demand seasons                                         |
| 3   | **Epidemiological Map**         | Hospitalizations by municipality or department, and comparison between regions                                       |
| 4   | **Alert System**                | Notifications for sudden increases in a disease, high occupancy, or very long stays                                  |
| 5   | **Search and Advanced Filters** | Filters by diagnosis, age, sex, health insurer (EPS), provider, municipality, and dates                              |
| 6   | **Automatic Reports**           | PDF and Excel export, custom indicators, and executive summaries                                                     |
| 7   | **Indicator Comparator**        | Compare hospitals, municipalities, insurers, and time periods                                                        |
| 8   | **Prediction** _(innovation)_   | Future hospitalizations, estimated occupancy, and most frequent diseases using Machine Learning                      |

## User Roles

| Role              | Main use                                  |
| ----------------- | ----------------------------------------- |
| **Administrator** | Manages users and settings                |
| **Analyst**       | Explores trends, filters, and reports     |
| **Researcher**    | Queries and compares epidemiological data |
| **Physician**     | Reviews clinical indicators and alerts    |

## Architecture and Technologies

```
Original data (CSV)  →  Cleaning (Python)  →  Database (MariaDB/MySQL)  →  Backend  →  Web frontend
```

| Layer         | Technology                               |
| ------------- | ---------------------------------------- |
| Data cleaning | Python 3 + pandas                        |
| Database      | MariaDB 10.4+ / MySQL (XAMPP)            |
| Frontend      | HTML, CSS, and JavaScript                |
| Backend       | _(to be defined)_                        |
| Prediction    | _(to be defined: Python / scikit-learn)_ |

## Entity-Relationship Model

![Entity-relationship diagram](docs/Diagrama%20entidad%20relacion.png)

Hospitalization is the central entity. The other tables describe who provided the care (provider), who insures the patient (EPS), where the patient lives (municipality), and which diagnoses they had, plus access management for the platform (role and user).

| Element                   | Count                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------- |
| Tables                    | 12                                                                                      |
| Views for the backend     | 3 (`vw_hospitalizaciones_mensuales`, `vw_hospitalizacion_detalle`, `vw_estancia_unica`) |
| Rows in `hospitalizacion` | 833,586                                                                                 |

## Repository Structure

```
proyecto/
├── README.md
├── html/                         # Platform pages
├── css/                          # Styles
├── javascript/                   # Frontend logic
├── docs/                         # Diagrams and documentation
└── db/
    └── scripts/
        ├── crear_base_datos.sql  # Creates the database, tables, and constraints
        ├── importar_datos.sql    # Loads the CSV files
        ├── validaciones.sql      # Checks the quality of the loaded data
        └── consultas_prueba.sql  # Queries by module and views
```

## How to Run the Database

**Requirements:** [XAMPP](https://www.apachefriends.org/) with MySQL running and the cleaned CSV files downloaded.

> Clone the project into a **short path, with no spaces and outside OneDrive** (for example `C:\proyecto\`). Paths with spaces or synced by OneDrive cause errors during the import.

**1. Enable `LOCAL INFILE`** in `C:\xampp\mysql\bin\my.ini` and restart MySQL from the XAMPP control panel:

```ini
[mysqld]
local_infile=1

[mysql]
local-infile=1
```

**2. Open the MySQL client:**

```bash
C:\xampp\mysql\bin\mysql.exe -u root --local-infile=1
```

> The welcome message will say "MariaDB monitor". This is normal: XAMPP ships with MariaDB, which is MySQL-compatible.

**3. Create the database** (this deletes `hospitalizacion_db` if it already exists!):

```sql
SOURCE C:/proyecto/db/scripts/crear_base_datos.sql;
```

**4. Import the data.** First, open `importar_datos.sql` and make sure the CSV path matches the folder where you saved the files. It takes 1 to 3 minutes:

```sql
SOURCE C:/proyecto/db/scripts/importar_datos.sql;
```

**5. Validate and test:**

```sql
SOURCE C:/proyecto/db/scripts/validaciones.sql;
SOURCE C:/proyecto/db/scripts/consultas_prueba.sql;
```

## Team

**Grupo Chill**

- Brandon Camilo Londoño
- Maria Paulina Páez
- Estephany Ruales
