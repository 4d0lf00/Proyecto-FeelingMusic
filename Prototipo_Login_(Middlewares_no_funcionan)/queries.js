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
function insertarUsuario(email, contrasena, callback) { //(cambiar el insertarUsuario por insertarProfesor)
    const sql = 'INSERT INTO profesor (email_personal, contrasena) VALUES (?, ?)'; //Poner mas parametros ??
    db.query(sql, [email, contrasena], callback);
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
