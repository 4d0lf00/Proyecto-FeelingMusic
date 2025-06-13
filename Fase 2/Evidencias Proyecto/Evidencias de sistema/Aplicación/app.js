require('dotenv').config(); // Cargar variables de entorno
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./routes');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const app = express();

// Verificar variables de entorno
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Error: Las variables de entorno EMAIL_USER y EMAIL_PASS no están definidas.');
    process.exit(1);
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de seguridad
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "img-src 'self' data: https:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://stackpath.bootstrapcdn.com; " +
        "style-src 'self' 'unsafe-inline' https://stackpath.bootstrapcdn.com https://cdn.jsdelivr.net https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;"
    );
    next();
});

// Configuración de archivos estáticos
app.use(express.static('public'));

// Configuración de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(cookieParser());


app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Rutas
app.use('/', routes);

// Puerto
const PORT = process.env.PORT || 3000;

// --- Prueba de conexión a la BD antes de iniciar --- 
(async () => {
    let connection;
    try {
        const db = require('./db'); // Importar pool
        connection = await db.getConnection();
        console.log("Prueba de conexión a la BD exitosa. Liberando conexión.");
        await connection.ping(); // Realizar una operación simple
        console.log("Ping a la BD exitoso.");
    } catch (err) {
        console.error("ERROR CRÍTICO AL CONECTAR/PROBAR LA BASE DE DATOS:", err);
        // Opcional: Salir si la BD es esencial para iniciar
        // process.exit(1); 
    } finally {
        if (connection) {
            try {
                 await connection.release(); 
                 console.log("Conexión de prueba liberada.");
            } catch (releaseErr) {
                 console.error("Error al liberar la conexión de prueba:", releaseErr);
            }
        }
        // Iniciar el servidor SOLO después de intentar la conexión
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto http://localhost:${PORT}`);
        });
    }
})();
// --- Fin Prueba de conexión ---