const express = require('express');
const jwt = require('jsonwebtoken');
const queries = require('./queries'); // Importar las funciones de consulta
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const dashboardController = require('./controllers/dashboardController');
const path = require('path');
const db = require('./db'); // Agregar esta línea

// Ruta para el filtro
router.get('/filtro', verificarToken, (req, res) => {
    if (req.userTipo === 2 || req.userTipo === 1) {
        res.render('filtro', { title: 'Filtro de Alumnos' });
    } else {
        // Si no es profesor ni admin, redirigir
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
});

// Ruta para el filtro2
router.get('/filtro2', (req, res) => {
    if (req.userTipo === 2 && req.userTipo !== 1) {
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    res.render('filtro2', { title: 'Filtro de Alumnos 2' });
});

// Ruta para la página de inicio
router.get('/', (req, res) => {
    res.render('index-x02', { title: 'Inicio' });
});

// Ruta para el formulario
router.get('/form', verificarToken, (req, res) => {
    if (req.userTipo !== 2) {
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    res.render('form', { title: 'Formulario de Registro' });
});

// Ruta para el formulario de clase musical
router.get('/formulario-class', (req, res) => {
    if (req.userTipo === 2 || (req.userTipo === 1)) {
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    res.render('formulario-class', { title: 'Formulario de Clase Musical' });
});

router.get('/blocks', (req, res) => {
    res.render('blocks', { title: 'Blocks' });
});

router.get('/elements', (req, res) => {
    res.render('elements', { title: 'Elements' });
});

router.get('/cards', (req, res) => {
    res.render('cards', { title: 'Cards' });
});

router.get('/carousel', (req, res) => {
    res.render('carousel', { title: 'Carousel' });
});

router.get('/people', (req, res) => {
    res.render('people', { title: 'People' });
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

// Ruta para insertar un nuevo alumno
router.post('/alumnos', verificarToken, (req, res) => {
    const { nombre, apellido, email, numero_telefono, rut, comentarios } = req.body;

    // Obtener el ID del profesor correspondiente al ID de la tabla usuarios
    queries.obtenerProfesorId(req.userId, (err, profesorId) => {
        if (err) {
            console.error('Error al obtener el ID del profesor:', err);
            return res.status(500).json({ error: 'Error al obtener el ID del profesor' });
        }

        // Insertar el alumno en la base de datos
        queries.insertarAlumno(nombre, apellido, email, numero_telefono, rut, comentarios, profesorId[0].profesor_id, (err, result) => {
            if (err) {
                console.error('Error al insertar el alumno:', err);
                return res.status(500).json({ error: 'Error al insertar el alumno' });
            }

            // Crear el usuario para el alumno
            queries.crearUsuarioAlumno(result.insertId, email, nombre, rut, profesorId[0].profesor_id, (err) => {
                if (err) {
                    console.error('Error al crear el usuario para el alumno:', err);
                    return res.status(500).json({ error: 'Error al crear el usuario para el alumno' });
                }
                res.status(200).json({ message: 'Alumno registrado y usuario creado exitosamente' });
            });
        });
    });
});
//-------------------Inicio Rutas login

router.post('/register2', [
    body('email').isEmail().withMessage('El email no es válido'),
    body('contrasena').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    body('apellido').notEmpty().withMessage('El apellido es requerido'),
    body('especialidad').notEmpty().withMessage('la especialidad es requerida')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, contrasena, nombre, apellido, especialidad } = req.body;

    // Hashear la contraseña antes de guardarla
    bcrypt.hash(contrasena, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: 'Error al registrar el usuario' });
        }

        // Guardar el usuario en la base de datos con el hash de la contraseña
        queries.insertarUsuario(email, hash, nombre, apellido, especialidad, (err) => {
            if (err) {
                console.error('Error en inserción:', err);
                return res.status(500).json({ error: 'Error al insertar el usuario' });
            }
            res.status(201).json({ message: 'Usuario registrado exitosamente' });
        });
    });
});

// Resto del código...

// Ruta para el login
router.post('/login2', [
    body('email').isEmail().withMessage('El email no es válido'),
    body('contrasena').isLength({ min: 4 }).withMessage('La contraseña debe tener al menos 4 caracteres'),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, contrasena } = req.body;

    queries.obtenerUsuarioLogin(email, (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = results[0];

        bcrypt.compare(contrasena, user.contrasena, (err, match) => {
            if (err || !match) {
                return res.status(401).json({ error: 'Credenciales incorrectas' });
            }

            // Obtener el ID del profesor correspondiente al ID de la tabla usuarios
            queries.obtenerProfesorId(user.id, (err, profesorId) => {
                if (err) {
                    console.error('Error al obtener el ID del profesor:', err);
                    return res.status(500).json({ error: 'Error al obtener el ID del profesor' });
                }

                const token = jwt.sign({ id: user.id, tipo: user.tipo, profesorId: profesorId }, process.env.JWT_SECRET, { expiresIn: '4h' });
                
                // Configurar la cookie como una cookie de sesión
                res.cookie('auth_token', `Bearer ${token}`, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    // No establecer maxAge ni expires para que sea una cookie de sesión
                });
                
                // Redirigir a la página del formulario si es un profesor
                if (user.tipo === 2) {
                    return res.json({ 
                        success: true,
                        tipo: user.tipo,
                        redirectUrl: '/form' // Redirigir a la página del formulario
                    });
                }

                // Enviar la URL de redirección según el tipo de usuario
                res.json({ 
                    success: true,
                    tipo: user.tipo,
                    redirectUrl: user.tipo === 1 ? '/dashboard' : '/'
                });
            });
        });
    });
});

