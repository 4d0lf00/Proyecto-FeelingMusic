-- Quitar los comentarios respectivos si no se ha creado la BD
-- create DATABASE feeling_music;
use feeling_music;

-- Table: horarios
CREATE TABLE horarios (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,       -- Identificador único del horario
  dia INT,                                    -- Día del mes (1 a 31)
  mes INT,                                    -- Mes del año (1 a 12)
  annio INT,                                  -- Año (ej. 2024)
  hora_inicio TIME,                           -- Hora de inicio del horario
  hora_fin TIME,                              -- Hora de fin del horario
  estado VARCHAR(255),                        -- Estado del horario (disponible, ocupado, reservado)
  color VARCHAR(255)                          -- Color representativo del estado
);


-- Table: profesor
CREATE TABLE profesor (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,       -- Identificador único del profesor
  nombre VARCHAR(255),                        -- Nombre del profesor
  apellido VARCHAR(255),                      -- Apellido del profesor
  email VARCHAR(255) UNIQUE,                  -- Correo electrónico del profesor (debe ser único)
  tipo INT,                                   -- Tipo de profesor
  especialidad VARCHAR(255)                   -- Especialidad del profesor
);

-- Table: salas
CREATE TABLE salas (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,       -- Identificador único de la sala
  nombre VARCHAR(255),                        -- Nombre de la sala (ej. "Sala 1")
  capacidad INT,                              -- Número máximo de alumnos que puede albergar
  profesor_id BIGINT,                         -- Referencia al profesor asignado a la sala
  FOREIGN KEY (profesor_id) REFERENCES profesor(id)
);

-- Table: instrumentos
CREATE TABLE instrumentos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,       -- Identificador único del instrumento
  nombre VARCHAR(255),                        -- Nombre del instrumento (ej. "Guitarra")
  profesor_id BIGINT,                         -- Referencia al profesor que enseña el instrumento
  FOREIGN KEY (profesor_id) REFERENCES profesor(id)
);

-- Table: sala_instrumento
CREATE TABLE sala_instrumento (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,       -- Identificador único de la relación
  sala_id BIGINT,                             -- Referencia a la sala
  instrumento_id BIGINT,                      -- Referencia al instrumento
  FOREIGN KEY (sala_id) REFERENCES salas(id),
  FOREIGN KEY (instrumento_id) REFERENCES instrumentos(id)
);

-- Table: alumno
CREATE TABLE alumno (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,       -- Identificador único del alumno
  nombre VARCHAR(255),                        -- Nombre del alumno
  apellido1 VARCHAR(255),                     -- Primer apellido del alumno
  apellido2 VARCHAR(255),                     -- Segundo apellido del alumno
  rut VARCHAR(255),                           -- RUT (número de identificación chileno)
  numero_telefono VARCHAR(15),                -- Número de teléfono del alumno
  email VARCHAR(255) UNIQUE,                  -- Correo electrónico del alumno (debe ser único)
  fecha_nacimiento DATE,                      -- Fecha de nacimiento del alumno
  comentarios TEXT                            -- Notas adicionales sobre el alumno
);



-- Table: pagos
CREATE TABLE pagos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,       -- Identificador único del pago
  monto DECIMAL(10, 2),                       -- Cantidad de dinero pagada
  fecha_pago DATE,                            -- Fecha en la que se realizó el pago
  evidencia TEXT,                             -- Información o archivo que evidencia el pago
  profesor_id BIGINT,                         -- Referencia al profesor relacionado con el pago
  alumno_id BIGINT,                           -- Referencia al alumno que realizó el pago
  FOREIGN KEY (profesor_id) REFERENCES profesor(id),
  FOREIGN KEY (alumno_id) REFERENCES alumno(id)
);

-- Table: modalidades
CREATE TABLE modalidades (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,       -- Identificador único de la modalidad
  tipo VARCHAR(255)                           -- Tipo de modalidad (individual, grupal)
);

