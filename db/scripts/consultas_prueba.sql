
-- TAREA 9 - Consultas y pruebas
-- Cada consulta corresponde a una función de la plataforma (Dashboard,
-- Tendencias, Mapa, Alertas, Filtros, Reportes, Comparador).
-- Requiere MySQL 8+ o MariaDB 10.2+ (usa CTE y funciones de ventana).
-- Nota: la descripción de los diagnósticos es NULL hasta cargar el catálogo CIE-10.
SET NAMES utf8mb4;
USE hospitalizacion_db;

-- 1. DASHBOARD 
-- 1.1 Indicadores generales por año: hospitalizaciones, estancia y mortalidad
SELECT anio,
       COUNT(*)                                        AS hospitalizaciones,
       ROUND(AVG(dias_estancia), 2)                    AS estancia_promedio_dias,
       SUM(estado_salida = 2)                          AS fallecidos,
       ROUND(100 * SUM(estado_salida = 2) / COUNT(*), 2) AS tasa_mortalidad_pct,
       ROUND(100 * SUM(estado_salida = 1) / COUNT(*), 2) AS tasa_egreso_vivo_pct
FROM hospitalizacion
GROUP BY anio
ORDER BY anio;

-- 1.2 Pacientes por grupo de edad y sexo
SELECT CASE
           WHEN edad_anios < 1  THEN '0 - Menores de 1 año'
           WHEN edad_anios < 15 THEN '1 - 1 a 14'
           WHEN edad_anios < 30 THEN '2 - 15 a 29'
           WHEN edad_anios < 45 THEN '3 - 30 a 44'
           WHEN edad_anios < 60 THEN '4 - 45 a 59'
           WHEN edad_anios < 75 THEN '5 - 60 a 74'
           ELSE                      '6 - 75 o más'
       END AS grupo_edad,
       SUM(sexo = 'F') AS mujeres,
       SUM(sexo = 'M') AS hombres,
       COUNT(*)        AS total
FROM hospitalizacion
GROUP BY grupo_edad
ORDER BY grupo_edad;

-- 1.3 Los 10 diagnósticos de egreso más frecuentes
SELECT h.id_dx_egreso AS codigo, d.descripcion, COUNT(*) AS casos,
       ROUND(AVG(h.dias_estancia), 2) AS estancia_promedio
FROM hospitalizacion h
JOIN diagnostico d ON d.codigo = h.id_dx_egreso
GROUP BY h.id_dx_egreso, d.descripcion
ORDER BY casos DESC
LIMIT 10;

-- 1.4 Principales causas básicas de muerte (usa la tabla puente)
SELECT x.codigo, COUNT(*) AS muertes
FROM hospitalizacion_diagnostico x
WHERE x.tipo = 'CAUSA_MUERTE'
GROUP BY x.codigo
ORDER BY muertes DESC
LIMIT 10;

-- 2. TENDENCIAS 
-- 2.1 Hospitalizaciones por mes con variación respecto al mes anterior
WITH mensual AS (
    SELECT DATE_FORMAT(fecha_ingreso, '%Y-%m') AS mes, COUNT(*) AS total
    FROM hospitalizacion
    GROUP BY mes
)
SELECT mes, total,
       LAG(total) OVER (ORDER BY mes) AS mes_anterior,
       ROUND(100 * (total - LAG(total) OVER (ORDER BY mes))
                 / LAG(total) OVER (ORDER BY mes), 1) AS variacion_pct
FROM mensual
ORDER BY mes;

-- 2.2 Estacionalidad: promedio de hospitalizaciones por mes del año
SELECT MONTH(fecha_ingreso) AS mes_del_anio,
       ROUND(COUNT(*) / COUNT(DISTINCT anio), 0) AS promedio_hospitalizaciones
FROM hospitalizacion
GROUP BY mes_del_anio
ORDER BY promedio_hospitalizaciones DESC;

-- 2.3 Diagnósticos con mayor crecimiento 2021 -> 2022 (mínimo 300 casos en 2021)
SELECT id_dx_egreso AS codigo,
       SUM(anio = 2021) AS casos_2021,
       SUM(anio = 2022) AS casos_2022,
       ROUND(100 * (SUM(anio = 2022) - SUM(anio = 2021)) / SUM(anio = 2021), 1) AS crecimiento_pct
FROM hospitalizacion
WHERE anio IN (2021, 2022)
GROUP BY id_dx_egreso
HAVING casos_2021 >= 300
ORDER BY crecimiento_pct DESC
LIMIT 10;

-- 3. MAPA EPIDEMIOLÓGICO 
-- 3.1 Hospitalizaciones por departamento y municipio de residencia
SELECT dep.cod_depto, dep.nombre AS departamento,
       m.id_municipio, m.nombre AS municipio, COUNT(*) AS hospitalizaciones
