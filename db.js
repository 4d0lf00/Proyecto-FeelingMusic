require('dotenv').config();
const mysql = require('mysql2/promise');

// Crear el pool de conexiones a la base de datos
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost', // Lee de .env, si no existe, usa 'localhost'
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10, // Puedes ajustar este límite según tus necesidades
    queueLimit: 0
});

// Exportar el pool para su uso en otras partes de la aplicación
// El pool ya maneja las conexiones y las reconexiones
module.exports = pool;
