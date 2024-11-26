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
    const query = 'SELECT id, nombre FROM salas';
    db.query(query, (error, resultados) => {
        if (error) {
            return callback(error);
        }
        callback(null, resultados);
    });
};

// Función para insertar un nuevo horario en la base de datos
const insertarHorario = (fecha, horaInicio, horaFin, profesorId, salaNombre) => {
    return new Promise((resolve, reject) => {
        if (!fecha || !horaInicio || !horaFin || !profesorId || !salaNombre) {
            return reject(new Error('Todos los campos son requeridos'));
        }

        // Descomponer la fecha en día, mes y año
        const [annio, mes, dia] = fecha.split('-');

        // Verificar si ya existe un horario en la misma sala a la misma hora
        const queryVerificar = `
            SELECT COUNT(*) AS count FROM horarios h
            JOIN sala_horario sh ON h.id = sh.horario_id
            JOIN salas s ON sh.sala_id = s.id
            WHERE h.dia = ? AND h.mes = ? AND h.annio = ? AND h.hora_inicio = ? AND s.nombre = ?;
        `;

        db.query(queryVerificar, [dia, mes, annio, horaInicio, salaNombre], (errorVerificar, resultadosVerificar) => {
            if (errorVerificar) {
                return reject(errorVerificar);
            }

            if (resultadosVerificar[0].count > 0) {
                return reject(new Error('La sala ya está ocupada en este horario'));
            }

            // Insertar el horario en la tabla horarios
            const queryHorario = `
                INSERT INTO horarios (dia, mes, annio, hora_inicio, hora_fin)
                VALUES (?, ?, ?, ?, ?);
            `;

            db.query(queryHorario, [dia, mes, annio, horaInicio, horaFin], (error, resultados) => {
                if (error) {
                    return reject(error);
                }

                const horarioId = resultados.insertId;

                // Relacionar el horario con la sala
                const querySalaHorario = `
                    INSERT INTO sala_horario (sala_id, horario_id)
                    VALUES ((SELECT id FROM salas WHERE nombre = ? LIMIT 1), ?);
                `;

                db.query(querySalaHorario, [salaNombre, horarioId], (errorSalaHorario) => {
                    if (errorSalaHorario) {
                        return reject(errorSalaHorario);
                    }

                    resolve({ mensaje: 'Horario creado con éxito', horarioId });
                });
            });
        });
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
const actualizarEstado = (horarioId, callback) => {
    const queryActualizarEstado = `
        UPDATE horarios h
        JOIN sala_horario sh ON h.id = sh.horario_id
        JOIN salas s ON sh.sala_id = s.id
        SET h.estado = IF((SELECT COUNT(*) FROM alumno_horario ah WHERE ah.horario_id = h.id) >= s.capacidad, 'Ocupado', 'Desocupado')
        WHERE h.id = ?;
    `;

    db.query(queryActualizarEstado, [horarioId], (errorActualizarEstado, resultadosActualizarEstado) => {
        if (errorActualizarEstado) {
            return callback(errorActualizarEstado);
        }
        callback(null, resultadosActualizarEstado);
    });
};
//----------Inicio login----------//

// Obtener usuario por email
function obtenerUsuarioLogin(email, callback) {
    const sql = 'SELECT * FROM usuarios WHERE email_personal = ?';
    db.query(sql, [email], (err, results) => {
        callback(err, results);
    });
}

// Insertar un nuevo usuario
function insertarUsuario(email, contrasena, nombre, apellido, especialidad, callback) {
    // Comenzar transacción
    db.beginTransaction(function(err) {
        if (err) {
            console.error('Error al iniciar transacción:', err);
            return callback({ error: 'Error al iniciar la transacción' });
        }

        // 1. Insertar profesor
        const queryProfesor = `
            INSERT INTO profesor (nombre, apellido, email, tipo, especialidad) 
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(queryProfesor, [nombre, apellido, email, 2, especialidad], (errProfesor, profesorResult) => {
            if (errProfesor) {
                return db.rollback(() => {
                    console.error('Error al insertar profesor:', errProfesor);
                    callback({ error: 'Error al registrar el profesor' });
                });
            }

            const profesorId = profesorResult.insertId;
            console.log('ID del profesor insertado:', profesorId);

            // 2. Insertar en instrumentos
            // Si hay múltiples especialidades, las separamos
            const especialidades = especialidad.split(',').map(e => e.trim());
            
            // Crear consultas para cada especialidad
            const valoresInstrumentos = especialidades.map(esp => [esp, profesorId, 'activo']);
            const queryInstrumentos = `
                INSERT INTO instrumentos (nombre, profesor_id, estado) 
                VALUES ?
            `;

            db.query(queryInstrumentos, [valoresInstrumentos], (errInstrumento) => {
                if (errInstrumento) {
                    return db.rollback(() => {
                        console.error('Error al insertar instrumentos:', errInstrumento);
                        callback({ error: 'Error al registrar las especialidades' });
                    });
                }

                // 3. Insertar usuario
                const queryUsuario = `
                    INSERT INTO usuarios (email_personal, contrasena, tipo, profesor_id) 
                    VALUES (?, ?, ?, ?)
                `;

                db.query(queryUsuario, [email, contrasena, 2, profesorId], (errUsuario) => {
                    if (errUsuario) {
                        return db.rollback(() => {
                            console.error('Error al insertar usuario:', errUsuario);
                            callback({ error: 'Error al crear el usuario' });
                        });
                    }

                    // Confirmar transacción
                    db.commit((errCommit) => {
                        if (errCommit) {
                            return db.rollback(() => {
                                console.error('Error al confirmar transacción:', errCommit);
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
    obtenerProfesorId
};