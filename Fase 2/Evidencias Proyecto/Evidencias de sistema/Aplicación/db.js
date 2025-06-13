const mysql = require('mysql2/promise');

// Crear el pool de conexiones a la base de datos
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'feeling_musicDB',
    waitForConnections: true,
    connectionLimit: 10, // Puedes ajustar este límite según tus necesidades
    queueLimit: 0
});

// Exportar el pool para su uso en otras partes de la aplicación
// El pool ya maneja las conexiones y las reconexiones
module.exports = pool;
