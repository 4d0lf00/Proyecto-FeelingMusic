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

const insertarAlumno = (nombre, apellido, email, numero_telefono, rut, comentarios, callback) => {
    if (!nombre || !apellido || !email || !numero_telefono || !rut) {
        return callback(new Error('Todos los campos son requeridos'));
    }
    
    const query = `
        INSERT INTO alumno (nombre, apellido, email, numero_telefono, rut, comentarios)
        VALUES (?, ?, ?, ?, ?, ?);
    `;
    
    db.query(query, [nombre, apellido, email, numero_telefono, rut, comentarios], (error, resultados) => {
        if (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return callback(new Error('El email ya está registrado'));
            }
            return callback(error);
        }
        // Pasamos el nombre y rut a la función crearUsuarioAlumno
        crearUsuarioAlumno(resultados.insertId, email, nombre, rut, (errorUsuario, resultadoUsuario) => {
            if (errorUsuario) {
                return callback(errorUsuario);
            }
            callback(null, {
                alumno: resultados,
                usuario: resultadoUsuario
            });
        });
    });
};

// Función modificada para crear usuario y enviar correo
const crearUsuarioAlumno = (alumnoId, email, nombre, rut, callback) => {
    const contrasena = generarContrasena(nombre, rut);
    const tipoAlumno = 2;
    
    const query = `
        INSERT INTO usuarios (email_personal, contrasena, tipo, alumno_id, profesor_id)
        VALUES (?, ?, ?, ?, NULL)
    `;

    db.query(query, [email, contrasena, tipoAlumno, alumnoId], (error, resultados) => {
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
                <p>Te recomendamos guardar tu contraseña!!.</p>
            `
        };

        transporter.sendMail(mailOptions, (errorMail, info) => {
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
const insertarHorario = (fecha, horaInicio, horaFin, profesorId, salaNombre, callback) => {
    if (!fecha || !horaInicio || !horaFin || !profesorId || !salaNombre) {
        return callback(new Error('Todos los campos son requeridos'));
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
            return callback(errorVerificar);
        }

        if (resultadosVerificar[0].count > 0) {
            return callback(new Error('La sala ya está ocupada en este horario'));
        }

        // Insertar el horario en la tabla horarios
        const queryHorario = `
            INSERT INTO horarios (dia, mes, annio, hora_inicio, hora_fin)
            VALUES (?, ?, ?, ?, ?);
        `;

        db.query(queryHorario, [dia, mes, annio, horaInicio, horaFin], (error, resultados) => {
            if (error) {
                return callback(error);
            }

            const horarioId = resultados.insertId;

            // Relacionar el horario con el profesor
            const queryProfesorHorario = `
                INSERT INTO profesor_horario (profesor_id, horario_id)
                VALUES (?, ?);
            `;

            db.query(queryProfesorHorario, [profesorId, horarioId], (errorProfesorHorario) => {
                if (errorProfesorHorario) {
                    return callback(errorProfesorHorario);
                }

                // Relacionar el horario con la sala
                const querySalaHorario = `
                    INSERT INTO sala_horario (sala_id, horario_id)
                    VALUES ((SELECT id FROM salas WHERE nombre = ? LIMIT 1), ?);
                `;

                db.query(querySalaHorario, [salaNombre, horarioId], (errorSalaHorario) => {
                    if (errorSalaHorario) {
                        return callback(errorSalaHorario);
                    }

                    callback(null, {
                        mensaje: 'Horario creado con éxito',
                        horarioId,
                    });
                });
            });
        });
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
function insertarUsuario(email, contrasena, nombre, callback) {
    // Primero insertamos en la tabla profesor
    const queryProfesor = 'INSERT INTO profesor (nombre, email, tipo) VALUES (?, ?, 2)';
    db.query(queryProfesor, [nombre, email], (err, profesorResult) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return callback(new Error('El email ya está registrado'));
            }
            return callback(err);
        }

        // Después insertamos en la tabla usuarios
        const queryUsuario = 'INSERT INTO usuarios (email_personal, contrasena, tipo, profesor_id) VALUES (?, ?, 2, ?)';
        db.query(queryUsuario, [email, contrasena, profesorResult.insertId], (err, usuarioResult) => {
            if (err) {
                // Si hay error, eliminamos el profesor que acabamos de insertar
                db.query('DELETE FROM profesor WHERE id = ?', [profesorResult.insertId]);
                return callback(err);
            }
            callback(null, usuarioResult);
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
    actualizarHorario
};
