// db.js - Configuración de la conexión a la base de datos MySQL
const mysql = require('mysql2');

// Crear la conexión a la base de datos
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',         // Cambia esto por tu usuario de MySQL
    password: '1234',     // Cambia esto por tu contraseña de MySQL
    database: 'feeling_music'  // Cambia esto por el nombre de tu base de datos
});

// Conectar a la base de datos
db.connect((err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err.message);
        return;
    }
    console.log('Conexión exitosa a la base de datos MySQL');
});

// Exportar la conexión para su uso en otras partes de la aplicación
module.exports = db;
