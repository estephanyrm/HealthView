-- =============================================================================
-- HEALTHVIEW: MÓDULOS DE ALERTAS, BÚSQUEDA AVANZADA Y REPORTES
-- Compatibilidad total con hospitalizacion_db (MySQL 8+ / MariaDB 10.4+ en XAMPP)
-- Respeta 100% las convenciones de nombres, tipos y restricciones existentes.
-- =============================================================================

SET NAMES utf8mb4;
USE hospitalizacion_db;

-- -----------------------------------------------------------------------------
-- 1. ÍNDICES DE RENDIMIENTO PARA FILTROS AVANZADOS Y ALERTAS
-- -----------------------------------------------------------------------------
-- Permiten filtrar sobre 830k filas en milisegundos sin alterar la estructura.

SET @existe_idx1 = (SELECT COUNT(*) FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() AND table_name = 'hospitalizacion' 
                    AND index_name = 'idx_hosp_busqueda_dx_demog');
SET @sql_idx1 = IF(@existe_idx1 = 0, 
    'CREATE INDEX idx_hosp_busqueda_dx_demog ON hospitalizacion (id_dx_egreso, sexo, edad_anios, anio)', 
    'SELECT "El índice idx_hosp_busqueda_dx_demog ya existe"');
PREPARE stmt1 FROM @sql_idx1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

SET @existe_idx2 = (SELECT COUNT(*) FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() AND table_name = 'hospitalizacion' 
                    AND index_name = 'idx_hosp_dias_estancia');
SET @sql_idx2 = IF(@existe_idx2 = 0, 
    'CREATE INDEX idx_hosp_dias_estancia ON hospitalizacion (dias_estancia, estado_salida)', 
    'SELECT "El índice idx_hosp_dias_estancia ya existe"');
PREPARE stmt2 FROM @sql_idx2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;


-- -----------------------------------------------------------------------------
-- 2. VISTAS ESPECIALIZADAS PARA ALERTAS Y REPORTES
-- -----------------------------------------------------------------------------

-- Vista 1: Pacientes con Estancia Prolongada (> 30 días) para Alertas Clínicas
CREATE OR REPLACE VIEW vw_alertas_estancias_criticas AS
SELECT 
    h.id_hospitalizacion,
    h.numero_factura,
    h.fecha_ingreso,
    h.fecha_egreso,
    h.dias_estancia,
    h.sexo,
    h.edad_anios,
    h.zona_residencia,
    CASE h.estado_salida WHEN 1 THEN 'Vivo' ELSE 'Fallecido' END AS estado_salida_desc,
    h.id_prestador,
    COALESCE(p.nombre, 'Sin nombre registrado') AS prestador_nombre,
    h.id_eps,
    COALESCE(e.nombre, h.id_eps) AS eps_nombre,
    h.id_municipio,
    COALESCE(m.nombre, h.id_municipio) AS municipio_nombre,
    h.id_dx_egreso,
    COALESCE(dx.descripcion, 'Sin descripción') AS dx_egreso_desc,
    CASE 
        WHEN h.dias_estancia >= 60 THEN 'Crítica'
        WHEN h.dias_estancia >= 45 THEN 'Alta'
        ELSE 'Moderada'
    END AS severidad_alerta
FROM hospitalizacion h
LEFT JOIN prestador p   ON p.id_prestador = h.id_prestador
LEFT JOIN eps e         ON e.id_eps = h.id_eps
LEFT JOIN municipio m   ON m.id_municipio = h.id_municipio
LEFT JOIN diagnostico dx ON dx.codigo = h.id_dx_egreso
WHERE h.dias_estancia >= 30;


-- Vista 2: Resumen Ejecutivo por Año y Vía de Ingreso para Exportación
CREATE OR REPLACE VIEW vw_reporte_ejecutivo_anual AS
SELECT 
    h.anio,
    h.via_ingreso,
    v.nombre AS via_ingreso_nombre,
    COUNT(*) AS total_hospitalizaciones,
    ROUND(AVG(h.dias_estancia), 2) AS estancia_promedio_dias,
    SUM(h.estado_salida = 1) AS egresos_vivos,
    SUM(h.estado_salida = 2) AS fallecidos,
    ROUND(100.0 * SUM(h.estado_salida = 2) / COUNT(*), 2) AS tasa_mortalidad_pct
FROM hospitalizacion h
JOIN via_ingreso v ON v.id_via = h.via_ingreso
GROUP BY h.anio, h.via_ingreso, v.nombre;