// Middleware para verificar el token JWT
function verificarToken(req, res, next) {
    const token = req.cookies.auth_token;
    
    if (!token) {
        return res.redirect('/login2?error=' + encodeURIComponent('Debes iniciar sesión para acceder a esta página'));
    }

    const tokenPart = token.split(' ')[1];
    
    jwt.verify(tokenPart, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.redirect('/login2?error=' + encodeURIComponent('Tu sesión ha expirado. Por favor, inicia sesión nuevamente'));
        }
        
        req.userId = decoded.id;
        req.userTipo = decoded.tipo;
        next();
    });
}


// Ruta protegida para administradores
router.get('/dashboard', verificarToken, (req, res) => {
    if (req.userTipo !== 1) {
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    dashboardController.getDashboardData(req, res);
});

// Ruta protegida para administradores
router.get('/register2', verificarToken, (req, res) => {
    if (req.userTipo !== 1) {
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    res.render('register2', { title: 'Registrar Profesor' });
});


// Ruta GET para mostrar el formulario de login
router.get('/login2', (req, res) => {
    res.render('login2', { 
        title: 'Inicio Sesion',
        error: req.query.error || null
    });
});



// Ruta para el registrar
// router.get('/registrar-profesor',  (req, res) => {
//     res.render('registrar-profesor', { title: 'Registrar Nuevo Profesor' });
// });

//-------------------Fin Rutas login

// Ruta para obtener el total de alumnos
router.get('/api/total-alumnos', async (req, res) => {
    try {
        db.query('SELECT COUNT(*) as total FROM alumno', (err, results) => {
            if (err) {
                console.error('Error al obtener total de alumnos:', err);
                return res.status(500).json({ error: 'Error al obtener datos' });
            }
            res.json({ total: results[0].total });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Agregar esta nueva ruta para obtener alumnos por mes
router.get('/api/alumnos-por-mes', async (req, res) => {
    try {
        const query = `
            SELECT 
                MONTH(fecha_registro) as mes,
                COUNT(*) as total
            FROM alumno
            WHERE YEAR(fecha_registro) = YEAR(CURRENT_DATE())
            GROUP BY MONTH(fecha_registro)
            ORDER BY mes
        `;

        db.query(query, (err, results) => {
            if (err) {
                console.error('Error al obtener alumnos por mes:', err);
                return res.status(500).json({ error: 'Error al obtener datos' });
            }

            // Crear array con 12 meses inicializados en 0
            const monthlyData = new Array(12).fill(0);
            
            // Llenar con los datos reales
            results.forEach(row => {
                monthlyData[row.mes - 1] = row.total;
            });

            res.json({ monthly: monthlyData });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Ruta para el horario
router.get('/horarios', (req, res) => {
    if (req.userTipo === 2 && req.userTipo !== 1) {
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }

    queries.obtenerProfesores((error, profesores) => {
        if (error) {
            console.error('Error al obtener los profesores:', error);
            return res.status(500).send('Error al obtener los profesores');
        }

        // Obtener también las salas si es necesario
        queries.obtenerSalas((errorSalas, salas) => {
            if (errorSalas) {
                console.error('Error al obtener las salas:', errorSalas);
                return res.status(500).send('Error al obtener las salas');
            }

            res.render('horarios', { 
                title: 'Horario de Clases',
                profesores: profesores,
                salas: salas
            });
        });
    });
});

// Ruta para guardar el horario
router.post('/guardar-horario', async (req, res) => {
    try {
        const { fecha, horaInicio, horaFin, profesorId, salaNombre } = req.body;

        const resultado = await queries.insertarHorario(fecha, horaInicio, horaFin, profesorId, salaNombre);
        res.json({ success: true, message: 'Horario guardado exitosamente' });
    } catch (error) {
        console.error('Error al guardar el horario:', error);
        if (error.message === 'La sala ya está ocupada en este horario') {
            return res.status(409).json({ success: false, message: 'La sala ya está ocupada en este horario' });
        }
        res.status(500).json({ success: false, message: 'Error al guardar el horario' });
    }
});

// Ruta para obtener los horarios de un profesor
router.get('/horarios/:profesorId', (req, res) => {
    const { profesorId } = req.params;

    queries.obtenerHorariosPorProfesor(profesorId, (error, horarios) => {
        if (error) {
            console.error('Error al obtener los horarios:', error);
            return res.status(500).json({ error: 'Error al obtener los horarios' });
        }
        res.json(horarios);
    });
});

// Ruta para actualizar un horario
router.put('/actualizar-horario/:horarioId', (req, res) => {
    const { horarioId } = req.params;
    const { fecha, horaInicio, horaFin, salaNombre } = req.body;

    queries.actualizarHorario(horarioId, fecha, horaInicio, horaFin, salaNombre, (error, resultado) => {
        if (error) {
            console.error('Error al actualizar el horario:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar el horario' });
        }
        res.json({ success: true, message: 'Horario actualizado exitosamente' });
    });
});

// Nueva ruta para login2

//router.get('/login2', (req, res) => {
    //res.render('login2', { 
        //title: 'Inicio Sesion',
        //error: req.query.error || null
    //});
//})

// Exportar el router
module.exports = router;
