CREATE TABLE `horarios` (
  `id` bigint PRIMARY KEY,
  `dia` text,
  `mes` text,
  `annio` text,
  `hora_inicio` time,
  `hora_fin` time
);

CREATE TABLE `salas` (
  `id` bigint PRIMARY KEY,
  `nombre` text,
  `capacidad` int,
  `profesor_id` bigint,
  `alumno_id` bigint,
  `horario_id` bigint
);

CREATE TABLE `instrumentos` (
  `id` bigint PRIMARY KEY,
  `nombre` text,
  `profesor_id` bigint,
  `sala_id` bigint,
  `alumno_id` bigint,
  `horario_id` bigint
);

CREATE TABLE `pagos` (
  `id` bigint PRIMARY KEY,
  `monto` numeric,
  `fecha_pago` date,
  `profesor_id` bigint,
  `alumno_id` bigint
);

CREATE TABLE `modalidades` (
  `id` bigint PRIMARY KEY,
  `tipo` text COMMENT 'individual, grupal'
);

CREATE TABLE `administrador` (
  `id` bigint PRIMARY KEY,
  `nombre` text,
  `apellido` text,
  `email` text UNIQUE,
  `tipo` int
);

CREATE TABLE `profesor` (
  `id` bigint PRIMARY KEY,
  `nombre` text,
  `apellido` text,
  `email` text UNIQUE,
  `tipo` int,
  `especialidad` text
);

CREATE TABLE `alumno` (
  `id` bigint PRIMARY KEY,
  `nombre` text,
  `apellido1` text,
  `apellido2` text,
  `rut` text,
  `numero_telefono` int,
  `email` text UNIQUE,
  `fecha_nacimiento` date,
  `comentarios` text
);

CREATE TABLE `usuarios` (
  `id` bigint PRIMARY KEY,
  `email_personal` text,
  `contrasena` text,
  `tipo` int
);

CREATE TABLE `asistencia` (
  `id` bigint,
  `dia` text,
  `mes` text,
  `annio` text,
  `hora_inicio` time,
  `hora_fin` time,
  `comentarios` text
);

ALTER TABLE `salas` ADD FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`);

ALTER TABLE `salas` ADD FOREIGN KEY (`alumno_id`) REFERENCES `alumno` (`id`);

ALTER TABLE `salas` ADD FOREIGN KEY (`horario_id`) REFERENCES `horarios` (`id`);

ALTER TABLE `instrumentos` ADD FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`);

ALTER TABLE `instrumentos` ADD FOREIGN KEY (`sala_id`) REFERENCES `salas` (`id`);

ALTER TABLE `instrumentos` ADD FOREIGN KEY (`alumno_id`) REFERENCES `alumno` (`id`);

ALTER TABLE `instrumentos` ADD FOREIGN KEY (`horario_id`) REFERENCES `horarios` (`id`);

ALTER TABLE `pagos` ADD FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`);

ALTER TABLE `pagos` ADD FOREIGN KEY (`alumno_id`) REFERENCES `alumno` (`id`);
