const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./routes'); // Importar las rutas

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Usar el enrutador
app.use('/', routes);

// Puerto en el que el servidor escucha
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});





/*const express = require('express');
const path = require('path');
const mysql = require('mysql'); // Para la conexión a MySQL

const app = express();

// Middleware para manejar datos del formulario
app.use(express.urlencoded({ extended: true }));

// Configurar la carpeta pública para archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal para servir el archivo HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/form.html'));
});

// Conexión a la base de datos MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'tu_usuario', // Cambia esto por tu usuario de MySQL
    password: 'tu_contraseña', // Cambia esto por tu contraseña de MySQL
    database: 'nombre_de_tu_base_de_datos' // Cambia esto por el nombre de tu base de datos
});

// Conexión a la base de datos
db.connect((err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conexión exitosa a la base de datos MySQL');
});


// Puerto en el que el servidor escucha
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});*/