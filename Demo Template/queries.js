const db = require('./db');

// Función para buscar alumnos
const buscarAlumnos = (busqueda, callback) => {
    const query = `
        SELECT RUT, Nombre, Apellido, Celular, Email, FechaNacimiento 
        FROM alumnos 
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
};
