require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

//---------------------------------------------------
//Script para la creación de administradores en la BD
//---------------------------------------------------

// Configuración de conexión a la base de datos
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function createAdmin() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    const email = 'admin@feelingmusic.com'; // Correo del administrador
    const password = 'admin_password123'; // Contraseña inicial
    const hashedPassword = await bcrypt.hash(password, 10); // Hash de la contraseña

    // Verificar si el administrador ya existe
    const [existingAdmin] = await connection.execute(
      'SELECT * FROM usuarios WHERE email_personal = ?',
      [email]
    );

    if (existingAdmin.length > 0) {
      console.log('El administrador ya existe.');
      return;
    }

    // Inserción del administrador, asegurando que alumno_id y profesor_id sean NULL
    const [result] = await connection.execute(
    'INSERT INTO usuarios (email_personal, contrasena, tipo, alumno_id, profesor_id) VALUES (?, ?, ?, NULL, NULL)',
    [email, hashedPassword, 1] // Asigna '1' al tipo de usuario administrador
  );
  
    console.log('Administrador creado con ID:', result.insertId);
  } catch (error) {
    console.error('Error al crear administrador:', error);
  } finally {
    // Asegurarse de cerrar la conexión, incluso si ocurre un error
    if (connection) {
      await connection.end();
    }
  }
}

createAdmin();
