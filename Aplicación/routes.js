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

// Ruta GET para mostrar el formulario
router.get('/formulario-class', verificarToken, async (req, res) => {
    try {
        const alumnoId = req.query.alumnoId;
        
        // Verificar que tenemos el alumnoId
        if (!alumnoId) {
            return res.status(400).send('ID de alumno no proporcionado');
        }

        const profesorId = req.profesorId;

        // Obtener instrumentos del profesor
        const instrumentosQuery = `
            SELECT id, nombre 
            FROM instrumentos 
            WHERE profesor_id = ? 
            AND estado = 'activo'
        `;

        // Obtener horarios disponibles del profesor
        const horariosQuery = `
            SELECT h.id, h.dia, h.mes, h.annio, 
                   h.hora_inicio, h.hora_fin, s.nombre as sala_nombre
            FROM horarios h
            LEFT JOIN sala_horario sh ON h.id = sh.horario_id
            LEFT JOIN salas s ON sh.sala_id = s.id
            WHERE h.profesor_id = ?
            AND h.estado = 'Disponible'
            ORDER BY h.annio, h.mes, h.dia, h.hora_inicio
        `;

        // Ejecutar ambas consultas
        db.query(instrumentosQuery, [profesorId], (errorInstrumentos, instrumentos) => {
            if (errorInstrumentos) {
                console.error('Error al obtener instrumentos:', errorInstrumentos);
                return res.status(500).send('Error al cargar los instrumentos');
            }

            db.query(horariosQuery, [profesorId], (errorHorarios, horarios) => {
                if (errorHorarios) {
                    console.error('Error al obtener horarios:', errorHorarios);
                    return res.status(500).send('Error al cargar los horarios');
                }

                // Renderizar la vista con todos los datos necesarios
                res.render('formulario-class', {
                    alumnoId: alumnoId,
                    instrumentosDisponibles: instrumentos,
                    horariosProfesor: horarios
                });
            });
        });
    } catch (error) {
        console.error('Error en formulario-class:', error);
        res.status(500).send('Error al procesar la solicitud');
    }
});

