const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const queries = require('./queries'); // Importar las funciones de consulta
const router = express.Router();



//-------------------Inicio Rutas login

// Ruta para el registro de usuario
router.post('/register', [
    body('email').isEmail().withMessage('El email no es válido'),
    body('contrasena').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, contrasena } = req.body;

    // Hashear la contraseña antes de guardarla
    bcrypt.hash(contrasena, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: 'Error al registrar el usuario' });
        }

        // Guardar el usuario en la base de datos con el hash de la contraseña
        queries.insertarUsuario(email, hash, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error al insertar el usuario' });
            }
            res.status(201).json({ message: 'Usuario registrado exitosamente' });
        });
    });
});


// Ruta para el login con validaciones
router.post('/login', [
    body('email').isEmail().withMessage('El email no es válido'),
    body('contrasena').isLength({ min: 4 }).withMessage('La contraseña debe tener al menos 4 caracteres'),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, contrasena } = req.body;

    // Consultar a la base de datos para verificar las credenciales
    queries.obtenerUsuarioLogin(email, (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = results[0];

        // Verificar la contraseña con bcrypt
        bcrypt.compare(contrasena, user.contrasena, (err, match) => {
            if (err || !match) {
                return res.status(401).json({ error: 'Credenciales incorrectas' });
            }

            // Crear el token JWT con la información del usuario
            console.log(user.tipo)
            const token = jwt.sign({ id: user.id, tipo: user.tipo }, process.env.JWT_SECRET, { expiresIn: '4h' });
            console.log(token)
            // Establecer el token en el header Authorization
            //res.set('Authorization', `Bearer ${token}`);
            
            
            
            res.json({ token, tipo: user.tipo });
            
        });
    });
});

// Middleware para verificar el token JWT
function verificarToken(req, res, next) {
    console.log('Esta es la función verificarToken');
    //const token = req.headers['authorization']?.split(' ')[1]; // Extrae el token sin el prefijo 'Bearer'
    //const token = req.headers.authorization;
    const authHeader = req.headers['authorization'];
    const token1 = authHeader && authHeader.split(' ')[1]; // Esto separa "Bearer" del token
    console.log('Token recibido:', token1);
    console.log('JWT_SECRET:', process.env.JWT_SECRET);

    if (!token1) {
        return res.status(403).send({ error: 'No token provided' });
    }

    jwt.verify(token1, process.env.JWT_SECRET, (err, decoded) => {
        console.log('Entró a la sección jwt.verify');
        console.log('Error:', err);
        console.log('Decoded:', decoded);

        if (err) {
            return res.status(500).send({ error: 'Failed to authenticate token' });
        }

        req.userId = decoded.id;
        req.userTipo = decoded.tipo; // Guarda el tipo de usuario
        console.log('Se setearon los id y tipo');
        next();
    });
}


// Ejemplo de ruta protegida para administradores
router.get('/ruta-admin', verificarToken, (req, res) => {
    if (req.userTipo !== 1) {
        return res.status(403).json({ error: 'No tiene permisos para acceder a esta ruta' });
    }
    // res.send('Acceso a la ruta de administrador');
    res.render('registrar-profesor', { title: 'ruta admin' });
});




// Ruta GET para mostrar el formulario de login
router.get('/login', (req, res) => {
    res.render('login', { title: 'Inicio Sesion' });
});



// Ruta para el registrar
router.get('/register',  (req, res) => {
    res.render('registrar-profesor', { title: 'Registrar profesor' });
});

//-------------------Fin Rutas login







// Ruta para el filtro
router.get('/filtro', (req, res) => {
    res.render('filtro', { title: 'Filtro de Alumnos' });
});

// Ruta para la página de inicio
router.get('/', (req, res) => {
    res.render('index-x02', { title: 'Inicio' });
});

// Ruta para el formulario
router.get('/form', (req, res) => {
    res.render('form', { title: 'Formulario de Registro' });
});

// Ruta para el formulario de clase musical
router.get('/formulario-class', (req, res) => {
    res.render('formulario-class', { title: 'Formulario de Clase Musical' });
});




// Ruta para buscar alumnos
router.post('/buscar_alumnos', (req, res) => {
    const { busqueda } = req.body;
    queries.buscarAlumnos(busqueda, (err, results) => {
        if (err) {
            console.error('Error ejecutando la consulta:', err);
            res.status(500).send('Error en la consulta');
            return;
        }
        res.json(results);
    });
});

// Ruta para obtener todos los profesores
router.get('/profesores', (req, res) => {
    queries.obtenerProfesores((err, results) => {
        if (err) {
            return res.status(500).send('Error en la consulta a la base de datos');
        }
        console.log('Profesores obtenidos:', results);
        res.json(results);  // Enviar los resultados como respuesta en formato JSON
    });
});

router.post('/alumnos', (req, res) => {
    const { nombre, apellido, email, numero_telefono, rut, comentarios } = req.body;
    console.log('Datos recibidos:', req.body);

    // Verificar si los datos esenciales están presentes
    if (!nombre || !apellido || !email || !numero_telefono || !rut) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    queries.insertarAlumno(nombre, apellido, email, numero_telefono, rut, comentarios, (err, result) => {
        if (err) {
            console.error('Error al insertar el alumno:', err.message);
            if (err.message === 'El email ya está registrado') {
                return res.status(409).json({ error: err.message });
            }
            return res.status(500).json({ error: 'Error al insertar el alumno' });
        }
        console.log('Inserción exitosa:', result);
        res.status(200).json({ message: 'Alumno insertado correctamente' });
    });
});

// Exportar el router
module.exports = router;
