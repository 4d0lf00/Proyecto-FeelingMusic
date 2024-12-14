-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 14-12-2024 a las 00:00:14
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `feeling_music`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alumno`
--

CREATE TABLE `alumno` (
  `id` bigint(20) NOT NULL,
  `nombre` varchar(41) DEFAULT NULL,
  `apellido` varchar(41) DEFAULT NULL,
  `rut` varchar(10) DEFAULT NULL,
  `numero_telefono` varchar(13) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `comentarios` text DEFAULT NULL,
  `fecha_registro` datetime DEFAULT current_timestamp(),
  `profesor_id` bigint(20) DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `alumno`
--

INSERT INTO `alumno` (`id`, `nombre`, `apellido`, `rut`, `numero_telefono`, `email`, `comentarios`, `fecha_registro`, `profesor_id`, `estado`) VALUES
(9, 'renata', 'caro', '20823516-9', '+56934884222', 'renatacaro@gmail.com', 'porfavor dios', '2024-11-25 03:19:25', 12, 'activo'),
(11, 'adolfo', 'venegas', '20752557-k', '+56934884214', 'adolfoignacio.vg@gmail.com', 'porfavor dios', '2024-11-25 03:42:02', 12, 'activo'),
(12, 'lolito', 'bambio', '21456789-7', '+56986548978', 'moanalindapreciosa@gmail.com', 'test', '2024-11-25 21:47:39', 27, 'activo'),
(13, 'bambi', 'potona', '12345678-9', '+56934884123', 'ad.venegas@duocuc.cl', 'aaaaa', '2024-11-25 21:52:43', 27, 'activo'),
(14, 'asdasd', 'asdasd', '1356789-8', '+56934884233', 'asdasd@gmail.com', 'sdfssdf', '2024-11-25 21:59:42', 27, 'activo'),
(15, 'matias', 'torrres', '19878587-9', '+56934884321', 'mati.torres@duocuc.cl', 'asadasdas', '2024-11-25 23:12:30', 27, 'activo'),
(16, 'pedrito', 'miguel', '12345678-9', '+56988776655', 'miguelpedro@gmail.com', 'vive muy lejos', '2024-12-12 02:23:29', 27, 'activo'),
(17, 'fgh', 'fghfgh', '20752557-1', '+56934884222', 'fghfghf@wom.cl', 'sdfsd', '2024-12-12 02:45:55', 27, 'activo'),
(18, 'wekitox', 'weko', '20752667-5', '+56988776677', 'wekitos@gmail.com', 'asdasd', '2024-12-12 03:09:59', 32, 'activo'),
(19, 'jacqueline', 'torre', '19057557-9', '+56987451256', 'jac@gmail.com', 'torres', '2024-12-12 17:40:33', 32, 'activo'),
(20, 'fdggfd', 'ffgdgfdgfd', '20897654-8', '+56987215456', 'fdfgdgfgfd@wom.cl', 'ghgfh', '2024-12-12 17:45:57', 32, 'activo'),
(21, 'ghjjhg', 'hgghjjhghgjghjghj', '20867654-8', '+56987215458', 'hgjhgjhgjh@wom.cl', 'hfghg', '2024-12-12 17:48:42', 32, 'activo');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asistencia`
--

