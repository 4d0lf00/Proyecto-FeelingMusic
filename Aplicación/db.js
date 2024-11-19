//Esta conexion a base de datos esta realizado en local, se realizara la configuracion cuando se contrate el hosting
// db.js - Configuración de la conexión a la base de datos MySQL
const mysql = require('mysql2');

// Crear la conexión a la base de datos
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',         
    password: '',   
    database: 'feeling_music'  
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
