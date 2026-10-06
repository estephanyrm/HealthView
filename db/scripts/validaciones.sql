-- TAREA 8 - Validar y revisar la información

SET NAMES utf8mb4;
USE hospitalizacion_db;

-- 8.1 Cantidad de registros por tabla
SELECT 'hospitalizacion' AS tabla, COUNT(*) AS filas FROM hospitalizacion
UNION ALL SELECT 'hospitalizacion_diagnostico', COUNT(*) FROM hospitalizacion_diagnostico
UNION ALL SELECT 'diagnostico', COUNT(*) FROM diagnostico
UNION ALL SELECT 'prestador', COUNT(*) FROM prestador
UNION ALL SELECT 'eps', COUNT(*) FROM eps
UNION ALL SELECT 'municipio', COUNT(*) FROM municipio
UNION ALL SELECT 'departamento', COUNT(*) FROM departamento;

-- 8.2 Registros huérfanos 
SELECT 'hosp sin prestador' AS prueba, COUNT(*) AS huerfanos
FROM hospitalizacion h LEFT JOIN prestador p ON p.id_prestador = h.id_prestador
WHERE p.id_prestador IS NULL
UNION ALL
SELECT 'hosp sin eps', COUNT(*)
FROM hospitalizacion h LEFT JOIN eps e ON e.id_eps = h.id_eps
WHERE e.id_eps IS NULL
UNION ALL
SELECT 'hosp con municipio inexistente', COUNT(*)
FROM hospitalizacion h LEFT JOIN municipio m ON m.id_municipio = h.id_municipio
WHERE h.id_municipio IS NOT NULL AND m.id_municipio IS NULL
UNION ALL
SELECT 'hosp sin dx egreso', COUNT(*)
FROM hospitalizacion h LEFT JOIN diagnostico d ON d.codigo = h.id_dx_egreso
WHERE d.codigo IS NULL
UNION ALL
SELECT 'hosp sin dx ingreso', COUNT(*)
FROM hospitalizacion h LEFT JOIN diagnostico d ON d.codigo = h.id_dx_ingreso
WHERE d.codigo IS NULL
UNION ALL
SELECT 'puente sin hospitalizacion', COUNT(*)
FROM hospitalizacion_diagnostico x LEFT JOIN hospitalizacion h ON h.id_hospitalizacion = x.id_hospitalizacion
WHERE h.id_hospitalizacion IS NULL
UNION ALL
SELECT 'puente sin diagnostico', COUNT(*)
FROM hospitalizacion_diagnostico x LEFT JOIN diagnostico d ON d.codigo = x.codigo
WHERE d.codigo IS NULL
UNION ALL
SELECT 'prestador sin municipio', COUNT(*)
FROM prestador p LEFT JOIN municipio m ON m.id_municipio = p.id_municipio
WHERE m.id_municipio IS NULL
UNION ALL
SELECT 'municipio sin departamento', COUNT(*)
FROM municipio m LEFT JOIN departamento d ON d.cod_depto = m.cod_depto
WHERE d.cod_depto IS NULL;

-- 8.3 Valores vacíos (NULL) esperados por columna 
SELECT
    SUM(numero_factura IS NULL) AS sin_factura,
    SUM(hora_ingreso   IS NULL) AS sin_hora,
    SUM(id_municipio   IS NULL) AS sin_municipio,
    COUNT(*)                    AS total
FROM hospitalizacion;

-- 8.4 Rangos y consistencia 
SELECT MIN(fecha_ingreso) AS ingreso_min, MAX(fecha_ingreso) AS ingreso_max,
       MIN(fecha_egreso)  AS egreso_min,  MAX(fecha_egreso)  AS egreso_max,
       MIN(dias_estancia) AS estancia_min, MAX(dias_estancia) AS estancia_max,
       MIN(edad_anios)    AS edad_min,     MAX(edad_anios)    AS edad_max
FROM hospitalizacion;

-- Debe ser 0: el campo anio coincide con el año de la fecha de ingreso
SELECT COUNT(*) AS anio_inconsistente
FROM hospitalizacion WHERE anio <> YEAR(fecha_ingreso);

-- Debe ser 0: fallecidos sin causa básica de muerte registrada
SELECT COUNT(*) AS muertos_sin_causa
FROM hospitalizacion h
LEFT JOIN hospitalizacion_diagnostico x
       ON x.id_hospitalizacion = h.id_hospitalizacion AND x.tipo = 'CAUSA_MUERTE'
WHERE h.estado_salida = 2 AND x.codigo IS NULL;

-- 8.5 Distribución de valores categóricos 
SELECT anio, COUNT(*) AS hospitalizaciones FROM hospitalizacion GROUP BY anio ORDER BY anio;
SELECT sexo, COUNT(*) AS total FROM hospitalizacion GROUP BY sexo;
SELECT v.nombre AS via_ingreso, COUNT(*) AS total
FROM hospitalizacion h JOIN via_ingreso v ON v.id_via = h.via_ingreso
GROUP BY v.nombre ORDER BY total DESC;

-- 8.6 Duplicados: con la misma llave usada en la limpieza debe dar 0 
SELECT COUNT(*) AS grupos_duplicados FROM (
    SELECT id_prestador, numero_factura, fecha_ingreso, hora_ingreso, fecha_egreso,
           id_dx_ingreso, id_dx_egreso, sexo, id_eps, id_municipio
    FROM hospitalizacion
    WHERE numero_factura IS NOT NULL
    GROUP BY id_prestador, numero_factura, fecha_ingreso, hora_ingreso, fecha_egreso,
             id_dx_ingreso, id_dx_egreso, sexo, id_eps, id_municipio
    HAVING COUNT(*) > 1
) t;

-- 8.7 Prueba de integridad: la BD debe RECHAZAR datos inválidos ---------------
-- (descomenta una a la vez; cada una debe dar error y no insertar nada)
-- INSERT INTO hospitalizacion (id_prestador,id_eps,via_ingreso,causa_externa,tipo_usuario,fecha_ingreso,fecha_egreso,estado_salida,id_dx_ingreso,id_dx_egreso,sexo,edad_valor,unidad_edad,zona_residencia,anio)
-- VALUES ('999999999999','EPS010',1,13,1,'2022-01-01','2022-01-02',1,'A000','A000','F',30,1,'U',2022);   -- prestador inexistente
-- INSERT INTO hospitalizacion (id_prestador,id_eps,via_ingreso,causa_externa,tipo_usuario,fecha_ingreso,fecha_egreso,estado_salida,id_dx_ingreso,id_dx_egreso,sexo,edad_valor,unidad_edad,zona_residencia,anio)
-- SELECT id_prestador,id_eps,1,13,1,'2022-01-10','2022-01-02',1,id_dx_egreso,id_dx_egreso,'F',30,1,'U',2022
-- FROM hospitalizacion LIMIT 1;                                                                           -- egreso antes del ingreso