FROM hospitalizacion h
JOIN municipio m      ON m.id_municipio = h.id_municipio
JOIN departamento dep ON dep.cod_depto  = m.cod_depto
GROUP BY dep.cod_depto, dep.nombre, m.id_municipio, m.nombre
ORDER BY hospitalizaciones DESC
LIMIT 15;

-- 3.2 Zona urbana vs rural
SELECT zona_residencia, COUNT(*) AS total,
       ROUND(100 * COUNT(*) / (SELECT COUNT(*) FROM hospitalizacion), 2) AS porcentaje
FROM hospitalizacion
GROUP BY zona_residencia;

-- 4. ALERTAS 
-- 4.1 Meses atípicos por diagnóstico (casos > promedio + 2 desviaciones estándar)
--     Solo para los 5 diagnósticos más frecuentes.
WITH top_dx AS (
    SELECT id_dx_egreso FROM hospitalizacion
    GROUP BY id_dx_egreso ORDER BY COUNT(*) DESC LIMIT 5
), mensual AS (
    SELECT h.id_dx_egreso, DATE_FORMAT(h.fecha_ingreso, '%Y-%m') AS mes, COUNT(*) AS casos
    FROM hospitalizacion h JOIN top_dx t ON t.id_dx_egreso = h.id_dx_egreso
    GROUP BY h.id_dx_egreso, mes
), stats AS (
    SELECT id_dx_egreso, mes, casos,
           AVG(casos)         OVER (PARTITION BY id_dx_egreso) AS promedio,
           STDDEV_POP(casos)  OVER (PARTITION BY id_dx_egreso) AS desviacion
    FROM mensual
)
SELECT id_dx_egreso AS codigo, mes, casos, ROUND(promedio, 1) AS promedio,
       ROUND((casos - promedio) / NULLIF(desviacion, 0), 2) AS z_score
FROM stats
WHERE casos > promedio + 2 * desviacion
ORDER BY z_score DESC;

-- 4.2 Hospitalizaciones con estancia prolongada (> 30 días)
SELECT id_hospitalizacion, id_prestador, id_dx_egreso, fecha_ingreso, fecha_egreso, dias_estancia
FROM hospitalizacion
WHERE dias_estancia > 30
ORDER BY dias_estancia DESC
LIMIT 20;

-- 4.3 Carga hospitalaria mensual en pacientes-día (aproximación de ocupación)
SELECT DATE_FORMAT(fecha_ingreso, '%Y-%m') AS mes,
       SUM(dias_estancia) AS pacientes_dia
FROM hospitalizacion
GROUP BY mes
ORDER BY mes;

-- 5. BÚSQUEDA Y FILTROS
-- 5.1 Mujeres de 60+ años con EPOC (J44x) en 2022
SELECT h.id_hospitalizacion, h.fecha_ingreso, h.edad_anios, h.id_dx_egreso,
       h.dias_estancia, p.id_prestador, e.id_eps
FROM hospitalizacion h
JOIN prestador p ON p.id_prestador = h.id_prestador
JOIN eps e       ON e.id_eps       = h.id_eps
WHERE h.id_dx_egreso LIKE 'J44%'
  AND h.sexo = 'F'
  AND h.edad_anios >= 60
  AND h.fecha_ingreso BETWEEN '2022-01-01' AND '2022-12-31'
ORDER BY h.fecha_ingreso
LIMIT 50;

-- 5.2 Hospitalizaciones de un diagnóstico incluyendo diagnósticos secundarios
SELECT h.id_hospitalizacion, h.id_dx_egreso, x.tipo, x.codigo AS dx_adicional
FROM hospitalizacion h
JOIN hospitalizacion_diagnostico x ON x.id_hospitalizacion = h.id_hospitalizacion
WHERE h.id_dx_egreso = 'U071' AND x.tipo = 'RELACIONADO_1'
LIMIT 20;

-- 6. REPORTES / EXPORTACIÓN 
-- 6.1 Resumen ejecutivo por año y vía de ingreso
SELECT h.anio, v.nombre AS via_ingreso, COUNT(*) AS casos,
       ROUND(AVG(h.dias_estancia), 2) AS estancia_promedio,
       ROUND(100 * SUM(h.estado_salida = 2) / COUNT(*), 2) AS mortalidad_pct
FROM hospitalizacion h
JOIN via_ingreso v ON v.id_via = h.via_ingreso
GROUP BY h.anio, v.nombre
ORDER BY h.anio, casos DESC;

