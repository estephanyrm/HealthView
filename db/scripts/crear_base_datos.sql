-- TAREA 6 - Crear la estructura de la base de datos (MySQL / MariaDB en XAMPP)
-- Proyecto: Plataforma Inteligente para la Gestión Hospitalaria y Analítica Clínica

-- Obligatorio: evita que las tildes se guarden mal desde la consola de MySQL
SET NAMES utf8mb4;

DROP DATABASE IF EXISTS hospitalizacion_db;
CREATE DATABASE hospitalizacion_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hospitalizacion_db;

-- 1) CATÁLOGOS GEOGRÁFICOS  (se crean primero: otras tablas los referencian)

CREATE TABLE departamento (
    cod_depto   CHAR(2)      NOT NULL,
    nombre      VARCHAR(60)  NULL,
    PRIMARY KEY (cod_depto)
) ENGINE=InnoDB;

CREATE TABLE municipio (
    id_municipio  CHAR(5)      NOT NULL COMMENT 'Código DIVIPOLA = depto(2)+municipio(3)',
    cod_depto     CHAR(2)      NOT NULL,
    cod_municipio CHAR(3)      NOT NULL,
    nombre        VARCHAR(80)  NULL,
    PRIMARY KEY (id_municipio),
    CONSTRAINT fk_municipio_depto
        FOREIGN KEY (cod_depto) REFERENCES departamento (cod_depto)
) ENGINE=InnoDB;

-- 2) ENTIDADES PRINCIPALES DE REFERENCIA

CREATE TABLE eps (
    id_eps   VARCHAR(12)  NOT NULL COMMENT 'Código EAPB tal como viene en la fuente',
    nombre   VARCHAR(120) NULL,
    PRIMARY KEY (id_eps)
) ENGINE=InnoDB;

CREATE TABLE prestador (
    id_prestador CHAR(12)     NOT NULL COMMENT 'Código de habilitación del prestador (IPS)',
    nombre       VARCHAR(150) NULL,
    id_municipio CHAR(5)      NOT NULL,
    PRIMARY KEY (id_prestador),
    CONSTRAINT fk_prestador_municipio
        FOREIGN KEY (id_municipio) REFERENCES municipio (id_municipio)
) ENGINE=InnoDB;

CREATE TABLE diagnostico (
    codigo       VARCHAR(10)  NOT NULL COMMENT 'Código CIE-10',
    descripcion  VARCHAR(255) NULL,
    grupo_cie10  CHAR(1)      NOT NULL COMMENT 'Letra inicial del código (capítulo/grupo CIE-10)',
    PRIMARY KEY (codigo)
) ENGINE=InnoDB;


-- 3) CATÁLOGOS DE CÓDIGOS FIJOS (valores del estándar RIPS; confirmar con el
--    diccionario de datos de la fuente, sobre todo tipo_usuario 6-8)

CREATE TABLE via_ingreso (
    id_via  TINYINT      NOT NULL,
    nombre  VARCHAR(60)  NOT NULL,
    PRIMARY KEY (id_via)
) ENGINE=InnoDB;

CREATE TABLE causa_externa (
    id_causa TINYINT      NOT NULL,
    nombre   VARCHAR(60)  NOT NULL,
    PRIMARY KEY (id_causa)
) ENGINE=InnoDB;

CREATE TABLE tipo_usuario (
    id_tipo_usuario TINYINT      NOT NULL,
    nombre          VARCHAR(80)  NOT NULL,
    PRIMARY KEY (id_tipo_usuario)
) ENGINE=InnoDB;

INSERT INTO via_ingreso (id_via, nombre) VALUES
 (1,'Urgencias'),(2,'Consulta externa o programada'),(3,'Remitido'),
 (4,'Nacimiento en la institución');

INSERT INTO causa_externa (id_causa, nombre) VALUES
 (1,'Accidente de trabajo'),(2,'Accidente de tránsito'),(3,'Accidente rábico'),
 (4,'Accidente ofídico'),(5,'Otro tipo de accidente'),(6,'Evento catastrófico'),
 (7,'Lesión por agresión'),(8,'Lesión autoinfligida'),
 (9,'Sospecha de maltrato físico'),(10,'Sospecha de abuso sexual'),
 (11,'Sospecha de violencia sexual'),(12,'Sospecha de maltrato emocional'),
 (13,'Enfermedad general'),(14,'Enfermedad profesional'),(15,'Otra');

INSERT INTO tipo_usuario (id_tipo_usuario, nombre) VALUES
 (1,'Contributivo'),(2,'Subsidiado'),(3,'Vinculado'),(4,'Particular'),
 (5,'Otro'),(6,'Víctima conflicto armado - contributivo'),
 (7,'Víctima conflicto armado - subsidiado'),
 (8,'Víctima conflicto armado - no asegurado');


-- 4) USUARIOS DE LA PLATAFORMA Y ROLES

CREATE TABLE rol (
    id_rol  TINYINT     NOT NULL AUTO_INCREMENT,
    nombre  VARCHAR(30) NOT NULL,
    PRIMARY KEY (id_rol),
    UNIQUE KEY uq_rol_nombre (nombre)
) ENGINE=InnoDB;

INSERT INTO rol (nombre) VALUES ('Administrador'),('Analista'),('Investigador'),('Médico');

