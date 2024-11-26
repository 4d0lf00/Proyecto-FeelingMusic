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
router.get('/filtro', (req, res) => {
    if (req.userTipo === 2 && req.userTipo !== 1) {
        return res.redirect('/login?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    res.render('filtro', { title: 'Filtro de Alumnos' });
});

// Ruta para el filtro2
router.get('/filtro2', (req, res) => {
    if (req.userTipo === 2 && req.userTipo !== 1) {
        return res.redirect('/login?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    res.render('filtro2', { title: 'Filtro de Alumnos 2' });
});

// Ruta para la página de inicio
router.get('/', (req, res) => {
    res.render('index-x02', { title: 'Inicio' });
});

// Ruta para el formulario
router.get('/form', (req, res) => {
    if (req.userTipo === 1 && req.userTipo === 2) {
        return res.redirect('/login?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    res.render('form', { title: 'Formulario de Registro' });
});

// Ruta para el formulario de clase musical
router.get('/formulario-class', (req, res) => {
    if (req.userTipo === 2 || req.userTipo === 1) {
        return res.redirect('/login?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
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



// Ruta para el login
router.post('/login', [
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

            const token = jwt.sign({ id: user.id, tipo: user.tipo }, process.env.JWT_SECRET, { expiresIn: '4h' });
            
            res.cookie('auth_token', `Bearer ${token}`, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 4 * 60 * 60 * 1000
            });
            
            // Enviar la URL de redirección según el tipo de usuario
            res.json({ 
                success: true,
                tipo: user.tipo,
                redirectUrl: user.tipo === 1 ? '/dashboard' : '/'
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
router.get('/dashboard', verificarToken, (req, res) => {
    if (req.userTipo !== 1) {
        return res.redirect('/login?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    dashboardController.getDashboardData(req, res);
});

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
router.get('/horarios', verificarToken, (req, res) => {
    if (req.userTipo !== 2) {
        return res.redirect('/login?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }

    queries.obtenerProfesores((error, profesores) => {
        if (error) {
            console.error('Error al obtener los profesores:', error);
            return res.status(500).send('Error al obtener los profesores');
        }

        queries.obtenerSalas((errorSalas, salas) => {
            if (errorSalas) {
                console.error('Error al obtener las salas:', errorSalas);
                return res.status(500).send('Error al obtener las salas');
            }

            queries.obtenerInstrumentos((errorInstrumentos, instrumentos) => {
                if (errorInstrumentos) {
                    console.error('Error al obtener los instrumentos:', errorInstrumentos);
                    return res.status(500).send('Error al obtener los instrumentos');
                }

                queries.obtenerHorariosPorProfesor(req.userId, (errorHorarios, horarios) => {
                    if (errorHorarios) {
                        console.error('Error al obtener los horarios:', errorHorarios);
                        return res.status(500).send('Error al obtener los horarios');
                    }

                    res.render('horarios', { 
                        title: 'Horario de Clases',
                        profesores: profesores,
                        salas: salas,
                        instrumentos: instrumentos,
                        horarios: horarios,
                        userId: req.userId
                    });
                });
            });
        });
    });
});

// Ruta para guardar o actualizar un horario
router.post('/guardar-horario', verificarToken, (req, res) => {
    const { fecha, horaInicio, horaFin, profesorId, salaNombre, instrumentoNombre } = req.body;

    queries.obtenerInstrumentoIdPorNombre(instrumentoNombre, (error, instrumentoId) => {
        if (error || !instrumentoId) {
            console.error('Error al obtener el ID del instrumento:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener el ID del instrumento' });
        }

        queries.guardarHorario(fecha, horaInicio, horaFin, profesorId, salaNombre, (error, horarioId) => {
            if (error) {
                console.error('Error al guardar el horario:', error);
                return res.status(500).json({ success: false, message: 'Error al guardar el horario' });
            }

            queries.guardarClase(horarioId, instrumentoId, profesorId, (error) => {
                if (error) {
                    console.error('Error al guardar la clase:', error);
                    return res.status(500).json({ success: false, message: 'Error al guardar la clase' });
                }

                res.json({ success: true, message: 'Clase guardada exitosamente' });
            });
        });
    });
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

// Ruta para ver el horario semanal
router.get('/horarios-semana', verificarToken, (req, res) => {
    if (req.userTipo !== 2) {
        return res.redirect('/login?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }

    queries.obtenerHorariosPorProfesor(req.userId, (error, horarios) => {
        if (error) {
            console.error('Error al obtener los horarios:', error);
            return res.status(500).send('Error al obtener los horarios');
        }

        // Filter the schedules for the current week
        const currentWeek = getCurrentWeek();
        const weeklyHorarios = horarios.filter(horario => {
            const horarioDate = new Date(horario.annio, horario.mes - 1, horario.dia);
            return currentWeek.some(date => date.getTime() === horarioDate.getTime());
        });

        res.render('horarios-semana', { 
            title: 'Horario Semanal',
            weeklyHorarios: weeklyHorarios
        });
    });
});

// Helper function to get the current week's dates
function getCurrentWeek() {
    const currentDate = new Date();
    const firstDayOfWeek = currentDate.getDate() - currentDate.getDay() + 1; // Monday
    const week = [];

    for (let i = 0; i < 7; i++) {
        const date = new Date(currentDate.setDate(firstDayOfWeek + i));
        week.push(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
    }

    return week;
}

// Ruta para eliminar un horario
router.delete('/eliminar-horario/:horarioId', verificarToken, (req, res) => {
    const { horarioId } = req.params;

    queries.eliminarHorario(horarioId, req.userId, (error, resultado) => {
        if (error) {
            console.error('Error al eliminar el horario:', error);
            return res.status(500).json({ success: false, message: 'Error al eliminar el horario' });
        }
        res.json({ success: true, message: 'Horario eliminado exitosamente' });
    });
});

// Exportar el router
module.exports = router;
