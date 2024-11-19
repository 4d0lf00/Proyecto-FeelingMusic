CREATE DATABASE IF NOT EXISTS feeling_music;
USE feeling_music;

-- Table: profesor
CREATE TABLE profesor (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(42),
  apellido VARCHAR(42),
  email VARCHAR(100) UNIQUE,
  tipo INT,
  especialidad VARCHAR(50)
);

-- Table: horarios
CREATE TABLE horarios (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dia INT,
  mes INT,
  annio INT,
  hora_inicio TIME,
  hora_fin TIME,
  estado VARCHAR(50),
  color VARCHAR(10)
);

-- Table: salas
CREATE TABLE salas (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(42),
  capacidad INT,
  profesor_id BIGINT,
  FOREIGN KEY (profesor_id) REFERENCES profesor(id)
);

-- Table: instrumentos
CREATE TABLE instrumentos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(20),
  profesor_id BIGINT,
  FOREIGN KEY (profesor_id) REFERENCES profesor(id)
);

-- Table: alumno
CREATE TABLE alumno (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(41),
  apellido VARCHAR(41),
  rut VARCHAR(10),
  numero_telefono VARCHAR(13),
  email VARCHAR(100) UNIQUE,
  comentarios TEXT
);

-- Table: modalidades
CREATE TABLE modalidades (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tipo VARCHAR(30)
);

-- Table: clases
CREATE TABLE clases (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50),
  modalidad_id BIGINT,
  instrumento_id BIGINT,
  horario_id BIGINT,
  profesor_id BIGINT,
  estado VARCHAR(15),
  fecha DATE,
  FOREIGN KEY (modalidad_id) REFERENCES modalidades(id),
  FOREIGN KEY (instrumento_id) REFERENCES instrumentos(id),
  FOREIGN KEY (horario_id) REFERENCES horarios(id),
  FOREIGN KEY (profesor_id) REFERENCES profesor(id)
);

-- Table: usuarios
CREATE TABLE usuarios (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email_personal VARCHAR(100),
  contrasena VARCHAR(50),
  tipo INT,
  alumno_id BIGINT,
  profesor_id BIGINT,
  FOREIGN KEY (alumno_id) REFERENCES alumno(id),
  FOREIGN KEY (profesor_id) REFERENCES profesor(id)
);

-- Table: asistencia
CREATE TABLE asistencia (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  alumno_id BIGINT,
  clase_id BIGINT,
  fecha DATE,
  hora_inicio TIME,
  hora_fin TIME,
  estado VARCHAR(20),
  profesor_id BIGINT,
  FOREIGN KEY (alumno_id) REFERENCES alumno(id),
  FOREIGN KEY (clase_id) REFERENCES clases(id),
  FOREIGN KEY (profesor_id) REFERENCES profesor(id)
);

-- Table: sala_instrumento
CREATE TABLE sala_instrumento (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sala_id BIGINT,
  instrumento_id BIGINT,
  FOREIGN KEY (sala_id) REFERENCES salas(id),
  FOREIGN KEY (instrumento_id) REFERENCES instrumentos(id)
);

-- Table: pagos
CREATE TABLE pagos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  monto INT,
  fecha_pago DATE,
  evidencia TEXT,
  profesor_id BIGINT,
  alumno_id BIGINT,
  FOREIGN KEY (profesor_id) REFERENCES profesor(id),
  FOREIGN KEY (alumno_id) REFERENCES alumno(id)
);

-- Table: profesor_horario
CREATE TABLE profesor_horario (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  profesor_id BIGINT,
  horario_id BIGINT,
  FOREIGN KEY (profesor_id) REFERENCES profesor(id),
  FOREIGN KEY (horario_id) REFERENCES horarios(id)
);

-- Table: sala_horario
CREATE TABLE sala_horario (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sala_id BIGINT,
  horario_id BIGINT,
  profesor_id BIGINT,
  clase_id BIGINT,
  FOREIGN KEY (sala_id) REFERENCES salas(id),
  FOREIGN KEY (horario_id) REFERENCES horarios(id),
  FOREIGN KEY (profesor_id) REFERENCES profesor(id),
  FOREIGN KEY (clase_id) REFERENCES clases(id)
);

