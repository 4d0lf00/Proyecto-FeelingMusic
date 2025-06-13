require('dotenv').config();
const bcrypt = require('bcrypt');
// const mysql = require('mysql2/promise'); // Ya no se necesita crear conexión directa aquí
const pool = require('../db'); // Importar el pool desde db.js

//---------------------------------------------------
//Script para la creación de administradores en la BD
//---------------------------------------------------

// Ya no se necesita dbConfig aquí si usamos el pool de db.js
// const dbConfig = {
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
// };

async function createAdmin() {
  let connection;

  try {
    // Obtener una conexión del pool
    connection = await pool.getConnection();
    console.log('Conexión obtenida del pool para crear admin.');

    const email = 'pablo@gmail.com'; // Correo del administrador
    const password = 'admin123'; // Contraseña inicial
    const hashedPassword = await bcrypt.hash(password, 10); // Hash de la contraseña
    const nombre = 'Pablo'; // Nombre del administrador
    const apellido = 'León'; // Apellido del administrador
    const especialidad = 'Administrador'; // Especialidad del administrador

    // Verificar si el administrador ya existe en la tabla usuarios
    const [existingAdmin] = await connection.execute(
      'SELECT * FROM usuarios WHERE email_personal = ?',
      [email]
    );

    if (existingAdmin.length > 0) {
      console.log('El usuario administrador ya existe en la tabla usuarios.');
      return; // Salir si ya existe
    }

    // Inserción en la tabla profesor (considerando que un admin también podría ser un tipo de 'profesor' en tu estructura)
    // Si los admins no deben estar en la tabla profesor, esta lógica debería cambiar.
    const [profesorResult] = await connection.execute(
      'INSERT INTO profesor (nombre, apellido, email, tipo, especialidad) VALUES (?, ?, ?, ?, ?)',
      [nombre, apellido, email, 1, especialidad] // Asumiendo tipo 1 es Admin para la tabla profesor
    );

    const profesorId = profesorResult.insertId;

    // Inserción del administrador en la tabla usuarios
    const [result] = await connection.execute(
      'INSERT INTO usuarios (email_personal, contrasena, tipo, profesor_id) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, 1, profesorId] // Asigna '1' al tipo de usuario administrador y vincula con profesorId
    );

    const usuarioId = result.insertId;

    // Actualizar la tabla profesor con el usuario_id correspondiente (si tu esquema lo requiere así)
    // Esto crea una relación bidireccional si es necesaria.
    await connection.execute(
      'UPDATE profesor SET usuario_id = ? WHERE id = ?',
      [usuarioId, profesorId]
    );

    console.log('Administrador creado con ID de usuario:', usuarioId);
    console.log('Entrada correspondiente en tabla profesor creada con ID:', profesorId);

  } catch (error) {
    console.error('Error al crear administrador:', error);
  } finally {
    // Asegurarse de liberar la conexión de vuelta al pool, incluso si ocurre un error
    if (connection) {
      try {
        await connection.release();
        console.log('Conexión liberada de vuelta al pool.');
      } catch (releaseError) {
        console.error('Error al liberar la conexión:', releaseError);
      }
    }
  }
}

createAdmin();