// Ruta para el formulario de clase musical
router.post('/formulario-class', verificarToken, async (req, res) => {
    try {
        const { modalidad, instrumentoId, horarioId, alumnoId } = req.body;
        const profesorId = req.profesorId;

        // Primero insertar la modalidad
        const insertModalidad = `
            INSERT INTO modalidades (alumno_id, profesor_id, tipo) 
            VALUES (?, ?, ?)
        `;
        
        db.query(insertModalidad, [alumnoId, profesorId, modalidad], (err, resultModalidad) => {
            if (err) {
                console.error('Error al insertar modalidad:', err);
                return res.status(500).json({ error: 'Error al crear la modalidad' });
            }

            // Obtener el nombre del instrumento
            const getInstrumentoNombre = `
                SELECT nombre FROM instrumentos WHERE id = ?
            `;

            db.query(getInstrumentoNombre, [instrumentoId], (errInst, resultInst) => {
                if (errInst || !resultInst[0]) {
                    console.error('Error al obtener instrumento:', errInst);
                    return res.status(500).json({ error: 'Error al obtener información del instrumento' });
                }

                // Luego insertar la clase
                const insertClase = `
                    INSERT INTO clases (
                        nombre, modalidad_id, instrumento_id, 
                        horario_id, profesor_id, estado,
                        fecha, alumno_id
                    ) VALUES (?, ?, ?, ?, ?, 'activo', CURDATE(), ?)
                `;

                const nombreClase = `Clase de ${resultInst[0].nombre}`;

                db.query(insertClase, [
                    nombreClase,
                    resultModalidad.insertId,
                    instrumentoId,
                    horarioId,
                    profesorId,
                    alumnoId
                ], (errClase, resultClase) => {
                    if (errClase) {
                        console.error('Error al insertar clase:', errClase);
                        return res.status(500).json({ error: 'Error al crear la clase' });
                    }

                    // Actualizar el estado del horario a 'Ocupado'
                    const updateHorario = `
                        UPDATE horarios 
                        SET estado = 'Ocupado' 
                        WHERE id = ?
                    `;

                    db.query(updateHorario, [horarioId], (errHorario) => {
                        if (errHorario) {
                            console.error('Error al actualizar horario:', errHorario);
                            // No retornamos error aquí para no afectar la creación de la clase
                        }

                        res.json({ 
                            success: true, 
                            message: 'Clase registrada exitosamente' 
                        });
                    });
                });
            });
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
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

router.get('/horario', verificarToken, (req, res) => {
    if (req.userTipo !== 3) {
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }

    // Consulta para obtener los datos del alumno
    const alumnoQuery = `
        SELECT a.nombre, a.apellido, a.email, a.numero_telefono
        FROM alumno a
        WHERE a.id = ?
    `;

    // Consulta para obtener las clases del alumno
    const clasesQuery = `
        SELECT 
            c.nombre as nombre_clase,
            i.nombre as instrumento,
            p.nombre as profesor_nombre,
            p.apellido as profesor_apellido,
            s.nombre as sala_nombre,
            h.dia,
            h.mes,
            h.annio,
            h.hora_inicio,
            h.hora_fin,
            m.tipo as modalidad
        FROM clases c
        JOIN instrumentos i ON c.instrumento_id = i.id
        JOIN profesor p ON c.profesor_id = p.id
        JOIN horarios h ON c.horario_id = h.id
        JOIN modalidades m ON c.modalidad_id = m.id
        LEFT JOIN sala_horario sh ON h.id = sh.horario_id
        LEFT JOIN salas s ON sh.sala_id = s.id
        WHERE c.alumno_id = ?
        AND c.estado = 'activo'
        ORDER BY h.annio, h.mes, h.dia, h.hora_inicio
    `;

    // Ejecutar ambas consultas
    db.query(alumnoQuery, [req.alumnoId], (errorAlumno, resultadosAlumno) => {
        if (errorAlumno) {
            console.error('Error al obtener datos del alumno:', errorAlumno);
            return res.status(500).send('Error al cargar los datos del alumno');
        }

        if (resultadosAlumno.length === 0) {
            return res.status(404).send('Alumno no encontrado');
        }

        db.query(clasesQuery, [req.alumnoId], (errorClases, resultadosClases) => {
            if (errorClases) {
                console.error('Error al obtener clases:', errorClases);
                return res.status(500).send('Error al cargar las clases');
            }

            res.render('horario', { 
                title: 'Mi Horario',
                alumno: resultadosAlumno[0],
                clases: resultadosClases,
                alumnoId: req.alumnoId 
            });
        });
    });
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

            // Asegurarse de que result.insertId existe
            if (!result.insertId) {
                return res.status(500).json({ error: 'No se pudo obtener el ID del alumno' });
            }

            // Crear el usuario para el alumno
            queries.crearUsuarioAlumno(result.insertId, email, nombre, rut, profesorId[0].profesor_id, (err) => {
                if (err) {
                    console.error('Error al crear usuario:', err);
                    return res.status(500).json({ error: 'Error al crear el usuario' });
                }

                // Devolver el ID del alumno en la respuesta
                res.json({ 
                    success: true, 
                    message: 'Alumno registrado exitosamente',
                    alumnoId: result.insertId // Asegúrate de que este valor se está enviando
                });
            });
        });
    });
});
//-------------------Inicio Rutas login

router.post('/register2', async (req, res) => {
    try {
        const { nombre, apellido, email, contrasena, especialidad } = req.body;
        
        console.log('Datos recibidos:', { nombre, apellido, email, especialidad });

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        queries.insertarUsuario(
            email, 
            hashedPassword, 
            nombre, 
            apellido, 
            especialidad, 
            (error, resultado) => {
                if (error) {
                    console.error('Error en el registro:', error);
                    return res.status(500).json(error);
                }

                console.log('Profesor registrado exitosamente:', resultado);
                res.json(resultado);
            }
        );

    } catch (error) {
        console.error('Error en el proceso de registro:', error);
        res.status(500).json({ error: 'Error en el proceso de registro' });
    }
});

// Función auxiliar para generar token
function generarToken(usuario, tipo, callback) {
    if (tipo === 3) {
        // Token para alumno
        const token = jwt.sign({ 
            id: usuario.id, 
            tipo: usuario.tipo,
            alumnoId: usuario.alumno_id
        }, process.env.JWT_SECRET, { expiresIn: '4h' });
        return callback(null, token, '/horario');
    } else {
        // Token para profesor o admin
        queries.obtenerProfesorId(usuario.id, (err, profesorResult) => {
            if (err) return callback(err);
            
            const token = jwt.sign({ 
                id: usuario.id, 
                tipo: usuario.tipo,
                profesorId: profesorResult[0]?.profesor_id
            }, process.env.JWT_SECRET, { expiresIn: '4h' });
            
            const redirectUrl = usuario.tipo === 2 ? '/form' : '/dashboard';
            callback(null, token, redirectUrl);
        });
    }
}

// Modificar la ruta login2 existente
router.post('/login2', [
    body('email').isEmail().withMessage('El email no es válido'),
    body('contrasena').isLength({ min: 4 }).withMessage('La contraseña debe tener al menos 4 caracteres'),
], (req, res) => {
    const { email, contrasena } = req.body;

    queries.obtenerUsuarioLogin(email, (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = results[0];

        // Si es alumno (tipo 3), comparar contraseña directamente
        if (user.tipo === 3) {
            if (contrasena === user.contrasena) {
                generarToken(user, user.tipo, (err, token, redirectUrl) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error al generar el token' });
                    }

                    res.cookie('auth_token', `Bearer ${token}`, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production'
                    });

                    res.json({ 
                        success: true,
                        tipo: user.tipo,
                        redirectUrl: redirectUrl
                    });
                });
            } else {
                return res.status(401).json({ error: 'Credenciales incorrectas' });
            }
        } else {
            // Para profesores y admins, usar bcrypt
            bcrypt.compare(contrasena, user.contrasena, (err, match) => {
                if (err || !match) {
                    return res.status(401).json({ error: 'Credenciales incorrectas' });
                }

                generarToken(user, user.tipo, (err, token, redirectUrl) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error al generar el token' });
                    }

                    res.cookie('auth_token', `Bearer ${token}`, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production'
                    });

                    res.json({ 
                        success: true,
                        tipo: user.tipo,
                        redirectUrl: redirectUrl
                    });
                });
            });
        }
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
        req.profesorId = decoded.profesorId;
        req.alumnoId = decoded.alumnoId;
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
        
        // Agregar logs para depuración
        console.log('Datos recibidos:', {
            fecha,
            horaInicio,
            horaFin,
            profesorId,
            salaNombre
        });

        if (!profesorId) {
            return res.status(400).json({
                success: false,
                message: 'El ID del profesor es requerido'
            });
        }

        const resultado = await queries.insertarHorario(fecha, horaInicio, horaFin, profesorId, salaNombre);
        res.json({ 
            success: true, 
            message: 'Horario guardado exitosamente',
            data: resultado
        });
    } catch (error) {
        console.error('Error al guardar el horario:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error al guardar el horario'
        });
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