-- 7. COMPARADOR 
-- 7.1 Comparar prestadores (IPS)
SELECT p.id_prestador, COALESCE(p.nombre, 'sin nombre') AS prestador,
       COUNT(*) AS hospitalizaciones,
       ROUND(AVG(h.dias_estancia), 2) AS estancia_promedio,
       ROUND(100 * SUM(h.estado_salida = 2) / COUNT(*), 2) AS mortalidad_pct
FROM hospitalizacion h
JOIN prestador p ON p.id_prestador = h.id_prestador
GROUP BY p.id_prestador, p.nombre
ORDER BY hospitalizaciones DESC
LIMIT 10;

-- 7.2 Comparar EPS / EAPB
SELECT e.id_eps, COUNT(*) AS hospitalizaciones,
       ROUND(AVG(h.dias_estancia), 2) AS estancia_promedio,
       ROUND(100 * SUM(h.estado_salida = 2) / COUNT(*), 2) AS mortalidad_pct
FROM hospitalizacion h
JOIN eps e ON e.id_eps = h.id_eps
GROUP BY e.id_eps
ORDER BY hospitalizaciones DESC
LIMIT 10;

-- 7.3 Comparar periodos: 2019 (prepandemia) vs 2020 vs 2021 vs 2022
SELECT anio, COUNT(*) AS casos,
       SUM(id_dx_egreso = 'U071') AS covid19_virus_identificado,
       ROUND(AVG(dias_estancia), 2) AS estancia_promedio
FROM hospitalizacion
GROUP BY anio
ORDER BY anio;

-- 8. VISTAS PARA EL BACKEND 
-- Evitan repetir consultas complejas en la aplicación.
CREATE OR REPLACE VIEW vw_hospitalizaciones_mensuales AS
SELECT DATE_FORMAT(fecha_ingreso, '%Y-%m') AS mes,
       COUNT(*) AS hospitalizaciones,
       ROUND(AVG(dias_estancia), 2) AS estancia_promedio,
       SUM(estado_salida = 2) AS fallecidos
FROM hospitalizacion
GROUP BY DATE_FORMAT(fecha_ingreso, '%Y-%m');

CREATE OR REPLACE VIEW vw_hospitalizacion_detalle AS
SELECT h.id_hospitalizacion, h.fecha_ingreso, h.fecha_egreso, h.dias_estancia,
       h.sexo, h.edad_anios, h.zona_residencia, h.estado_salida,
       v.nombre AS via_ingreso, c.nombre AS causa_externa, tu.nombre AS tipo_usuario,
       h.id_dx_ingreso, h.id_dx_egreso, dx.descripcion AS dx_egreso_descripcion,
       p.id_prestador, p.nombre AS prestador,
       e.id_eps, e.nombre AS eps,
       m.id_municipio, m.nombre AS municipio, dep.nombre AS departamento
FROM hospitalizacion h
JOIN via_ingreso v     ON v.id_via = h.via_ingreso
JOIN causa_externa c   ON c.id_causa = h.causa_externa
JOIN tipo_usuario tu   ON tu.id_tipo_usuario = h.tipo_usuario
JOIN diagnostico dx    ON dx.codigo = h.id_dx_egreso
JOIN prestador p       ON p.id_prestador = h.id_prestador
JOIN eps e             ON e.id_eps = h.id_eps
LEFT JOIN municipio m  ON m.id_municipio = h.id_municipio
LEFT JOIN departamento dep ON dep.cod_depto = m.cod_depto;

-- Estancias probables: la fuente trae 1 fila por FACTURA. Cuando varias facturas
-- comparten prestador, fechas, hora, diagnósticos, sexo, edad, EPS y municipio se
-- consideran la misma estancia. Úsala para contar hospitalizaciones "reales".
CREATE OR REPLACE VIEW vw_estancia_unica AS
SELECT * FROM (
    SELECT h.*,
           ROW_NUMBER() OVER (
               PARTITION BY id_prestador, fecha_ingreso, hora_ingreso, fecha_egreso,
                            id_dx_ingreso, id_dx_egreso, sexo, edad_valor, unidad_edad,
                            id_municipio, id_eps
               ORDER BY id_hospitalizacion) AS nro_en_estancia
    FROM hospitalizacion h
) t
WHERE nro_en_estancia = 1;

-- Comparación: filas (facturas) vs estancias probables por año
SELECT f.anio, f.filas_facturas, e.estancias_probables
FROM (SELECT anio, COUNT(*) AS filas_facturas FROM hospitalizacion GROUP BY anio) f
JOIN (SELECT anio, COUNT(*) AS estancias_probables FROM vw_estancia_unica GROUP BY anio) e
  ON e.anio = f.anio
ORDER BY f.anio;

SELECT * FROM vw_hospitalizaciones_mensuales ORDER BY mes LIMIT 12;