CREATE TABLE usuario (
    id_usuario     INT          NOT NULL AUTO_INCREMENT,
    nombre         VARCHAR(100) NOT NULL,
    correo         VARCHAR(100) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL COMMENT 'NUNCA guardar la contraseña en texto plano',
    id_rol         TINYINT      NOT NULL,
    activo         TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id_usuario),
    UNIQUE KEY uq_usuario_correo (correo),
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
) ENGINE=InnoDB;


-- 5) TABLA CENTRAL: HOSPITALIZACION  (1 fila = 1 FACTURA de una atención hospitalaria;
--    varias facturas pueden pertenecer a la misma estancia, ver vw_estancia_unica)
--    No existe tabla paciente: el dataset no trae identificador de paciente,
--    por eso los datos demográficos viven aquí (decisión a documentar).

CREATE TABLE hospitalizacion (
    id_hospitalizacion BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero_factura     VARCHAR(25)  NULL COMMENT 'No es único en la fuente',
    id_prestador       CHAR(12)     NOT NULL,
    id_eps             VARCHAR(12)  NOT NULL,
    id_municipio       CHAR(5)      NULL COMMENT 'Municipio de residencia (NULL = sin dato)',
    via_ingreso        TINYINT      NOT NULL,
    causa_externa      TINYINT      NOT NULL,
    tipo_usuario       TINYINT      NOT NULL,
    fecha_ingreso      DATE         NOT NULL,
    hora_ingreso       TIME         NULL,
    fecha_egreso       DATE         NOT NULL,
    dias_estancia      INT GENERATED ALWAYS AS (DATEDIFF(fecha_egreso, fecha_ingreso)) STORED,
    estado_salida      TINYINT      NOT NULL COMMENT '1 = Vivo, 2 = Muerto',
    id_dx_ingreso      VARCHAR(10)  NOT NULL,
    id_dx_egreso       VARCHAR(10)  NOT NULL,
    sexo               CHAR(1)      NOT NULL,
    edad_valor         SMALLINT UNSIGNED NOT NULL,
    unidad_edad        TINYINT      NOT NULL COMMENT '1 = años, 2 = meses, 3 = días',
    edad_anios         SMALLINT UNSIGNED GENERATED ALWAYS AS (
                           CASE unidad_edad
                               WHEN 1 THEN edad_valor
                               WHEN 2 THEN FLOOR(edad_valor / 12)
                               ELSE FLOOR(edad_valor / 365)
                           END) STORED,
    zona_residencia    CHAR(1)      NOT NULL COMMENT 'U = Urbana, R = Rural',
    anio               SMALLINT     NOT NULL,
    PRIMARY KEY (id_hospitalizacion),
    KEY idx_hosp_fecha_ingreso (fecha_ingreso),
    KEY idx_hosp_prestador_fecha (id_prestador, fecha_ingreso),
    KEY idx_hosp_anio (anio),
    CONSTRAINT fk_hosp_prestador FOREIGN KEY (id_prestador) REFERENCES prestador (id_prestador),
    CONSTRAINT fk_hosp_eps       FOREIGN KEY (id_eps)       REFERENCES eps (id_eps),
    CONSTRAINT fk_hosp_municipio FOREIGN KEY (id_municipio) REFERENCES municipio (id_municipio),
    CONSTRAINT fk_hosp_via       FOREIGN KEY (via_ingreso)  REFERENCES via_ingreso (id_via),
    CONSTRAINT fk_hosp_causa     FOREIGN KEY (causa_externa) REFERENCES causa_externa (id_causa),
    CONSTRAINT fk_hosp_tipo_usr  FOREIGN KEY (tipo_usuario) REFERENCES tipo_usuario (id_tipo_usuario),
    CONSTRAINT fk_hosp_dx_ing    FOREIGN KEY (id_dx_ingreso) REFERENCES diagnostico (codigo),
    CONSTRAINT fk_hosp_dx_egr    FOREIGN KEY (id_dx_egreso)  REFERENCES diagnostico (codigo),
    CONSTRAINT ck_hosp_fechas  CHECK (fecha_egreso >= fecha_ingreso),
    CONSTRAINT ck_hosp_sexo    CHECK (sexo IN ('F','M')),
    CONSTRAINT ck_hosp_estado  CHECK (estado_salida IN (1,2)),
    CONSTRAINT ck_hosp_unidad  CHECK (unidad_edad IN (1,2,3)),
    CONSTRAINT ck_hosp_zona    CHECK (zona_residencia IN ('U','R'))
) ENGINE=InnoDB;


-- 6) TABLA PUENTE (N:M): diagnósticos adicionales de cada hospitalización
--    El dx principal de ingreso y egreso ya están como FK en hospitalizacion.

CREATE TABLE hospitalizacion_diagnostico (
    id_hospitalizacion BIGINT UNSIGNED NOT NULL,
    tipo   ENUM('RELACIONADO_1','RELACIONADO_2','RELACIONADO_3',
                'COMPLICACION','CAUSA_MUERTE') NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    PRIMARY KEY (id_hospitalizacion, tipo),
    KEY idx_hd_codigo (codigo),
    CONSTRAINT fk_hd_hosp FOREIGN KEY (id_hospitalizacion)
        REFERENCES hospitalizacion (id_hospitalizacion) ON DELETE CASCADE,
    CONSTRAINT fk_hd_dx FOREIGN KEY (codigo) REFERENCES diagnostico (codigo)
) ENGINE=InnoDB;

-- Verificación rápida de la estructura creada
SHOW TABLES;