// Ruta para obtener las clases del alumno
router.get('/clases-alumno', verificarToken, async (req, res) => {
    try {
        const alumnoId = req.alumnoId; // Asumiendo que está en el token

        const query = `
            SELECT 
                c.nombre as nombre_clase,
                i.nombre as instrumento,
                p.nombre as profesor_nombre,
                p.apellido as profesor_apellido,
                s.nombre as sala_nombre,
                h.dia,
                h.mes,
                h.annio,
                h.hora_inicio,
                h.hora_fin
            FROM clases c
            JOIN instrumentos i ON c.instrumento_id = i.id
            JOIN profesor p ON c.profesor_id = p.id
            JOIN horarios h ON c.horario_id = h.id
            LEFT JOIN sala_horario sh ON h.id = sh.horario_id
            LEFT JOIN salas s ON sh.sala_id = s.id
            WHERE c.estado = 'activo'
            AND EXISTS (
                SELECT 1 FROM modalidades m 
                WHERE m.id = c.modalidad_id 
                AND m.alumno_id = ?
            )
            ORDER BY h.annio, h.mes, h.dia, h.hora_inicio;
        `;

        db.query(query, [alumnoId], (error, results) => {
            if (error) {
                console.error('Error al obtener clases:', error);
                return res.status(500).json({ error: 'Error al obtener las clases' });
            }
            res.json(results);
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Exportar el router
module.exports = router;

router.get('/logout', (req, res) => {
    // Limpiar tanto la sesión como el token JWT
    if (req.session) {
        req.session.destroy();
    }
    res.clearCookie('auth_token');
    res.clearCookie('connect.sid');
    res.redirect('/');
});

router.get('/api/ganancias-mes', dashboardController.getGananciasMes);