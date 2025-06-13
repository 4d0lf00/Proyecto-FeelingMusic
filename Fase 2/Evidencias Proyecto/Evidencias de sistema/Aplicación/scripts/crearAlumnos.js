require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

// Configuración de conexión a la base de datos
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// Nombres y apellidos para generar alumnos
const nombres = ['Juan', 'María', 'Pedro', 'Ana', 'Luis', 'Sofía', 'Carlos', 'Elena', 'Alejandro', 'Valeria', 'Gabriel', 'Isabella', 'Julian', 'Lucia', 'Mateo', 'Daniela', 'Sebastian', 'Paula', 'Nicolás', 'Gabriela'];
const apellidos = ['Pérez', 'García', 'Martínez', 'Rodríguez', 'González', 'López', 'Díaz', 'Hernández', 'Morales', 'Gómez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Castillo', 'Cruz', 'Ortiz', 'Gutiérrez', 'Álvarez'];

async function createAlumnos() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    const password = 'alumno123'; // Contraseña inicial
    const hashedPassword = await bcrypt.hash(password, 10); // Hash de la contraseña
    const tipo = 3; // Tipo de usuario (3 = alumno)

    for (let i = 0; i < 20; i++) {
      const nombre = nombres[i];
      const apellido = apellidos[i];
      const email = `${nombre.toLowerCase()}.${apellido.toLowerCase()}@example.com`;
      const rut = `${Math.floor(Math.random() * 10000000)}-${Math.floor(Math.random() * 10)}`;

      // Verificar si el alumno ya existe en la tabla `alumno`
      const [existingAlumno] = await connection.execute(
        'SELECT * FROM alumno WHERE email = ?',
        [email]
      );

      if (existingAlumno.length > 0) {
        console.log(`El alumno ${nombre} ${apellido} ya existe.`);
        continue;
      }

      // Insertar el alumno en la tabla `alumno`
      const [alumnoResult] = await connection.execute(
        `INSERT INTO alumno (nombre, apellido, rut, numero_telefono, email) 
         VALUES (?, ?, ?, ?, ?)`,
        [nombre, apellido, rut, '123456789', email]
      );

      const alumnoId = alumnoResult.insertId;

      // Insertar el usuario en la tabla `usuarios`
      await connection.execute(
        `INSERT INTO usuarios (email_personal, contrasena, tipo, alumno_id) 
         VALUES (?, ?, ?, ?)`,
        [email, hashedPassword, tipo, alumnoId]
      );

      console.log(`Alumno ${nombre} ${apellido} creado con ID: ${alumnoId}`);
    }
  } catch (error) {
    console.error('Error al crear alumnos:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createAlumnos();