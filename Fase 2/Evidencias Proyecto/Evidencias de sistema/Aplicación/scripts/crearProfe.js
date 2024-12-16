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

async function createProfessor() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    const email = 'prueba@gm.com'; // Correo del profesor
    const password = '123456'; // Contraseña inicial
    const hashedPassword = await bcrypt.hash(password, 10); // Hash de la contraseña
    const nombre = 'prueba2'; // Nombre del profesor
    const apellido = 'ApellidoPrueba'; // Apellido del profesor
    const tipo = 2; // Tipo de usuario (2 = profesor)
    const especialidad = 'Guitarra'; // Especialidad del profesor
    const telefono = '123456789'; // Teléfono del profesor
    const direccion = 'Avenida Siempre Viva'; // Dirección del profesor

    // Verificar si el profesor ya existe en la tabla `usuarios`
    const [existingUser] = await connection.execute(
      'SELECT * FROM usuarios WHERE email_personal = ?',
      [email]
    );

    if (existingUser.length > 0) {
      console.log('El profesor ya existe.');
      return;
    }

    // Insertar el usuario en la tabla `usuarios`
    const [userResult] = await connection.execute(
      `INSERT INTO usuarios (email_personal, contrasena, tipo) 
       VALUES (?, ?, ?)`,
      [email, hashedPassword, tipo]
    );

    const userId = userResult.insertId;

    // Insertar los detalles del profesor en la tabla `profesor`
    const [professorResult] = await connection.execute(
      `INSERT INTO profesor (nombre, apellido, email, tipo, especialidad, usuario_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, email, tipo, especialidad, userId]
    );

    const professorId = professorResult.insertId;

    // Actualizar la tabla `usuarios` para establecer la relación con el profesor
    await connection.execute(
      `UPDATE usuarios SET profesor_id = ? WHERE id = ?`,
      [professorId, userId]
    );

    console.log('Profesor creado con ID:', professorId);
  } catch (error) {
    console.error('Error al crear profesor:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createProfessor();