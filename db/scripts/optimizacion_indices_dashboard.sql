-- Índices para acelerar el Panel inteligente (/api/dashboard).
-- Ejecutar una sola vez sobre hospitalizacion_db. Si un índice ya existe, MySQL
-- devolverá un error para ese índice; se puede ignorar y seguir con el siguiente.
-- Son índices adicionales: no modifican ni borran datos.

USE hospitalizacion_db;

-- Filtro por año + agrupación por EPS y municipio (KPIs, filtros)
CREATE INDEX idx_hosp_anio_eps ON hospitalizacion (anio, id_eps);
CREATE INDEX idx_hosp_anio_municipio ON hospitalizacion (anio, id_municipio);

-- Ranking de diagnósticos (egreso e ingreso)
CREATE INDEX idx_hosp_dx_egreso ON hospitalizacion (id_dx_egreso);
CREATE INDEX idx_hosp_dx_ingreso ON hospitalizacion (id_dx_ingreso);

-- Vía de ingreso
CREATE INDEX idx_hosp_via ON hospitalizacion (via_ingreso);

-- Serie mensual (año + fecha de ingreso)
CREATE INDEX idx_hosp_anio_fecha ON hospitalizacion (anio, fecha_ingreso);

-- Índices de cobertura: permiten resolver el GROUP BY por año sin leer cada fila
-- (en la prueba, la vía de ingreso y los diagnósticos tardaban 7 s y 2,5 s por lectura aleatoria)
CREATE INDEX idx_hosp_anio_via ON hospitalizacion (anio, via_ingreso);
-- Incluyen dias_estancia para que el promedio de estancia también salga solo del índice
CREATE INDEX idx_hosp_anio_dx_egreso ON hospitalizacion (anio, id_dx_egreso, dias_estancia);
CREATE INDEX idx_hosp_anio_dx_ingreso ON hospitalizacion (anio, id_dx_ingreso, dias_estancia);

-- Módulo de alertas: picos por diagnóstico y mes, y estancias prolongadas ordenadas por días
CREATE INDEX idx_hosp_dx_fecha ON hospitalizacion (id_dx_egreso, fecha_ingreso);
CREATE INDEX idx_hosp_dias_estancia ON hospitalizacion (dias_estancia);

-- Diagnósticos de "Todos los años" (sin filtro de año): cubren diagnóstico + estancia
CREATE INDEX idx_hosp_dx_egreso_estancia ON hospitalizacion (id_dx_egreso, dias_estancia);
CREATE INDEX idx_hosp_dx_ingreso_estancia ON hospitalizacion (id_dx_ingreso, dias_estancia);

ANALYZE TABLE hospitalizacion;