CREATE TABLE `asistencia` (
  `id` bigint(20) NOT NULL,
  `alumno_id` bigint(20) DEFAULT NULL,
  `clase_id` bigint(20) DEFAULT NULL,
  `fecha` date DEFAULT NULL,
  `hora_inicio` time DEFAULT NULL,
  `hora_fin` time DEFAULT NULL,
  `estado` varchar(20) DEFAULT NULL,
  `profesor_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clases`
--

CREATE TABLE `clases` (
  `id` bigint(20) NOT NULL,
  `nombre` varchar(50) DEFAULT NULL,
  `modalidad_id` bigint(20) DEFAULT NULL,
  `instrumento_id` bigint(20) DEFAULT NULL,
  `horario_id` bigint(20) DEFAULT NULL,
  `profesor_id` bigint(20) DEFAULT NULL,
  `estado` varchar(15) DEFAULT NULL,
  `fecha` date DEFAULT NULL,
  `alumno_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `clases`
--

INSERT INTO `clases` (`id`, `nombre`, `modalidad_id`, `instrumento_id`, `horario_id`, `profesor_id`, `estado`, `fecha`, `alumno_id`) VALUES
(1, 'Clase de guitarra', 8, 19, 13, 32, 'activo', '2024-12-15', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `horarios`
--

CREATE TABLE `horarios` (
  `id` bigint(20) NOT NULL,
  `dia` int(11) DEFAULT NULL,
  `mes` int(11) DEFAULT NULL,
  `annio` int(11) DEFAULT NULL,
  `hora_inicio` time DEFAULT NULL,
  `hora_fin` time DEFAULT NULL,
  `estado` varchar(50) DEFAULT NULL,
  `color` varchar(10) DEFAULT NULL,
  `profesor_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `horarios`
--

INSERT INTO `horarios` (`id`, `dia`, `mes`, `annio`, `hora_inicio`, `hora_fin`, `estado`, `color`, `profesor_id`) VALUES
(1, 7, 11, 2024, '23:00:00', '00:00:00', NULL, NULL, 12),
(2, 30, 11, 202, '10:50:00', '11:50:00', NULL, NULL, 13),
(3, 30, 11, 2024, '10:50:00', '12:50:00', NULL, NULL, 13),
(4, 30, 11, 2024, '11:50:00', '12:50:00', NULL, NULL, 12),
(5, 27, 11, 2024, '09:50:00', '13:50:00', NULL, NULL, 12),
(6, 1, 12, 2024, '13:05:00', '14:50:00', NULL, NULL, NULL),
(7, 1, 12, 2024, '01:05:00', '14:50:00', NULL, NULL, NULL),
(8, 7, 12, 2024, '07:20:00', '18:50:00', NULL, NULL, 13),
(9, 8, 12, 2024, '09:20:00', '18:50:00', NULL, NULL, NULL),
(10, 12, 12, 2024, '08:00:00', '14:50:00', NULL, NULL, NULL),
(11, 13, 12, 2024, '09:20:00', '10:50:00', 'Disponible', NULL, 27),
(12, 28, 12, 2024, '10:20:00', '11:50:00', 'Disponible', NULL, 28),
(13, 15, 12, 2024, '18:50:00', '19:50:00', 'Disponible', NULL, 32);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `instrumentos`
--

CREATE TABLE `instrumentos` (
  `id` bigint(20) NOT NULL,
  `nombre` varchar(20) DEFAULT NULL,
  `profesor_id` bigint(20) DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `fecha_registro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `instrumentos`
--

INSERT INTO `instrumentos` (`id`, `nombre`, `profesor_id`, `estado`, `fecha_registro`) VALUES
(1, 'Guitarra', 16, 'activo', '2024-11-25 20:05:17'),
(2, 'piano', 17, 'activo', '2024-11-25 20:05:17'),
(3, 'bateria', 17, 'activo', '2024-11-25 20:05:17'),
(4, 'canto', 17, 'activo', '2024-11-25 20:05:17'),
(5, 'Guitarra', 18, 'activo', '2024-11-25 20:46:19'),
(6, 'Canto', 18, 'activo', '2024-11-25 20:46:19'),
(7, 'Piano', 25, 'activo', '2024-11-25 21:28:11'),
(8, 'Guitarra', 26, 'activo', '2024-11-25 21:34:50'),
(9, 'Bateria', 26, 'activo', '2024-11-25 21:34:50'),
(10, 'Guitarra', 27, 'activo', '2024-11-25 21:46:44'),
(11, 'Bajo', 27, 'activo', '2024-11-25 21:46:44'),
(12, 'Acordeon', 27, 'activo', '2024-11-25 21:46:44'),
(13, 'Guitarra', 28, 'activo', '2024-12-12 02:47:56'),
(14, 'Piano', 28, 'activo', '2024-12-12 02:47:56'),
(15, 'Guitarra', 29, 'activo', '2024-12-12 02:49:46'),
(16, 'Guitarra, Bateria', 30, 'activo', '2024-12-12 03:00:35'),
(17, 'guitarra', 31, 'activo', '2024-12-12 03:03:49'),
(18, 'bateria', 31, 'activo', '2024-12-12 03:03:49'),
(19, 'guitarra', 32, 'activo', '2024-12-12 03:08:31'),
(20, 'bajo', 32, 'activo', '2024-12-12 03:08:31');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `modalidades`
--

CREATE TABLE `modalidades` (
  `id` bigint(20) NOT NULL,
  `alumno_id` bigint(20) DEFAULT NULL,
  `profesor_id` bigint(20) DEFAULT NULL,
  `tipo` varchar(30) DEFAULT NULL,
  `fecha_registro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `modalidades`
--

INSERT INTO `modalidades` (`id`, `alumno_id`, `profesor_id`, `tipo`, `fecha_registro`) VALUES
(1, NULL, 27, 'grupal', '2024-11-25 22:00:54'),
(2, NULL, 27, 'grupal', '2024-11-25 22:00:58'),
(3, NULL, 27, 'grupal', '2024-11-25 23:10:20'),
(4, NULL, 27, 'individual', '2024-11-25 23:10:38'),
(5, NULL, 27, 'individual', '2024-11-25 23:12:42'),
(8, 21, 32, 'individual', '2024-12-12 17:48:50');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos`
--

CREATE TABLE `pagos` (
  `id` bigint(20) NOT NULL,
  `monto` int(11) DEFAULT NULL,
  `fecha_pago` date DEFAULT NULL,
  `evidencia` text DEFAULT NULL,
  `profesor_id` bigint(20) DEFAULT NULL,
  `alumno_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `profesor`
--

CREATE TABLE `profesor` (
  `id` bigint(20) NOT NULL,
  `nombre` varchar(42) DEFAULT NULL,
  `apellido` varchar(42) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `tipo` int(11) DEFAULT NULL,
  `especialidad` varchar(255) DEFAULT NULL,
  `usuario_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `profesor`
--

INSERT INTO `profesor` (`id`, `nombre`, `apellido`, `email`, `tipo`, `especialidad`, `usuario_id`) VALUES
(12, 'profesor', 'prueba', 'profe@gmail.com', 2, 'canto', NULL),
(13, 'adolfo', 'profe', 'adolfo@gmail.com', 2, 'guitarra', NULL),
(14, 'trolo', 'trolazo', 'testprofe@wom.com', 2, 'flautas', NULL),
(15, 'migu', 'nieto', 'migu@gmail.com', 2, 'canto', NULL),
(16, 'juan', 'atenas', 'atenas@gmail.com', 2, NULL, NULL),
(17, 'reanta', 'caro', 'renata@gmail.com', 2, NULL, NULL),
(18, 'caro', 'poblete', 'caro@gmail.com', 2, 'Guitarra, Canto', NULL),
(19, 'gato', 'gatito', 'gato@gmail.com', 2, 'gatoos', NULL),
(20, 'weko', 'wekito', 'weko@wom.cl', 2, 'guitarra', NULL),
(21, 'mige', 'mige', 'mige@gmail.com', 2, 'ukelele', NULL),
(22, 'lol', 'lol', 'lol@gmail.com', 2, 'cello', NULL),
(23, 'lo', 'lo', 'lo@gmail.com', 2, 'bateria', NULL),
(24, 'profesor', 'prueba', 'prueba@gmail.com', 2, 'cello', NULL),
(25, 'aaasadasd', 'adasda', 'asda@gmail.com', 2, 'Piano', NULL),
(26, 'dfgdfg', 'dfgdfg', 'dfgdgf@gmail.com', 2, 'Guitarra, Bateria', NULL),
(27, 'testing', 'test', 'testing@wom.cl', 2, 'Guitarra, Bajo, Acordeon', NULL),
(28, 'humberto', 'carlos', 'humberto@gmail.com', 2, 'Guitarra, Piano', NULL),
(29, 'caarta', 'carta', 'carta@gmail.com', 2, 'Guitarra', NULL),
(30, 'troto', 'tro', 'tro@gmail.com', 2, NULL, NULL),
(31, 'gei', 'gei', 'gei@wom.cl', 2, NULL, NULL),
(32, 'weko', 'wekos', 'weko@gmail.com', 2, 'guitarra, bajo', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `profesor_horario`
--

CREATE TABLE `profesor_horario` (
  `id` bigint(20) NOT NULL,
  `profesor_id` bigint(20) DEFAULT NULL,
  `horario_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `salas`
--

CREATE TABLE `salas` (
  `id` bigint(20) NOT NULL,
  `nombre` varchar(42) DEFAULT NULL,
  `capacidad` int(11) DEFAULT NULL,
  `profesor_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `salas`
--

INSERT INTO `salas` (`id`, `nombre`, `capacidad`, `profesor_id`) VALUES
(1, 'Sala 1', 4, 12);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sala_horario`
--

CREATE TABLE `sala_horario` (
  `id` bigint(20) NOT NULL,
  `sala_id` bigint(20) DEFAULT NULL,
  `horario_id` bigint(20) DEFAULT NULL,
  `profesor_id` bigint(20) DEFAULT NULL,
  `clase_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `sala_horario`
--

INSERT INTO `sala_horario` (`id`, `sala_id`, `horario_id`, `profesor_id`, `clase_id`) VALUES
(1, 1, 1, NULL, NULL),
(2, 1, 2, NULL, NULL),
(3, 1, 3, NULL, NULL),
(4, 1, 4, NULL, NULL),
(5, 1, 5, NULL, NULL),
(6, 1, 6, NULL, NULL),
(7, 1, 7, NULL, NULL),
(8, 1, 8, NULL, NULL),
(9, 1, 9, NULL, NULL),
(10, 1, 10, NULL, NULL),
(11, 1, 11, 27, NULL),
(12, 1, 12, NULL, NULL),
(13, 1, 13, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sala_instrumento`
--

CREATE TABLE `sala_instrumento` (
  `id` bigint(20) NOT NULL,
  `sala_id` bigint(20) DEFAULT NULL,
  `instrumento_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` bigint(20) NOT NULL,
  `email_personal` varchar(100) DEFAULT NULL,
  `contrasena` varchar(60) DEFAULT NULL,
  `tipo` int(11) DEFAULT NULL,
  `alumno_id` bigint(20) DEFAULT NULL,
  `profesor_id` bigint(20) DEFAULT NULL,
  `profesor_id_profesor` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `email_personal`, `contrasena`, `tipo`, `alumno_id`, `profesor_id`, `profesor_id_profesor`) VALUES
(1, 'admin@feelingmusic.com', '$2b$10$9Ap/wVy5S.jT91YHJrokYekY1Nb1q4tABTszTeP7HgzPCGzV4KbrK', 1, NULL, NULL, NULL),
(18, 'profe@gmail.com', '$2b$10$lZKodW/r/LypsHfYm31BtOU3XRx/I6Ky0i4LttX.5azLQYAaAGNVW', 2, NULL, 12, NULL),
(20, 'renatacaro@gmail.com', 'ren5169', 3, 9, NULL, 12),
(22, 'adolfoignacio.vg@gmail.com', 'ado557k', 3, 11, 12, NULL),
(23, 'adolfo@gmail.com', '$2b$10$7oNR42dzU6J9f3bTpWj01OXbgRhHLUqG8OzmIPXiD4PPOWAWETwPG', 2, NULL, 13, NULL),
(24, 'testprofe@wom.com', '$2b$10$MSCwSnRyEIYtK6COch9xmu4s3ubtUBTOKT.t7ymYYKaadqCP.rEtq', 2, NULL, 14, NULL),
(25, 'migu@gmail.com', '$2b$10$ZsYOvhdQLmXn/tKZIFyIc.1LoWw8j5OI7hI5e7ONUTFLYuFiJzDoC', 2, NULL, 15, NULL),
(26, 'atenas@gmail.com', '$2b$10$NA75LFzBobWH7siMjc2ZLOluc6qAYQYnSPWWPohJCFkcbjBupU5gK', 2, NULL, 16, NULL),
(27, 'renata@gmail.com', '$2b$10$8IrxWJj9akWdyBKmBCpoT.rVtT/TW6PX5VTFF0G24AJJk8fub8XLW', 2, NULL, 17, NULL),
(28, 'caro@gmail.com', '$2b$10$OQG9X2XFAKOT6.mCDTKNR.EARfvJkRQohKCDukApoRAFpnPbEEMC6', 2, NULL, 18, NULL),
(29, 'gato@gmail.com', '$2b$10$xj4J6qKFYrcC80A4c/LsPOxiOdaiITT/UrCgJeL6fzmz3KbuQH0We', 2, NULL, 19, NULL),
(30, 'weko@wom.cl', '$2b$10$sfWHfvZ4J1A4tm1sTnddDuH6.FL0XMGx3ybSl9NeyHeW18.1ekoaO', 2, NULL, 20, NULL),
(31, 'mige@gmail.com', '$2b$10$jvZr6RolWHdd8PbnCVx0au0DUZD7D6306HZKCNvINt9jTaTGWFTTi', 2, NULL, 21, NULL),
(32, 'lol@gmail.com', '$2b$10$50VQsC4kPulfrv/LwH9SQe.FtQ40MCxdTAzCOrvYGhd8OS.9nCuKG', 2, NULL, 22, NULL),
(33, 'lo@gmail.com', '$2b$10$bo.yr/rqE1rnTVRANFqWcO7AbeqgvbnjvJoOJD5qFDBx3r7/IgJoC', 2, NULL, 23, NULL),
(34, 'prueba@gmail.com', '$2b$10$imlfziE8ZoRfPVxCAXDV5uiFfnu6uS36qvm3hVx4OtZttFSeDloH.', 2, NULL, 24, NULL),
(35, 'asda@gmail.com', '$2b$10$K7NLMjsvCqIw/L8tcKtKE.smI.4dhCNxoMJDqYWsFiayhVxMZAPUi', 2, NULL, 25, NULL),
(36, 'dfgdgf@gmail.com', '$2b$10$zbaqsx8r13HNhNfs2Kv49.RJmjnIFNKAg84HIrxjebBNimPEMOkVm', 2, NULL, 26, NULL),
(37, 'testing@wom.cl', '$2b$10$0xIG1v.A5h.dG7042Vk6HewN/17KH2GeKsV4dWFPOmPPNIKkVWAL6', 2, NULL, 27, NULL),
(38, 'moanalindapreciosa@gmail.com', 'lol7897', 3, 12, 27, NULL),
(39, 'ad.venegas@duocuc.cl', 'bam6789', 3, 13, 27, NULL),
(40, 'asdasd@gmail.com', 'asd7898', 3, 14, 27, NULL),
(41, 'mati.torres@duocuc.cl', 'mat5879', 3, 15, 27, NULL),
(42, 'miguelpedro@gmail.com', 'ped6789', 3, 16, 27, NULL),
(43, 'fghfghf@wom.cl', 'fgh5571', 3, 17, 27, NULL),
(44, 'humberto@gmail.com', '$2b$10$H97XUx.f3x7vGaW6FC/oFecwFVLBMaYrH5RizZN6KdyjjCAqVFMGi', 2, NULL, 28, NULL),
(45, 'carta@gmail.com', '$2b$10$gQ7aURbZq236yYkmnKYyMeFx2VjX0yxgxEaSXhE5h6OSU5ADfGP7S', 2, NULL, 29, NULL),
(46, 'tro@gmail.com', '$2b$10$5UbEGPPTMEHt7SH191EA/OfAgugtxB45vPGxV491gM.rYJqhN/Kh2', 2, NULL, 30, NULL),
(47, 'gei@wom.cl', '$2b$10$7FaPuk/QFigpudpNck66LukEYjCGRe83L/aEdW5Ee97rFSdwC6FI.', 2, NULL, 31, NULL),
(48, 'weko@gmail.com', '$2b$10$d.RrfJNoT1icp9Exw.HulenGz2EB.cEuiiFly2ohLDOgtUxpHO1Q6', 2, NULL, 32, NULL),
(49, 'wekitos@gmail.com', 'wek6675', 3, 18, 32, NULL),
(50, 'jac@gmail.com', 'jac5579', 3, 19, 32, NULL),
(51, 'fdfgdgfgfd@wom.cl', 'fdg6548', 3, 20, 32, NULL),
(52, 'hgjhgjhgjh@wom.cl', 'ghj6548', 3, 21, 32, NULL);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `alumno`
--
ALTER TABLE `alumno`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indices de la tabla `asistencia`
--
ALTER TABLE `asistencia`
  ADD PRIMARY KEY (`id`),
  ADD KEY `alumno_id` (`alumno_id`),
  ADD KEY `clase_id` (`clase_id`),
  ADD KEY `profesor_id` (`profesor_id`);

--
-- Indices de la tabla `clases`
--
ALTER TABLE `clases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `modalidad_id` (`modalidad_id`),
  ADD KEY `instrumento_id` (`instrumento_id`),
  ADD KEY `horario_id` (`horario_id`),
  ADD KEY `profesor_id` (`profesor_id`);

--
-- Indices de la tabla `horarios`
--
ALTER TABLE `horarios`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `instrumentos`
--
ALTER TABLE `instrumentos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `profesor_id` (`profesor_id`);

--
-- Indices de la tabla `modalidades`
--
ALTER TABLE `modalidades`
  ADD PRIMARY KEY (`id`),
  ADD KEY `alumno_id` (`alumno_id`),
  ADD KEY `profesor_id` (`profesor_id`);

--
-- Indices de la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_profesor` (`profesor_id`),
  ADD KEY `fk_alumno` (`alumno_id`);

--
-- Indices de la tabla `profesor`
--
ALTER TABLE `profesor`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_usuario_id` (`usuario_id`);

--
-- Indices de la tabla `profesor_horario`
--
ALTER TABLE `profesor_horario`
  ADD PRIMARY KEY (`id`),
  ADD KEY `profesor_id` (`profesor_id`),
  ADD KEY `horario_id` (`horario_id`);

--
-- Indices de la tabla `salas`
--
ALTER TABLE `salas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `profesor_id` (`profesor_id`);

--
-- Indices de la tabla `sala_horario`
--
ALTER TABLE `sala_horario`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sala_id` (`sala_id`),
  ADD KEY `horario_id` (`horario_id`),
  ADD KEY `profesor_id` (`profesor_id`),
  ADD KEY `clase_id` (`clase_id`);

--
-- Indices de la tabla `sala_instrumento`
--
ALTER TABLE `sala_instrumento`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sala_id` (`sala_id`),
  ADD KEY `instrumento_id` (`instrumento_id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `alumno_id` (`alumno_id`),
  ADD KEY `profesor_id` (`profesor_id`),
  ADD KEY `fk_profesor_id_profesor` (`profesor_id_profesor`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `alumno`
--
ALTER TABLE `alumno`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT de la tabla `asistencia`
--
ALTER TABLE `asistencia`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `clases`
--
ALTER TABLE `clases`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `horarios`
--
ALTER TABLE `horarios`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `instrumentos`
--
ALTER TABLE `instrumentos`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `modalidades`
--
ALTER TABLE `modalidades`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `pagos`
--
ALTER TABLE `pagos`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `profesor`
--
ALTER TABLE `profesor`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT de la tabla `profesor_horario`
--
ALTER TABLE `profesor_horario`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `salas`
--
ALTER TABLE `salas`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `sala_horario`
--
ALTER TABLE `sala_horario`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `sala_instrumento`
--
ALTER TABLE `sala_instrumento`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `asistencia`
--
ALTER TABLE `asistencia`
  ADD CONSTRAINT `asistencia_ibfk_1` FOREIGN KEY (`alumno_id`) REFERENCES `alumno` (`id`),
  ADD CONSTRAINT `asistencia_ibfk_2` FOREIGN KEY (`clase_id`) REFERENCES `clases` (`id`),
  ADD CONSTRAINT `asistencia_ibfk_3` FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`);

--
-- Filtros para la tabla `clases`
--
ALTER TABLE `clases`
  ADD CONSTRAINT `clases_ibfk_1` FOREIGN KEY (`modalidad_id`) REFERENCES `modalidades` (`id`),
  ADD CONSTRAINT `clases_ibfk_2` FOREIGN KEY (`instrumento_id`) REFERENCES `instrumentos` (`id`),
  ADD CONSTRAINT `clases_ibfk_3` FOREIGN KEY (`horario_id`) REFERENCES `horarios` (`id`),
  ADD CONSTRAINT `clases_ibfk_4` FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`);

--
-- Filtros para la tabla `instrumentos`
--
ALTER TABLE `instrumentos`
  ADD CONSTRAINT `instrumentos_ibfk_1` FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`);

--
-- Filtros para la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD CONSTRAINT `fk_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `alumno` (`id`),
  ADD CONSTRAINT `fk_profesor` FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`),
  ADD CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`),
  ADD CONSTRAINT `pagos_ibfk_2` FOREIGN KEY (`alumno_id`) REFERENCES `alumno` (`id`);

--
-- Filtros para la tabla `profesor`
--
ALTER TABLE `profesor`
  ADD CONSTRAINT `fk_usuario_id` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `profesor_horario`
--
ALTER TABLE `profesor_horario`
  ADD CONSTRAINT `profesor_horario_ibfk_1` FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`),
  ADD CONSTRAINT `profesor_horario_ibfk_2` FOREIGN KEY (`horario_id`) REFERENCES `horarios` (`id`);

--
-- Filtros para la tabla `salas`
--
ALTER TABLE `salas`
  ADD CONSTRAINT `salas_ibfk_1` FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`);

--
-- Filtros para la tabla `sala_horario`
--
ALTER TABLE `sala_horario`
  ADD CONSTRAINT `sala_horario_ibfk_1` FOREIGN KEY (`sala_id`) REFERENCES `salas` (`id`),
  ADD CONSTRAINT `sala_horario_ibfk_2` FOREIGN KEY (`horario_id`) REFERENCES `horarios` (`id`),
  ADD CONSTRAINT `sala_horario_ibfk_3` FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`),
  ADD CONSTRAINT `sala_horario_ibfk_4` FOREIGN KEY (`clase_id`) REFERENCES `clases` (`id`);

--
-- Filtros para la tabla `sala_instrumento`
--
ALTER TABLE `sala_instrumento`
  ADD CONSTRAINT `sala_instrumento_ibfk_1` FOREIGN KEY (`sala_id`) REFERENCES `salas` (`id`),
  ADD CONSTRAINT `sala_instrumento_ibfk_2` FOREIGN KEY (`instrumento_id`) REFERENCES `instrumentos` (`id`);

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_profesor_id` FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`),
  ADD CONSTRAINT `fk_profesor_id_profesor` FOREIGN KEY (`profesor_id_profesor`) REFERENCES `profesor` (`id`),
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`alumno_id`) REFERENCES `alumno` (`id`),
  ADD CONSTRAINT `usuarios_ibfk_2` FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
