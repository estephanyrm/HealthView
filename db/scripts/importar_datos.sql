
-- TAREA 7 - Importar los datos (usa los CSV generados por 01_limpieza_datos.py)
--  2. Habilita LOCAL INFILE (ver guía, sección XAMPP) y abre el cliente así:
--        C:\xampp\mysql\bin\mysql.exe -u root --local-infile=1
--     Luego:  SOURCE C:/proyecto/sql/03_importar_datos.sql;
-- ORDEN: primero las tablas referenciadas, luego las que dependen de ellas.

USE hospitalizacion_db;

SET NAMES utf8mb4;
SET foreign_key_checks = 0;   -- acelera la carga; se verifica después en 04_validaciones.sql
SET unique_checks = 0;

-- 1. departamento 
LOAD DATA LOCAL INFILE "C:/Users/anyrm/OneDrive - Universidad Libre/Estephany/UNILIBRE/sexto semestre/pweb/db/datos_limpios/departamento.csv"
INTO TABLE departamento
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY '\\'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(cod_depto, nombre);

-- 2. municipio 
LOAD DATA LOCAL INFILE "C:/Users/anyrm/OneDrive - Universidad Libre/Estephany/UNILIBRE/sexto semestre/pweb/db/datos_limpios/municipio.csv"
INTO TABLE municipio
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY '\\'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(id_municipio, cod_depto, cod_municipio, nombre);

-- 3. eps 
LOAD DATA LOCAL INFILE "C:/Users/anyrm/OneDrive - Universidad Libre/Estephany/UNILIBRE/sexto semestre/pweb/db/datos_limpios/eps.csv"
INTO TABLE eps
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY '\\'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(id_eps, nombre);

-- 4. prestador 
LOAD DATA LOCAL INFILE "C:/Users/anyrm/OneDrive - Universidad Libre/Estephany/UNILIBRE/sexto semestre/pweb/db/datos_limpios/prestador.csv"
INTO TABLE prestador
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY '\\'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(id_prestador, nombre, id_municipio);

-- 5. diagnostico 
LOAD DATA LOCAL INFILE "C:/Users/anyrm/OneDrive - Universidad Libre/Estephany/UNILIBRE/sexto semestre/pweb/db/datos_limpios/diagnostico.csv"
INTO TABLE diagnostico
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY '\\'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(codigo, descripcion, grupo_cie10);

-- 6. hospitalizacion 
LOAD DATA LOCAL INFILE "C:/Users/anyrm/OneDrive - Universidad Libre/Estephany/UNILIBRE/sexto semestre/pweb/db/datos_limpios/hospitalizacion.csv"
INTO TABLE hospitalizacion
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY '\\'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(id_hospitalizacion, numero_factura, id_prestador, id_eps, id_municipio,
 via_ingreso, causa_externa, tipo_usuario, fecha_ingreso, hora_ingreso,
 fecha_egreso, estado_salida, id_dx_ingreso, id_dx_egreso, sexo,
 edad_valor, unidad_edad, zona_residencia, anio);

-- 7. hospitalizacion_diagnostico   
LOAD DATA LOCAL INFILE "C:/Users/anyrm/OneDrive - Universidad Libre/Estephany/UNILIBRE/sexto semestre/pweb/db/datos_limpios/hospitalizacion_diagnostico.csv"
INTO TABLE hospitalizacion_diagnostico
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY '\\'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(id_hospitalizacion, codigo, tipo);

SET unique_checks = 1;
SET foreign_key_checks = 1;

-- Conteo rápido por tabla 
SELECT 'departamento' AS tabla, COUNT(*) AS filas FROM departamento
UNION ALL SELECT 'municipio', COUNT(*) FROM municipio
UNION ALL SELECT 'eps', COUNT(*) FROM eps
UNION ALL SELECT 'prestador', COUNT(*) FROM prestador
UNION ALL SELECT 'diagnostico', COUNT(*) FROM diagnostico
UNION ALL SELECT 'hospitalizacion', COUNT(*) FROM hospitalizacion
UNION ALL SELECT 'hospitalizacion_diagnostico', COUNT(*) FROM hospitalizacion_diagnostico;