-- Vista 3: Consolidado Epidemiológico de Diagnósticos Más Frecuentes
CREATE OR REPLACE VIEW vw_reporte_epidemiologico_dx AS
SELECT 
    h.id_dx_egreso AS codigo_cie10,
    COALESCE(dx.descripcion, 'Sin descripción') AS diagnostico,
    dx.grupo_cie10 AS capitulo_cie10,
    h.anio,
    COUNT(*) AS total_casos,
    ROUND(AVG(h.dias_estancia), 2) AS estancia_promedio_dias,
    SUM(h.estado_salida = 2) AS total_fallecidos,
    ROUND(100.0 * SUM(h.estado_salida = 2) / COUNT(*), 2) AS tasa_mortalidad_pct
FROM hospitalizacion h
LEFT JOIN diagnostico dx ON dx.codigo = h.id_dx_egreso
GROUP BY h.id_dx_egreso, dx.descripcion, dx.grupo_cie10, h.anio;


-- -----------------------------------------------------------------------------
-- 3. CONSULTAS SQL DE REFERENCIA PARA LOS NUEVOS MÓDULOS
-- -----------------------------------------------------------------------------

-- A. SISTEMA DE ALERTAS: Detección de picos inusuales (Z-Score > 2.0)
-- Retorna anomalías estadísticas mensuales sobre los diagnósticos más prevalentes.
WITH top_dx AS (
    SELECT id_dx_egreso 
    FROM hospitalizacion 
    GROUP BY id_dx_egreso 
    ORDER BY COUNT(*) DESC 
    LIMIT 10
),
mensual AS (
    SELECT h.id_dx_egreso,
           DATE_FORMAT(h.fecha_ingreso, '%Y-%m') AS mes,
           COUNT(*) AS casos
    FROM hospitalizacion h
    JOIN top_dx t ON t.id_dx_egreso = h.id_dx_egreso
    GROUP BY h.id_dx_egreso, mes
),
stats AS (
    SELECT m.id_dx_egreso,
           m.mes,
           m.casos,
           AVG(m.casos) OVER (PARTITION BY m.id_dx_egreso) AS promedio_casos,
           STDDEV_POP(m.casos) OVER (PARTITION BY m.id_dx_egreso) AS desviacion_std
    FROM mensual m
)
SELECT s.id_dx_egreso,
       d.descripcion,
       s.mes,
       s.casos,
       ROUND(s.promedio_casos, 1) AS promedio_esperado,
       ROUND((s.casos - s.promedio_casos) / NULLIF(s.desviacion_std, 0), 2) AS z_score,
       CASE 
           WHEN (s.casos - s.promedio_casos) / NULLIF(s.desviacion_std, 0) >= 3.0 THEN 'Crítica'
           ELSE 'Alta'
       END AS severidad
FROM stats s
LEFT JOIN diagnostico d ON d.codigo = s.id_dx_egreso
WHERE s.casos > (s.promedio_casos + 2.0 * s.desviacion_std)
  AND s.desviacion_std > 0
ORDER BY z_score DESC;


-- B. BÚSQUEDA AVANZADA MULTICRITERIO:
-- Ejemplo clínico: Mujeres adultas mayores (60+) con EPOC (J44x) y estancia > 5 días
SELECT 
    h.id_hospitalizacion,
    h.fecha_ingreso,
    h.fecha_egreso,
    h.dias_estancia,
    h.edad_anios,
    h.sexo,
    h.id_dx_egreso,
    d.descripcion AS diagnostico_egreso,
    p.nombre AS prestador,
    e.nombre AS eps,
    m.nombre AS municipio
FROM hospitalizacion h
JOIN prestador p   ON p.id_prestador = h.id_prestador
JOIN eps e         ON e.id_eps = h.id_eps
LEFT JOIN municipio m ON m.id_municipio = h.id_municipio
JOIN diagnostico d ON d.codigo = h.id_dx_egreso
WHERE h.id_dx_egreso LIKE 'J44%'
  AND h.sexo = 'F'
  AND h.edad_anios >= 60
  AND h.dias_estancia >= 5
ORDER BY h.fecha_ingreso DESC
LIMIT 50;


-- C. REPORTE COMPILADO PARA EXPORTACIÓN A EXCEL / PDF:
-- Desglose por aseguradora (EPS) con volumen, estancia media y desenlaces clínicos.
SELECT 
    e.id_eps,
    COALESCE(e.nombre, e.id_eps) AS eps_nombre,
    COUNT(*) AS total_hospitalizaciones,
    ROUND(AVG(h.dias_estancia), 2) AS estancia_promedio_dias,
    SUM(h.estado_salida = 2) AS defunciones,
    ROUND(100.0 * SUM(h.estado_salida = 2) / COUNT(*), 2) AS tasa_mortalidad_pct
FROM hospitalizacion h
JOIN eps e ON e.id_eps = h.id_eps
GROUP BY e.id_eps, e.nombre
ORDER BY total_hospitalizaciones DESC;

-- Confirmación de vistas y funcionamiento
SELECT 'Módulos de Alertas, Búsqueda y Reportes configurados con éxito.' AS estado;
