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

const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');

// app.js - Configuración del servidor ExpressJS
const express = require('express');
const path = require('path');


//lol
const app = express();
app.use(cors());
app.use(bodyParser.json());
// 

// Ruta para buscar alumnos
app.post('/buscar_alumnos', (req, res) => {
  const { busqueda } = req.body;
  let query;
  let valores;
  
  if (busqueda) {
      query = `
          SELECT rut, nombre, CONCAT(apellido1, ' ', apellido2) AS apellidos, numero_telefono, email, DATE_FORMAT(fecha_nacimiento, '%d-%m-%Y') AS Fechanacimiento 
          FROM alumno 
          WHERE rut LIKE ? OR nombre LIKE ? OR apellido1 LIKE ? OR apellido2 LIKE ? OR email LIKE ?;
      `;
      const likeBusqueda = `%${busqueda}%`;
      valores = [likeBusqueda, likeBusqueda, likeBusqueda, likeBusqueda, likeBusqueda];
  } else {
      query = `
          SELECT rut, nombre, CONCAT(apellido1, ' ', apellido2) AS apellidos, numero_telefono, email, DATE_FORMAT(fecha_nacimiento, '%d-%m-%Y') AS Fechanacimiento 
          FROM alumno 
          LIMIT 50;
      `;
      valores = [];
  }

  db.query(query, valores, (err, results) => {
      if (err) {
          console.error('Error ejecutando la consulta:', err);
          res.status(500).send('Error en la consulta');
          return;
      }
      res.json(results);
  });
});

// Ruta para obtener alumnos por mes
app.post('/alumnos_por_mes', (req, res) => {
  const { mes } = req.body;
  const query = `
      SELECT rut, nombre, CONCAT(apellido1, ' ', apellido2) AS apellidos, numero_telefono, email, DATE_FORMAT(NOW(), '%Y-%m-%d') AS FechaRegistro 
      FROM alumno 
      WHERE MONTH(DATE(NOW())) = ?;
  `;
  db.query(query, [mes], (err, results) => {
      if (err) {
          console.error('Error ejecutando la consulta:', err);
          res.status(500).send('Error en la consulta');
          return;
      }
      res.json(results);
  });
});


// Definir una ruta para obtener todos los profesores
app.get('/profesores', (req, res) => {
    const sql = 'SELECT * FROM profesor';  // Consulta SQL para obtener todos los profesores
    db.query(sql, (err, results) => {
      if (err) {
        return res.status(500).send('Error en la consulta a la base de datos');
      }

    // Imprimir los resultados en la consola
    console.log('Profesores obtenidos:', results);

      res.json(results);  // Enviar los resultados como respuesta en formato JSON
    });
  });

// Middleware para manejar datos del formulario
app.use(express.urlencoded({ extended: true }));

// Configurar la carpeta pública para archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal para servir el archivo HTML
app.get('/filtro', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/filtro.html'));
});

// Ruta principal para servir el archivo HTML
app.get('/filtro2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/filtro2.html'));
});

// Ruta principal para servir el archivo HTML
app.get('/administrador-filtro', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin-filtro.html'));
});

// Define la ruta para servir el archivo index-x02.html
app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index-x02.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index-x02.html'));
});

// Puerto en el que el servidor escucha
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

