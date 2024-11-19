const db = require('./db');


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



// Función para buscar alumnos
const buscarAlumnos = (busqueda, callback) => {
    const query = `
        SELECT RUT, Nombre, Apellido, numero_telefono, Email
        FROM alumno
        WHERE RUT LIKE ? OR Nombre LIKE ? OR Apellido LIKE ? OR Email LIKE ?;
    `;
    const likeBusqueda = `%${busqueda}%`;
    db.query(query, [likeBusqueda, likeBusqueda, likeBusqueda, likeBusqueda], callback);
};

// Función para obtener todos los profesores
const obtenerProfesores = (callback) => {
    const sql = 'SELECT * FROM profesor';
    db.query(sql, callback);
};

const insertarAlumno = (nombre, apellido, email, numero_telefono, rut, comentarios, callback) => {
    // Verificar si algún campo está vacío
    if (!nombre || !apellido || !email || !numero_telefono || !rut) {
        return callback(new Error('Todos los campos son requeridos'));
    }
    
    const query = `
        INSERT INTO alumno (nombre, apellido, email, numero_telefono, rut, comentarios)
        VALUES (?, ?, ?, ?, ?, ?);
    `;
    db.query(query, [nombre, apellido, email, numero_telefono, rut, comentarios], (error, results) => {
        if (error) {
            // Manejar el error de duplicación de email
            if (error.code === 'ER_DUP_ENTRY') {
                return callback(new Error('El email ya está registrado'));
            }
            return callback(error);
        }
        callback(null, results);
    });
};


// Exportar las funciones
module.exports = {
    buscarAlumnos,
    obtenerProfesores,
    insertarAlumno,
    obtenerUsuarioLogin,
    insertarUsuario,
};