-- Table: clases
CREATE TABLE clases (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,       -- Identificador único de la clase
  nombre VARCHAR(255),                        -- Nombre de la clase (ej. "Clase de Guitarra")
  modalidad_id BIGINT,                        -- Referencia a la modalidad de la clase
  instrumento_id BIGINT,                      -- Referencia al instrumento que se enseña
  horario_id BIGINT,                          -- Referencia al horario en el que se imparte la clase
  profesor_id BIGINT,                         -- Referencia al profesor que imparte la clase
  estado VARCHAR(255),                        -- Estado de la clase (activa, inactiva)
  fecha DATE,                                 -- Fecha de la clase
  FOREIGN KEY (modalidad_id) REFERENCES modalidades(id),
  FOREIGN KEY (instrumento_id) REFERENCES instrumentos(id),
  FOREIGN KEY (horario_id) REFERENCES horarios(id),
  FOREIGN KEY (profesor_id) REFERENCES profesor(id)
);




-- Table: usuarios
CREATE TABLE usuarios (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,       -- Identificador único del usuario
  email_personal VARCHAR(255),                -- Correo electrónico del usuario para login
  contrasena VARCHAR(255),                    -- Contraseña del usuario (debe ser encriptada)
  tipo INT,                                   -- Tipo de usuario (1: administrador, 2: profesor, 3: alumno)
  alumno_id BIGINT,                           -- Referencia al alumno (si es un usuario alumno)
  profesor_id BIGINT,                         -- Referencia al profesor (si es un usuario profesor)
  FOREIGN KEY (alumno_id) REFERENCES alumno(id),
  FOREIGN KEY (profesor_id) REFERENCES profesor(id)
);

-- Table: asistencia
CREATE TABLE asistencia (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,       -- Identificador único de la asistencia
  alumno_id BIGINT,                           -- Referencia al alumno
  clase_id BIGINT,                            -- Referencia a la clase a la que asiste el alumno
  fecha DATE,                                 -- Fecha de la clase
  hora_inicio TIME,                           -- Hora de inicio de la clase
  hora_fin TIME,                              -- Hora de fin de la clase
  estado VARCHAR(255),                        -- Estado de la asistencia (presente, ausente, justificado)
  profesor_id BIGINT,                         -- Referencia al profesor que toma la asistencia
  FOREIGN KEY (alumno_id) REFERENCES alumno(id),
  FOREIGN KEY (clase_id) REFERENCES clases(id),
  FOREIGN KEY (profesor_id) REFERENCES profesor(id)
);

-- Table: profesor_horario
CREATE TABLE profesor_horario (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,       -- Identificador único de la relación
  profesor_id BIGINT,                         -- Referencia al profesor
  horario_id BIGINT,                          -- Referencia al horario que se le asigna al profesor
  FOREIGN KEY (profesor_id) REFERENCES profesor(id),
  FOREIGN KEY (horario_id) REFERENCES horarios(id)
);

-- Table: sala_horario
CREATE TABLE sala_horario (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,       -- Identificador único de la relación
  sala_id BIGINT,                             -- Referencia a la sala
  horario_id BIGINT,                          -- Referencia al horario
  profesor_id BIGINT,                         -- Referencia al profesor que utiliza la sala en ese horario
  clase_id BIGINT,                            -- Referencia a la clase que se imparte en ese horario
  FOREIGN KEY (sala_id) REFERENCES salas(id),
  FOREIGN KEY (horario_id) REFERENCES horarios(id),
  FOREIGN KEY (profesor_id) REFERENCES profesor(id),
  FOREIGN KEY (clase_id) REFERENCES clases(id)
);

--poblacion tablas de prueba
INSERT INTO `feeling_music`.`profesor`
(`id`,
`nombre`,
`apellido`,
`email`,
`tipo`,
`especialidad`)
VALUES
(1,
'pedro',
'pedraza',
'p.pedraza@gmail.com',
1,
'guitarra');