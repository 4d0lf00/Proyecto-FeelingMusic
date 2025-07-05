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

async function createAlumno() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    const nombre = 'Juan'; // Nombre del alumno
    const apellido = 'Pérez'; // Apellido del alumno
    const rut = '12345678-9'; // RUT del alumno
    const numeroTelefono = '123456789'; // Número de teléfono del alumno
    const email = 'juan.perez@gmail.com'; // Correo electrónico del alumno
    const password = 'alumno123'; // Contraseña inicial
    const hashedPassword = await bcrypt.hash(password, 10); // Hash de la contraseña
    const tipo = 3; // Tipo de usuario (3 = alumno)

    // Verificar si el alumno ya existe en la tabla `alumno`
    const [existingAlumno] = await connection.execute(
      'SELECT * FROM alumno WHERE email = ?',
      [email]
    );

    if (existingAlumno.length > 0) {
      console.log('El alumno ya existe.');
      return;
    }

    // Insertar el alumno en la tabla `alumno`
    const [alumnoResult] = await connection.execute(
      `INSERT INTO alumno (nombre, apellido, rut, numero_telefono, email) 
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, apellido, rut, numeroTelefono, email]
    );

    const alumnoId = alumnoResult.insertId;

    // Insertar el usuario en la tabla `usuarios`
    const [userResult] = await connection.execute(
      `INSERT INTO usuarios (email_personal, contrasena, tipo, alumno_id) 
       VALUES (?, ?, ?, ?)`,
      [email, hashedPassword, tipo, alumnoId]
    );

    const userId = userResult.insertId;

    console.log('Alumno creado con ID:', alumnoId);
  } catch (error) {
    console.error('Error al crear alumno:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createAlumno();