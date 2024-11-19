const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const queries = require('./queries'); // Importar las funciones de consulta
const router = express.Router();



//-------------------Inicio Rutas login

// Ruta para el registro de usuario
router.post('/registrar-profesor', [
    body('email').isEmail().withMessage('El email no es válido'),
    body('contrasena').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, contrasena, nombre } = req.body;

    // Hashear la contraseña antes de guardarla
    bcrypt.hash(contrasena, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: 'Error al registrar el usuario' });
        }

        // Guardar el usuario en la base de datos con el hash de la contraseña
        queries.insertarUsuario(email, hash, nombre, (err) => {
            if (err) {
                console.error('Error en inserción:', err);
                return res.status(500).json({ error: 'Error al insertar el usuario' });
            }
            res.status(201).json({ message: 'Usuario registrado exitosamente' });
        });
    });
});



// Ruta para el login con validaciones
router.post('/login', [
    body('email').isEmail().withMessage('El email no es válido'),
    //El requisito de contraseña debe cambiarse por uno más robusto
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

            const token = jwt.sign({ id: user.id, tipo: user.tipo }, process.env.JWT_SECRET, { expiresIn: '4h' });
            
            res.cookie('auth_token', `Bearer ${token}`, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 4 * 60 * 60 * 1000
            });
            
            res.json({ 
                tipo: user.tipo,
                token: `Bearer ${token}`
            });
        });
    });
});

// Middleware para verificar el token JWT
function verificarToken(req, res, next) {
    const token = req.cookies.auth_token;
    
    if (!token) {
        return res.redirect('/login?error=' + encodeURIComponent('Debes iniciar sesión para acceder a esta página'));
    }

    const tokenPart = token.split(' ')[1];
    
    jwt.verify(tokenPart, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.redirect('/login?error=' + encodeURIComponent('Tu sesión ha expirado. Por favor, inicia sesión nuevamente'));
        }
        
        req.userId = decoded.id;
        req.userTipo = decoded.tipo;
        next();
    });
}


// Ruta protegida para administradores
router.get('/registrar-profesor', verificarToken, (req, res) => {
    if (req.userTipo !== 1) {
        return res.redirect('/login?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    res.render('registrar-profesor', { title: 'Registrar Profesor' });
});





// Ruta GET para mostrar el formulario de login
router.get('/login', (req, res) => {
    res.render('login', { 
        title: 'Inicio Sesion',
        error: req.query.error || null
    });
});



// Ruta para el registrar
// router.get('/registrar-profesor',  (req, res) => {
//     res.render('registrar-profesor', { title: 'Registrar Nuevo Profesor' });
// });

//-------------------Fin Rutas login







// Ruta para el filtro
router.get('/filtro', (req, res) => {
    if (req.userTipo === 3 || (req.userTipo !== 1 && req.userTipo !== 2)) {
        return res.redirect('/login?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    res.render('filtro', { title: 'Filtro de Alumnos' });
});

// Ruta para la página de inicio
router.get('/', (req, res) => {
    res.render('index-x02', { title: 'Inicio' });
});

// Ruta para el formulario
router.get('/form', (req, res) => {
    if (req.userTipo === 3 || (req.userTipo !== 1 && req.userTipo !== 2)) {
        return res.redirect('/login?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    res.render('form', { title: 'Formulario de Registro' });
});

// Ruta para el formulario de clase musical
router.get('/formulario-class', (req, res) => {
    if (req.userTipo === 3 || (req.userTipo !== 1 && req.userTipo !== 2)) {
        return res.redirect('/login?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
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
