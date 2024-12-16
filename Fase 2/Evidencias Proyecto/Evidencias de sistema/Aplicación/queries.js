require('dotenv').config();
const db = require('./db');
const nodemailer = require('nodemailer');

// Configuración del transportador de correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Función para generar contraseña
const generarContrasena = (nombre, rut) => {
    const prefijo = nombre.substring(0, 3).toLowerCase();
    const sufijo = rut.replace('-', '').slice(-4);
    return `${prefijo}${sufijo}`;
};

// Función para buscar alumnos
const buscarAlumnos = (busqueda, callback) => {
    const query = `
        SELECT rut, nombre, apellido, numero_telefono, email, DATE_FORMAT(fecha_registro, '%d-%m-%Y') AS fecha_registro
        FROM alumno 
        WHERE RUT LIKE ? OR Nombre LIKE ? OR Apellido LIKE ? OR Email LIKE ?;
    `;
    const likeBusqueda = `%${busqueda}%`;
    db.query(query, [likeBusqueda, likeBusqueda, likeBusqueda, likeBusqueda], callback);
};

// Función para insertar un nuevo alumno en la base de datos
const insertarAlumno = (nombre, apellido, email, numero_telefono, rut, comentarios, profesorId, callback) => {
    if (!nombre || !apellido || !email || !numero_telefono || !rut) {
        return callback(new Error('Todos los campos son requeridos'));
    }

    // Verificar si el profesor existe en la tabla profesor
    const queryVerificarProfesor = 'SELECT * FROM profesor WHERE id = ?';
    db.query(queryVerificarProfesor, [profesorId], (err, results) => {
        if (err) {
            return callback(err);
        }
        if (results.length === 0) {
            return callback(new Error('El profesor no existe'));
        }

        const query = `
            INSERT INTO alumno (nombre, apellido, email, numero_telefono, rut, comentarios, profesor_id)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `;

        console.log('Ejecutando consulta:', query, [nombre, apellido, email, numero_telefono, rut, comentarios, profesorId]);

        db.query(query, [nombre, apellido, email, numero_telefono, rut, comentarios, profesorId], (error, resultados) => {
            if (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    return callback(new Error('El email ya está registrado'));
                }
                return callback(error);
            }
            callback(null, resultados);
        });
    });
};

// Función para obtener el ID del profesor correspondiente al ID de la tabla usuarios
const obtenerProfesorId = (usuarioId, callback) => {
    const query = 'SELECT profesor_id FROM usuarios WHERE id = ?';
    db.query(query, [usuarioId], callback);
};

