const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;

// Configuración de la conexión a la base de datos
const db = mysql.createConnection({
  host: 'localhost',
  user: 'matiaspc',
  password: 'a123',
  database: 'testbd'
});

db.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('Conexión a la base de datos establecida');
});

app.use(express.json());

// Ruta para obtener todos los alumnos con información general
app.get('/admin/alumnos', (req, res) => {
  const query = `
    SELECT 
      a.id, 
      a.nombre, 
      a.apellido1, 
      a.apellido2, 
      a.rut, 
      a.numero_telefono, 
      a.email, 
      a.fecha_nacimiento,
      GROUP_CONCAT(DISTINCT ti.nombre) AS instrumentos,
      GROUP_CONCAT(DISTINCT m.tipo) AS modalidades
    FROM 
      alumno a
    LEFT JOIN 
      tipo_de_instrumento ti ON a.id = ti.alumno_id
    LEFT JOIN 
      salas s ON a.id = s.alumno_id
    LEFT JOIN 
      modalidades m ON s.id = m.id
    GROUP BY 
      a.id
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener los alumnos:', err);
      res.status(500).json({ error: 'Error al obtener los alumnos' });
      return;
    }
    res.json(results);
  });
});

// Ruta para filtrar alumnos por instrumento
app.get('/admin/alumnos/instrumento/:instrumento', (req, res) => {
  const instrumento = req.params.instrumento;
  const query = `
    SELECT 
      a.id, 
      a.nombre, 
      a.apellido1, 
      a.apellido2, 
      a.email,
      ti.nombre AS instrumento
    FROM 
      alumno a
    JOIN 
      tipo_de_instrumento ti ON a.id = ti.alumno_id
    WHERE 
      ti.nombre = ?
  `;

  db.query(query, [instrumento], (err, results) => {
    if (err) {
      console.error('Error al filtrar alumnos por instrumento:', err);
      res.status(500).json({ error: 'Error al filtrar alumnos' });
      return;
    }
    res.json(results);
  });
});

// Ruta para filtrar alumnos por modalidad
app.get('/admin/alumnos/modalidad/:modalidad', (req, res) => {
  const modalidad = req.params.modalidad;
  const query = `
    SELECT 
      a.id, 
      a.nombre, 
      a.apellido1, 
      a.apellido2, 
      a.email,
      m.tipo AS modalidad
    FROM 
      alumno a
    JOIN 
      salas s ON a.id = s.alumno_id
    JOIN 
      modalidades m ON s.id = m.id
    WHERE 
      m.tipo = ?
  `;

  db.query(query, [modalidad], (err, results) => {
    if (err) {
      console.error('Error al filtrar alumnos por modalidad:', err);
      res.status(500).json({ error: 'Error al filtrar alumnos' });
      return;
    }
    res.json(results);
  });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});