// Función para crear usuario y enviar correo
const crearUsuarioAlumno = (alumnoId, email, nombre, rut, profesorId, callback) => {
    const contrasena = generarContrasena(nombre, rut);
    const tipoAlumno = 3;
    
    const query = `
        INSERT INTO usuarios (email_personal, contrasena, tipo, alumno_id, profesor_id)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    console.log('Insertando usuario:', { email, contrasena, tipoAlumno, alumnoId, profesorId });
    
    db.query(query, [email, contrasena, tipoAlumno, alumnoId, profesorId], (error, resultados) => {
        if (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return callback(new Error('Ya existe un usuario con este email'));
            }
            return callback(error);
        }

        // Enviar correo electrónico
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Bienvenido - Datos de acceso',
            html: `
                <h1>¡Bienvenido a Feeling Music!</h1>
                <p>Tus datos de acceso son:</p>
                <p><strong>Usuario:</strong> ${email}</p>
                <p><strong>Contraseña:</strong> ${contrasena}</p>
            `
        };

        transporter.sendMail(mailOptions, (errorMail) => {
            if (errorMail) {
                console.error('Error al enviar correo:', errorMail);
            }
            callback(null, resultados);
        });
    });
};

// Función para obtener todos los profesores
const obtenerProfesores = (callback) => {
    const sql = 'SELECT * FROM profesor';
    db.query(sql, callback);
};

// Función para obtener salas
const obtenerSalas = (callback) => {
    const query = 'SELECT * FROM salas';
    
    db.query(query, (error, resultados) => {
        if (error) {
            console.error('Error al obtener salas:', error);
            return callback(error);
        }
        
        console.log('Salas obtenidas:', resultados);
        
        callback(null, resultados || []);
    });
};

// Función para insertar un nuevo horario en la base de datos
const insertarHorario = (fecha, horaInicio, horaFin, profesorId, salaNombre) => {
    return new Promise((resolve, reject) => {
        if (!profesorId) {
            return reject(new Error('El ID del profesor es requerido'));
        }

        const [annio, mes, dia] = fecha.split('-');

        console.log('Insertando horario con datos:', {
            dia, mes, annio, horaInicio, horaFin, profesorId, salaNombre
        });

        const queryHorario = `
            INSERT INTO horarios (
                dia, mes, annio, 
                hora_inicio, hora_fin, 
                profesor_id, estado
            )
            VALUES (?, ?, ?, ?, ?, ?, 'Disponible');
        `;

        db.query(
            queryHorario, 
            [dia, mes, annio, horaInicio, horaFin, profesorId],
            (error, resultados) => {
                if (error) {
                    console.error('Error en la inserción:', error);
                    return reject(error);
                }

                const horarioId = resultados.insertId;

                // También insertar en profesor_horario
                const queryProfesorHorario = `
                    INSERT INTO profesor_horario (profesor_id, horario_id)
                    VALUES (?, ?);
                `;

                db.query(queryProfesorHorario, [profesorId, horarioId], (errorProfesor) => {
                    if (errorProfesor) {
                        return reject(errorProfesor);
                    }

                    // Relacionar el horario con la sala
                    const querySalaHorario = `
                        INSERT INTO sala_horario (sala_id, horario_id)
                        VALUES ((SELECT id FROM salas WHERE nombre = ? LIMIT 1), ?);
                    `;

                    db.query(querySalaHorario, [salaNombre, horarioId], (errorSalaHorario) => {
                        if (errorSalaHorario) {
                            return reject(errorSalaHorario);
                        }

                        resolve({ 
                            mensaje: 'Horario creado con éxito', 
                            horarioId,
                            profesorId 
                        });
                    });
                });
            }
        );
    });
};

// Verificar si ya existe un horario en la misma sala a la misma hora
const queryVerificar = `
    SELECT COUNT(*) AS count FROM horarios h
    JOIN sala_horario sh ON h.id = sh.horario_id
    JOIN salas s ON sh.sala_id = s.id
    WHERE h.dia = ? AND h.mes = ? AND h.annio = ? AND h.hora_inicio = ? AND s.nombre = ?;
`;


// Actualizar el estado de la sala en la tabla horarios
const queryActualizarEstado = `
    UPDATE horarios h
    JOIN sala_horario sh ON h.id = sh.horario_id
    JOIN salas s ON sh.sala_id = s.id
    SET h.estado = IF((SELECT COUNT(*) FROM alumno_horario ah WHERE ah.horario_id = h.id) >= s.capacidad, 'Ocupado', 'Desocupado')
    WHERE h.id = ?;
`;

// Función para obtener el horario disponible del profesor
const obtenerHorarioDisponible = (profesorId, callback) => {
    const query = `
        SELECT h.id, h.dia, h.hora_inicio, h.hora_fin, h.estado
        FROM horarios h
        WHERE h.profesor_id = ? AND h.estado = 'Desocupado';
    `;

    db.query(query, [profesorId], (error, resultados) => {
        if (error) {
            return callback(error);
        }

        callback(null, resultados);
    });
};

// Actualizar el estado de la sala en la tabla horarios
function actualizarEstado(horarioId, callback) {
    const queryActualizarEstado = `
        UPDATE horarios h
        JOIN sala_horario sh ON h.id = sh.horario_id
        JOIN salas s ON sh.sala_id = s.id
        SET h.estado = IF((SELECT COUNT(*) FROM alumno_horario ah WHERE ah.horario_id = h.id) >= s.capacidad, 'Ocupado', 'Desocupado')
        WHERE h.id = ?;
    `;
    db.query(queryActualizarEstado, [horarioId], callback);
}
//----------Inicio login----------//

// Obtener usuario por email
function obtenerUsuarioLogin(email, callback) {
    const sql = `
        SELECT u.*, 
               a.id as alumno_id 
        FROM usuarios u 
        LEFT JOIN alumno a ON u.alumno_id = a.id 
        WHERE u.email_personal = ?
    `;
    
    db.query(sql, [email], (err, results) => {
        if (err) {
            console.error('Error en obtenerUsuarioLogin:', err);
            return callback(err);
        }
        callback(null, results);
    });
}

// Insertar un nuevo usuario
function insertarUsuario(email, contrasena, nombre, apellido, especialidad, callback) {
    db.beginTransaction(function(err) {
        if (err) {
            console.error('Error al iniciar transacción:', err);
            return callback({ error: 'Error al iniciar la transacción' });
        }

        // Convertir array de especialidades a string
        const especialidadString = Array.isArray(especialidad) ? 
            especialidad.join(', ') : especialidad;

        // 1. Insertar profesor con especialidad
        const queryProfesor = `
            INSERT INTO profesor (nombre, apellido, email, tipo, especialidad)
            VALUES (?, ?, ?, 2, ?)
        `;

        console.log('Insertando profesor:', { 
            nombre, 
            apellido, 
            email, 
            especialidad: especialidadString 
        });

        db.query(queryProfesor, [nombre, apellido, email, especialidadString], (errProfesor, profesorResult) => {
            if (errProfesor) {
                console.error('Error al insertar profesor:', errProfesor);
                return db.rollback(() => {
                    callback({ error: 'Error al registrar el profesor' });
                });
            }

            const profesorId = profesorResult.insertId;
            console.log('Profesor insertado con ID:', profesorId);

            // 2. Insertar usuario
            const queryUsuario = `
                INSERT INTO usuarios (
                    email_personal, 
                    contrasena, 
                    tipo, 
                    profesor_id,
                    alumno_id,
                    profesor_id_profesor
                ) VALUES (?, ?, 2, ?, NULL, NULL)
            `;

            console.log('Insertando usuario:', { 
                email_personal: email,
                tipo: 2,
                profesor_id: profesorId
            });

            db.query(queryUsuario, [email, contrasena, profesorId], (errUsuario) => {
                if (errUsuario) {
                    console.error('Error al insertar usuario:', errUsuario);
                    return db.rollback(() => {
                        callback({ error: 'Error al crear el usuario' });
                    });
                }

                console.log('Usuario insertado correctamente');

                // 3. Insertar especialidades en tabla instrumentos
                const especialidades = Array.isArray(especialidad) ? especialidad : [especialidad];
                let especialidadesInsertadas = 0;

                console.log('Insertando especialidades en instrumentos:', especialidades);

                especialidades.forEach(esp => {
                    const queryInstrumento = `
                        INSERT INTO instrumentos (nombre, profesor_id, estado)
                        VALUES (?, ?, 'activo')
                    `;

                    db.query(queryInstrumento, [esp, profesorId], (errInstrumento) => {
                        if (errInstrumento) {
                            console.error('Error al insertar instrumento:', errInstrumento);
                            return db.rollback(() => {
                                callback({ error: 'Error al registrar las especialidades' });
                            });
                        }

                        especialidadesInsertadas++;

                        if (especialidadesInsertadas === especialidades.length) {
                            db.commit((errCommit) => {
                                if (errCommit) {
                                    console.error('Error al confirmar transacción:', errCommit);
                                    return db.rollback(() => {
                                        callback({ error: 'Error al confirmar el registro' });
                                    });
                                }

                                console.log('Registro completado con éxito');
                                callback(null, {
                                    success: true,
                                    message: 'Registro exitoso',
                                    profesorId: profesorId
                                });
                            });
                        }
                    });
                });
            });
        });
    });
}

//-----------Fin login-----------//

// Función para obtener los horarios de un profesor
const obtenerHorariosPorProfesor = (profesorId, callback) => {
    const query = `
        SELECT h.id, h.dia, h.mes, h.annio, h.hora_inicio, h.hora_fin, s.nombre AS sala
        FROM horarios h
        JOIN profesor_horario ph ON h.id = ph.horario_id
        JOIN sala_horario sh ON h.id = sh.horario_id
        JOIN salas s ON sh.sala_id = s.id
        WHERE ph.profesor_id = ?;
    `;
    db.query(query, [profesorId], callback);
};

// Función para actualizar un horario
const actualizarHorario = (horarioId, fecha, horaInicio, horaFin, salaNombre, callback) => {
    const [annio, mes, dia] = fecha.split('-');

    const query = `
        UPDATE horarios h
        JOIN sala_horario sh ON h.id = sh.horario_id
        SET h.dia = ?, h.mes = ?, h.annio = ?, h.hora_inicio = ?, h.hora_fin = ?, sh.sala_id = (SELECT id FROM salas WHERE nombre = ? LIMIT 1)
        WHERE h.id = ?;
    `;

    db.query(query, [dia, mes, annio, horaInicio, horaFin, salaNombre, horarioId], callback);
};

// Función para buscar alumnos por nombre (versión específica)
const buscarAlumnosPorNombre = (nombre, callback) => {
    const query = `
        SELECT id, nombre, apellido
        FROM alumno 
        WHERE nombre LIKE ? OR apellido LIKE ?;
    `;
    const likeNombre = `%${nombre}%`;
    db.query(query, [likeNombre, likeNombre], callback);
};

// Función para obtener instrumentos (versión específica)
const obtenerInstrumentoIdPorNombre = (nombre, callback) => {
    const query = 'SELECT id FROM instrumentos WHERE nombre = ?';
    db.query(query, [nombre], (error, results) => {
        if (error) return callback(error);
        callback(null, results[0]?.id);
    });
};

// Función para guardar clase
const guardarClase = (horarioId, instrumentoId, profesorId, callback) => {
    const query = `
        INSERT INTO clases (horario_id, instrumento_id, profesor_id, estado, fecha)
        VALUES (?, ?, ?, 'programada', CURDATE())
    `;
    db.query(query, [horarioId, instrumentoId, profesorId], callback);
};

// Función para insertar un nuevo pago
const insertarPago = (monto, fecha_pago, metodo_de_pago, notas, alumno_id, profesorId, callback) => {
    const query = `
        INSERT INTO pagos (monto, fecha_pago, metodo_de_pago, notas, alumno_id, profesor_id)
        VALUES (?, ?, ?, ?, ?, ?);
    `;
    db.query(query, [monto, fecha_pago, metodo_de_pago, notas, alumno_id, profesorId], callback);
};

// Función de buscar registro de pagos
const buscarPagos = (busqueda, callback) => {
    const query = `
        SELECT 
            a.rut, 
            a.nombre, 
            a.apellido, 
            p.metodo_de_pago, 
            p.fecha_pago, 
            p.notas,
            CONCAT(pr.nombre, ' ', pr.apellido) AS profesor_nombre
        FROM pagos p
        JOIN alumno a ON p.alumno_id = a.id
        JOIN profesor pr ON p.profesor_id = pr.id
        WHERE a.rut LIKE ? OR a.nombre LIKE ? OR a.apellido LIKE ? OR p.fecha_pago LIKE ?;
    `;
    const likeBusqueda = `%${busqueda}%`;
    db.query(query, [likeBusqueda, likeBusqueda, likeBusqueda, likeBusqueda], callback);
};

// Función para obtener usuario y profesor por ID
function obtenerUsuarioProfesorPorId(id, callback) {
    const query = `
        SELECT email_personal, contrasena 
        FROM usuarios 
        WHERE id = ?`;
    
    db.query(query, [id], (err, results) => {
        if (err) return callback(err);
        if (results.length === 0) {
            return callback(null, null);
        }
        callback(null, results[0]);
    });
}

// Función para actualizar usuario profesor
function actualizarUsuarioProfesor(id, email, contrasena, callback) {
    const query = 'UPDATE usuarios SET email_personal = ?, contrasena = ? WHERE id = ?';
    db.query(query, [email, contrasena, id], callback);
}
// Función para actualizar estado
function actualizarEstado(horarioId, callback) {
    const queryActualizarEstado = `
        UPDATE horarios h
        JOIN sala_horario sh ON h.id = sh.horario_id
        JOIN salas s ON sh.sala_id = s.id
        SET h.estado = IF((SELECT COUNT(*) FROM alumno_horario ah WHERE ah.horario_id = h.id) >= s.capacidad, 'Ocupado', 'Desocupado')
        WHERE h.id = ?;
    `;
    db.query(queryActualizarEstado, [horarioId], callback);
};

// Asegúrate de que la función esté definida
const obtenerInstrumentos = (callback) => {
    const query = 'SELECT nombre FROM instrumentos';
    db.query(query, callback);
};

// Exportar las funciones
module.exports = {
    buscarAlumnos,
    obtenerProfesores,
    obtenerSalas,
    insertarAlumno,
    crearUsuarioAlumno,
    obtenerUsuarioLogin,
    insertarUsuario,
    insertarHorario,
    obtenerHorariosPorProfesor,
    actualizarHorario,
    obtenerProfesorId,
    buscarAlumnosPorNombre,
    obtenerInstrumentoIdPorNombre,
    guardarClase,
    insertarPago,
    buscarPagos,
    obtenerUsuarioProfesorPorId,
    actualizarUsuarioProfesor,
    obtenerHorarioDisponible,
    actualizarEstado,
    obtenerInstrumentos
};