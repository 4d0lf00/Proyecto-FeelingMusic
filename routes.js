const express = require('express');
const jwt = require('jsonwebtoken');
const queries = require('./queries');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const dashboardController = require('./controllers/dashboardController');
const db = require('./db');
const dashboardControllerProfesor = require('./controllers/dashboardControllerProfesor');

// ------------------- Rutas de Autenticación -------------------

// Ruta para el login
router.get('/login2', (req, res) => {
    res.render('login2', {
        title: 'Inicio Sesion',
        error: req.query.error || null
    });
});

router.post('/login2', [
    body('email').isEmail().withMessage('El email no es válido'),
    body('contrasena').isLength({ min: 4 }).withMessage('La contraseña debe tener al menos 4 caracteres'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, contrasena } = req.body;
    
    try {
        const results = await queries.obtenerUsuarioLogin(email);

        if (results.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = results[0];

        // Si es alumno (tipo 3), comparar contraseña directamente
        if (user.tipo === 3) {
            if (contrasena === user.contrasena) {
                try {
                    const { token, redirectUrl } = await generarTokenAsync(user, user.tipo);
                    res.cookie('auth_token', `Bearer ${token}`, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production'
                    });
                    res.json({ success: true, tipo: user.tipo, redirectUrl: redirectUrl });
                } catch (tokenError) {
                    console.error("Error al generar token (alumno):", tokenError);
                    res.status(500).json({ error: 'Error interno al procesar el login' });
                }
            } else {
                return res.status(401).json({ error: 'Credenciales incorrectas' });
            }
        } else {
            // Para profesores y admins, usar bcrypt
            const match = await bcrypt.compare(contrasena, user.contrasena);
            if (!match) {
                return res.status(401).json({ error: 'Credenciales incorrectas' });
            }

            try {
                const { token, redirectUrl } = await generarTokenAsync(user, user.tipo);
                res.cookie('auth_token', `Bearer ${token}`, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production'
                });
                res.json({ success: true, tipo: user.tipo, redirectUrl: redirectUrl });
            } catch (tokenError) {
                console.error("Error al generar token (otro):", tokenError);
                res.status(500).json({ error: 'Error interno al procesar el login' });
            }
        }

    } catch (error) {
        console.error("Error en POST /login2:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.post('/register2', [
    body('email').isEmail().withMessage('Email inválido'),
    body('contrasena').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    body('apellido').notEmpty().withMessage('El apellido es requerido'),
    body('especialidad').custom(value => {
        const especialidadesPermitidas = ['guitarra', 'piano', 'bateria', 'canto', 'bajo', 'cello', 'acordeon', 'ukelele'];
        const especialidades = Array.isArray(value) ? value : (value ? value.split(',') : []);
        // Validar que al menos una especialidad fue seleccionada y que todas son válidas
        if (especialidades.length === 0) return false;
        return especialidades.map(esp => esp.trim().toLowerCase()).every(esp => especialidadesPermitidas.includes(esp));
    }).withMessage('Selecciona al menos una especialidad válida')
], async (req, res) => { // Hacer async
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { nombre, apellido, email, contrasena, especialidad } = req.body;
        const hashedPassword = await bcrypt.hash(contrasena, 10);
        
        // Llamar a la función refactorizada con await
        const resultado = await queries.insertarUsuario(email, hashedPassword, nombre, apellido, especialidad);
        
        // Enviar el resultado exitoso
        res.json(resultado);

    } catch (error) {
        console.error('Error en POST /register2:', error);
        // Enviar error específico o genérico
        res.status(500).json({ error: error.message || 'Error en el proceso de registro' });
    }
});

router.get('/actualizar-contrasena', verificarToken, async (req, res) => {
    if (req.userTipo !== 2 && req.userTipo !== 1 && req.userTipo !== 3 ) {
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }

    try {
        const usuario = await queries.obtenerUsuarioProfesorPorId(req.userId);

        if (!usuario || !usuario.email_personal) {
            return res.status(404).json({ error: 'Profesor no encontrado o sin email válido para esta operación.' });
        }
        res.render('actualizar-contrasena', { 
            title: 'Actualizar Contraseña',
            usuario: usuario, 
            userTipo: req.userTipo 
        });

    } catch (err) {
        console.error('Error al obtener los datos del profesor en GET /actualizar-contrasena:', err);
        // Aquí podrías renderizar una página de error o redirigir.
        // Por ahora, devuelvo un JSON como en la lógica original de error.
        res.status(500).json({ error: 'Error interno al obtener los datos del profesor.' });
    }
});

router.post('/actualizar-contrasena', verificarToken, async (req, res) => {
    const { email_personal, contrasenaAnterior, nuevaContrasena, confirmarContrasena } = req.body;

    if (req.userTipo !== 2 && req.userTipo !== 1 && req.userTipo !== 3 ) {
        return res.status(403).json({ error: 'No tienes permiso para acceder a esta acción' });
    }

    try {
        // Asumimos que queries.obtenerUsuarioProfesorPorId ahora devuelve una Promesa
        const usuario = await queries.obtenerUsuarioProfesorPorId(req.userId);

        if (!usuario) { // Si no se encuentra el usuario, no se puede proceder
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        // Para profesores y admins (tipos 1 y 2), se usa bcrypt para la contraseña anterior.
        // Para alumnos (tipo 3), la contraseña se compara directamente (asumiendo que no está hasheada o se maneja diferente).
        let match = false;
        if (usuario.tipo === 3) { // Alumno
            if (contrasenaAnterior === usuario.contrasena) {
                match = true;
            }
        } else { // Profesor o Admin
            match = await bcrypt.compare(contrasenaAnterior, usuario.contrasena);
        }

        if (!match) {
            return res.status(400).json({ error: 'La contraseña anterior no es correcta' });
        }

        if (nuevaContrasena !== confirmarContrasena) {
            return res.status(400).json({ error: 'Las nuevas contraseñas no coinciden' });
        }

        const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);

        // Asumimos que queries.actualizarUsuarioProfesor ahora devuelve una Promesa
        // y maneja la actualización para todos los tipos de usuario o tienes funciones separadas.
        // Si la función es específica para profesor, necesitarás otra para alumno si el email_personal no aplica.
        await queries.actualizarUsuarioProfesor(req.userId, email_personal, hashedPassword);

        let redirectUrl;
        if (req.userTipo === 1) {
            redirectUrl = '/horarios-generales';
        } else if (req.userTipo === 2) {
            redirectUrl = '/horarios-generales';
        } else { // Asumiendo tipo 3 (alumno)
            redirectUrl = '/dashboard-alumno'; // o la ruta que corresponda al dashboard del alumno
        }

        res.status(200).json({ message: 'Contraseña y correo actualizados exitosamente', redirectUrl });

    } catch (error) {
        console.error('Error en POST /actualizar-contrasena:', error);
        // Distinguir errores específicos si es posible, ej. error de BD vs error de validación no capturado antes.
        if (error.message === 'Usuario no encontrado.') { // Ejemplo de manejo específico
             return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error interno del servidor al actualizar la contraseña.' });
    }
});

// ------------------- Rutas de Dashboard -------------------

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
    

// Ruta protegida para administradores
router.get('/dashboard', verificarToken, (req, res) => {
    if (req.userTipo !== 1) {
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    dashboardController.getDashboardData(req, res);
});

// Ruta protegida para profesores
router.get('/dashboard-profesor', verificarToken, async (req, res) => {
    if (req.userTipo !== 2) {
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    try {
        if (!req.profesorId) {
            console.error('Error: profesorId no encontrado en el token para el dashboard del profesor.');
            return res.status(403).send('Error de autenticación: ID de profesor no encontrado.');
        }

        const profesorDetalles = await queries.obtenerDetallesProfesor(req.profesorId);
        const totalMisAlumnos = await queries.contarMisAlumnos(req.profesorId);
        const distribucionInstrumentos = await queries.obtenerDistribucionInstrumentosProfesor(req.profesorId);

        if (!profesorDetalles) {
            console.error(`No se encontraron detalles para el profesor con ID: ${req.profesorId}`);
            return res.status(404).send('Profesor no encontrado.');
        }

        const dashboardClientData = {
            totalAlumnos: totalMisAlumnos,
            instrumentos: {
                labels: distribucionInstrumentos.labels,
                values: distribucionInstrumentos.values
            }
            // Puedes añadir más datos aquí si son necesarios para la vista y el cliente
        };

        res.render('dashboard-profesor', {
            title: 'Dashboard Profesor',
            userTipo: req.userTipo,
            viewData: { // Objeto único para pasar a la vista
                profesor: profesorDetalles, // Contiene nombre, apellido, email, color actual, etc.
                dashboardData: dashboardClientData // Datos específicos para el cliente/gráficos
            }
        });

    } catch (error) {
        console.error('Error al cargar el dashboard del profesor:', error);
        res.status(500).send('Error interno al cargar el dashboard.');
    }
});

// ------------------- Rutas de Alumnos -------------------

// Ruta para el formulario de inscripción de alumnos
router.get('/form', verificarToken,(req, res) => {
    if (req.userTipo === 1 && req.userTipo === 2) {
        return res.redirect('/login?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    res.render('form', { 
        title: 'Formulario de Registro', 
        userTipo: req.userTipo });
});

// Ruta GET para mostrar el formulario
router.get('/formulario-class', verificarToken, async (req, res) => {
    try {
        const alumnoId = req.query.alumnoId;
        
        if (!alumnoId) {
            return res.status(400).send('ID de alumno no proporcionado');
        }
        
        const profesorUsuarioId = req.userId; // ID del usuario logueado (que es un profesor)
        
        console.log('GET /formulario-class - Token decodificado:', req.userId, req.userTipo, req.profesorId);
        console.log('GET /formulario-class - ID del profesor (del token):', req.profesorId); // Este es el ID de la tabla profesor
        console.log('GET /formulario-class - ID del usuario (profesor) del token:', profesorUsuarioId);

        // Verificar si el profesor existe y obtener sus datos.
        // Usamos req.profesorId que ya viene del token y es el ID correcto de la tabla 'profesor'.
        const verificarProfesorQuery = `
            SELECT p.id, p.nombre, p.apellido
            FROM profesor p
            WHERE p.id = ? 
        `;
        
        // Usar await con db.query y desestructurar el resultado
        const [resultadoProfesor] = await db.query(verificarProfesorQuery, [req.profesorId]);
            
        if (!resultadoProfesor || resultadoProfesor.length === 0) {
            console.error('No se encontró el profesor con ID (de tabla profesor):', req.profesorId);
            return res.status(404).send('Profesor no encontrado');
        }
            
        const profesorVerificado = resultadoProfesor[0];
        console.log('Profesor verificado:', profesorVerificado);
            
        // Consulta para obtener instrumentos del profesor verificado
        const instrumentosQuery = `
            SELECT DISTINCT i.id, i.nombre
            FROM instrumentos i
            WHERE i.estado = 'activo'
            AND i.profesor_id = ? 
        `;
            
        const [instrumentos] = await db.query(instrumentosQuery, [profesorVerificado.id]);
        console.log('Instrumentos encontrados:', instrumentos);
                
        // Consulta de horarios disponibles para este profesor verificado
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
                
        const [horarios] = await db.query(horariosQuery, [profesorVerificado.id]);
        console.log('Horarios encontrados:', horarios);
                    
        // Renderizar vista con los datos si todo fue bien
        res.render('formulario-class', {
            alumnoId: alumnoId,
            instrumentosDisponibles: instrumentos || [],
            horariosProfesor: horarios || []
        });

    } catch (error) {
        console.error('Error en GET /formulario-class:', error);
        // Determinar el código de estado basado en el tipo de error si es posible
        // (Aunque con el manejo actual, muchos errores específicos ya retornan antes de llegar aquí)
        const statusCode = (error.message === 'Profesor no encontrado' || error.message === 'ID de alumno no proporcionado') ? 404 : 500;
        res.status(statusCode).send(error.message || 'Error al procesar la solicitud');
    }
});

// Ruta para el formulario de clase musical - ACTUALIZADA
router.post('/formulario-class', 
    verificarToken, 
    [
        body('alumnoId').isInt().withMessage('ID de alumno inválido.'),
        body('instrumentoId').isInt({ gt: 0 }).withMessage('Debe seleccionar un instrumento.'),
        body('modalidad').isIn(['individual', 'grupal']).withMessage('Modalidad inválida.'),
        body('monto').isInt({ gt: 0 }).withMessage('El monto debe ser mayor a 0.').toInt(),
        body('dia_pago').isInt({ min: 1, max: 31 }).withMessage('El día de pago debe ser entre 1 y 31.').toInt(),
        body('comentarios').optional().isString().trim()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array(), error: errors.array()[0].msg });
        }

        try {
            const { alumnoId, instrumentoId, modalidad, monto, dia_pago, comentarios } = req.body;
            
            // El profesorId se obtiene del token, pero no se usa directamente para actualizar la tabla alumno aquí,
            // a menos que quieras verificar que el profesor logueado tiene permiso sobre ese alumno.
            // const profesorId = req.profesorId; 

            await queries.actualizarAlumnoConDatosClase(alumnoId, {
                instrumentoId,
                modalidad,
                monto,
                diaPago: dia_pago, // Asegúrate que el nombre coincida con la función query
                comentarios
            });
            
            res.json({ success: true, message: 'Datos de la clase registrados exitosamente para el alumno.' });

        } catch (error) {
            console.error('Error en POST /formulario-class:', error);
            res.status(500).json({ success: false, error: error.message || 'Error interno del servidor al actualizar datos de la clase.' });
        }
    }
);
    
    

// Ruta para el filtro2 ver la lista de alumnos
router.get('/filtro2', verificarToken, (req, res) => {
    // Permitir acceso a Administradores (1) y Profesores (2)
    if (req.userTipo !== 1 && req.userTipo !== 2) { 
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página.'));
    }
    res.render('filtro2', { 
        title: 'Filtro de Alumnos', 
        userTipo: req.userTipo 
    });
});

// Ruta para ver el horario del alumno
router.get('/horario', verificarToken, async (req, res) => {
    if (req.userTipo !== 3) {
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }

    const alumnoQuery = `SELECT a.nombre, a.apellido, a.email, a.numero_telefono FROM alumno a WHERE a.id = ?`;
    const clasesQuery = `
        SELECT c.nombre as nombre_clase, a.instrumento_alumno as instrumento, p.nombre as profesor_nombre, p.apellido as profesor_apellido,
        s.nombre as sala_nombre, h.dia, h.mes, h.annio, h.hora_inicio, h.hora_fin, m.tipo as modalidad
        FROM clases c
        JOIN instrumentos i ON c.instrumento_id = i.id
        JOIN profesor p ON c.profesor_id = p.id
        JOIN horarios h ON c.horario_id = h.id
        JOIN modalidades m ON c.modalidad_id = m.id
        LEFT JOIN sala_horario sh ON h.id = sh.horario_id
        LEFT JOIN salas s ON sh.sala_id = s.id
        JOIN alumno a ON c.alumno_id = a.id
        WHERE c.alumno_id = ? AND c.estado = 'activo'
        ORDER BY h.annio, h.mes, h.dia, h.hora_inicio`;

    try {
        const [resultadosAlumno] = await db.query(alumnoQuery, [req.alumnoId]);

        if (resultadosAlumno.length === 0) {
            return res.status(404).send('Alumno no encontrado');
        }

        const [resultadosClases] = await db.query(clasesQuery, [req.alumnoId]);

        res.render('horario', {
            title: 'Mi Horario',
            alumno: resultadosAlumno[0],
            clases: resultadosClases,
            alumnoId: req.alumnoId,
            userTipo: req.userTipo
        });

    } catch (error) {
        console.error('Error al cargar el horario del alumno:', error);
        res.status(500).send('Error al cargar el horario');
    }
});

// Ruta para buscar alumnos (MODIFICADA A GET y para coincidir con el frontend)
router.get('/api/buscar-alumno', async (req, res) => { // Cambiado a GET y la ruta a /api/buscar-alumno
    const { nombre } = req.query; // nombre puede ser undefined o una cadena vacía si no se envía
    
    // Ya no se valida si 'nombre' es requerido aquí, 
    // la función 'queries.buscarAlumnos' manejará el caso de búsqueda vacía.

    try {
        const results = await queries.buscarAlumnos(nombre); 
        res.json(results);
    } catch (error) {
        console.error("Error en GET /api/buscar-alumno:", error);
        res.status(500).json({ error: 'Error en la consulta de búsqueda de alumnos' });
    }
});


/*
// API para buscar alumnos
router.get('/api/buscar-alumno', verificarToken, async (req, res) => {
    const { nombre } = req.query;
    
    if (!nombre || nombre.length < 2) {
        return res.status(400).json([]);
    }
    
    try {
        const alumnos = await queries.buscarAlumnos(nombre);
        // Si el profesor está autenticado, filtrar alumnos por su profesor_id
        if (req.profesorId && req.userTipo === 2) {
            const alumnosFiltrados = alumnos.filter(alumno => alumno.profesor_id === req.profesorId);
            return res.json(alumnosFiltrados);
        }
        // Si es administrador o no se pudo filtrar, devolver todos
        res.json(alumnos);
    } catch (error) {
        console.error('Error en GET /api/buscar-alumno:', error);
        res.status(500).json({ error: 'Error al buscar alumnos' });
    }
});*/


// Ruta para insertar un nuevo alumno
router.post('/alumnos', verificarToken, async (req, res) => {
    const { nombre, apellido, email, numero_telefono } = req.body; // Se elimina rut
  
    try {
        // Obtener el ID del profesor correspondiente al ID de la tabla usuarios
        const profesorIdResult = await queries.obtenerProfesorId(req.userId); 
        if (!profesorIdResult || profesorIdResult.length === 0 || !profesorIdResult[0].profesor_id) {
            // Lanzar error si no se encuentra el ID de profesor asociado
            throw new Error('No se pudo encontrar el ID de profesor asociado al usuario.');
        }
        const profesorId = profesorIdResult[0].profesor_id;
        console.log('ID de Profesor asociado:', profesorId); // LOG

        // Insertar el alumno en la base de datos
        // Se pasa numero_telefono (puede ser undefined/null si no se envía desde el front) y se omite rut
        const resultAlumno = await queries.insertarAlumno(nombre, apellido, email, numero_telefono, profesorId);
        console.log('Alumno insertado, resultado:', resultAlumno); // LOG

        // Asegurarse de que resultAlumno.insertId existe
        if (!resultAlumno || !resultAlumno.insertId) {
            throw new Error('No se pudo obtener el ID del nuevo alumno tras la inserción.');
        }
        const nuevoAlumnoId = resultAlumno.insertId;

        // Crear el usuario para el alumno (sin rut)
        await queries.crearUsuarioAlumno(nuevoAlumnoId, email, nombre, profesorId);
        console.log('Usuario para alumno creado.'); // LOG

        // Devolver el ID del alumno en la respuesta
        res.json({
            success: true,
            message: 'Alumno registrado exitosamente',
            alumnoId: nuevoAlumnoId // Usar el ID obtenido
        });

    } catch (error) { // Capturar errores de todo el proceso
        console.error('Error en POST /alumnos:', error.message || error); // LOG del error
        // Devolver un error específico si es uno de los esperados
        const erroresEsperados = [
            'El correo ya está registrado',
            'El profesor especificado no existe',
            'Nombre, apellido y correo electrónico son requeridos.', // Actualizado para coincidir con queries.js
            'El profesor asociado es requerido y no fue provisto.', // Añadido para ser exhaustivo
            'No se pudo encontrar el ID de profesor asociado al usuario.',
            'No se pudo obtener el ID del nuevo alumno tras la inserción.',
            'Ya existe un usuario con este email'
        ];
        if (erroresEsperados.includes(error.message)) {
            return res.status(400).json({ success: false, error: error.message });
        }
        // Devolver error genérico para otros casos
        res.status(500).json({ success: false, error: 'Error interno al registrar el alumno.' });
    }
});



// Ruta para obtener las clases del alumno
router.get('/clases-alumno', verificarToken, async (req, res) => {
    try {
        const alumnoId = req.alumnoId;
        const query = `
            SELECT c.nombre as nombre_clase, i.nombre as instrumento, p.nombre as profesor_nombre, p.apellido as profesor_apellido,
            s.nombre as sala_nombre, h.dia, h.mes, h.annio, h.hora_inicio, h.hora_fin
            FROM clases c
            JOIN instrumentos i ON c.instrumento_id = i.id
            JOIN profesor p ON c.profesor_id = p.id
            JOIN horarios h ON c.horario_id = h.id
            LEFT JOIN sala_horario sh ON h.id = sh.horario_id
            LEFT JOIN salas s ON sh.sala_id = s.id
            WHERE c.estado = 'activo' AND EXISTS (
                SELECT 1 FROM modalidades m WHERE m.id = c.modalidad_id AND m.alumno_id = ?
            )
            ORDER BY h.annio, h.mes, h.dia, h.hora_inicio`;

        const [results] = await db.query(query, [alumnoId]);
        
        res.json(results);

    } catch (error) {
        console.error('Error al obtener las clases', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener clases.' });
    }
});

// ------------------- Rutas de Profesores -------------------

// Ruta para ver la lista de profesores
router.get('/ver-profes', verificarToken, (req, res) => {
    if (req.userTipo !== 1) {
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    res.render('ver-profes', { 
        title: 'Ver Profesores', 
        userTipo: req.userTipo 
    });
});

// Ruta protegida para administradores
router.get('/register2', verificarToken, (req, res) => {
    if (req.userTipo !== 1) {
    return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    res.render('register2', { 
        title: 'Registrar Profesor',
        userTipo: req.userTipo
        });
});

//ruta para buscar profesores (MODIFICADA A GET y para coincidir con el frontend)
router.get('/api/buscar-profesores', async (req, res) => {//cambiado a GET y la ruta a /api/buscar-profesores
    const { nombre } = req.query; //nombre puede ser undefined o una cadena vacía si no se envía

    //ya no se valida si 'nombre' es requerido aquí, la funcion 'queries.buscarProfesores' manejará el caso de búsqueda vacía.

    try {
        const results = await queries.buscarProfesores(nombre);
        res.json(results);
    } catch (error) {
        console.error("Error en GET /api/buscar-profesores:", error);
        res.status(500).json({ error: 'Error en la consulta de búsqueda de profesores' });
    }
});

//API para actualizar un profesor 
router.put('/api/profesores/:profesorId', verificarToken, [
    //validaciones 
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    body('apellido').notEmpty().withMessage('El apellido es requerido'),
    body('email').notEmpty().withMessage('El email es requerido'),
    body('especialidad').notEmpty().withMessage('La especialidad es requerida'),
    
], async (req, res) => {
    if (req.userTipo !== 1) {
        return res.status(400).json({ success: false, errors: errors.array(), message: errors.array()[0].msg });
    }
    try {
        const profesorId = req.params.profesorId;
        const datosProfesor = req.body; //contiene los campos que se enviaron al actualizar
        console.log(`[PUT /api/profesores/${profesorId}] req.body recibido:`, JSON.stringify(datosProfesor)); //log 1

        //filtrar solo los campos que realmente de pueden editar desde esta interfaz
        const camposPermitidos = ['nombre', 'apellido', 'email', 'especialidad'];
        const datosParaActualizar = {};
        for (const campo of camposPermitidos) {
            if (datosProfesor.hasOwnProperty(campo)) {
                datosParaActualizar[campo] = datosProfesor[campo];
            }
        }
        console.log(`[PUT /api/profesores/${profesorId}] datosParaActualizar:`, JSON.stringify(datosParaActualizar)); //log 2

        if (Object.keys(datosParaActualizar).length === 0) {
            return res.status(400).json({ success: false, message: 'No hay datos para actualizar.' });
        }

        await queries.actualizarProfesor(profesorId, datosParaActualizar);
        res.json({ success: true, message: 'Profesor actualizado correctamente.' });

    } catch (error) {
        console.error("Error en PUT /api/profesores/:profesorId:", error);
        res.status(500).json({ success: false, message: 'Error interno al actualizar el profesor.' });
    }
});
    

// API para "eliminar" (desactivar) un profesor
router.delete('/api/profesores/:id', verificarToken, async (req, res) => {
    if (req.userTipo !== 1) { // Solo Admin
        return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar profesores.' });
    }
    try {
        const profesorId = req.params.id;
        await queries.eliminarProfesorPermanentemente(profesorId);
        res.json({ success: true, message: 'Profesor eliminado permanentemente.' });
    } catch (error) {
        console.error(`Error en DELETE /api/profesores/${req.params.id}:`, error);
        res.status(500).json({ success: false, message: error.message || 'Error interno al eliminar el profesor.' });
    }
});




// Ruta para obtener todos los profesores
router.get('/profesores', (req, res) => {
    queries.obtenerProfesores((err, results) => {
    if (err) {
    return res.status(500).send('Error en la consulta a la base de datos');
    }
    console.log('Profesores obtenidos:', results);
    res.json(results); // Enviar los resultados como respuesta en formato JSON
    });
    });
    
// Ruta para buscar profesores
router.post('/buscar_profesores', async (req, res) => {
    const { busqueda } = req.body;
    try {
        const results = await queries.buscarProfesores(busqueda);
        res.json(results);
    } catch (error) {
        console.error("Error en POST /buscar_profesores:", error);
        res.status(500).json({ error: 'Error en la consulta de búsqueda de profesores' });
    }
});


// ----------- Rutas de Horarios Modificadas/Nuevas -----------

// Ruta para horarios generales (MODIFICADA)
router.get('/horarios-generales', verificarToken, async (req, res) => {
    const diaSeleccionado = req.query.dia || 'Lunes'; // 'Lunes', 'Martes', etc.

    if (req.userTipo !== 2 && req.userTipo !== 1) { // Solo Admin o Profesor
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder.'));
    }

    const profesorIdActual = req.profesorId; // ID del profesor logueado (si es profesor)
    const userTipoActual = req.userTipo;
    const horasParaVista = [ // Las horas que muestra tu EJS
        '08:00:00', '09:00:00', '10:00:00', '11:00:00', '12:00:00',
        '13:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00',
        '18:00:00', '19:00:00', '20:00:00', '21:00:00'
    ];

    try {
        const salas = await queries.obtenerTodasLasSalasDetalladas();
        // Llamamos a la nueva función 'obtenerHorarios' de queries.js
        const eventosDelDia = await queries.obtenerHorarios(diaSeleccionado);

        let instrumentosParaModal = [];
        if (userTipoActual === 2 && profesorIdActual) {
            instrumentosParaModal = await queries.obtenerInstrumentosPorProfesor(profesorIdActual);
        } else if (userTipoActual === 1) {
            instrumentosParaModal = await queries.obtenerInstrumentos(); // Todos para admin
        }
        
        // console.log(`Eventos para ${diaSeleccionado}:`, JSON.stringify(eventosDelDia, null, 2));

        res.render('horarios-generales', {
            title: 'Horarios Generales',
            diaSeleccionado: diaSeleccionado, 
            salas: salas || [],
            horas: horasParaVista,
            horarios: eventosDelDia || [], // Se pasa el resultado de la nueva query
            instrumentosProfesor: instrumentosParaModal || [],
            profesorId: profesorIdActual,
            userTipo: userTipoActual
        });

    } catch (error) {
        console.error('Error en GET /horarios-generales (nueva lógica):', error);
        res.status(500).send('Error al cargar los datos del horario.');
    }
});

// Ruta para guardar un nuevo horario/clase desde el modal (MODIFICADA)
router.post('/guardar-horario', verificarToken, async (req, res) => {
    console.log('[BACKEND DEBUG /guardar-horario] req.body recibido:', JSON.stringify(req.body, null, 2));
    const {
        dia, 
        horaInicio, 
        salaNombre,
        tipoEvento, // 'alumnos' o 'banda'
        alumnosData, // Array de [{id, modalidad}] - puede ser undefined si es banda
        bandaId,     // string - puede ser undefined si es alumnos
        esRecuperacion, 
        fechaRecuperacion
    } = req.body;
    
    const profesorId = req.profesorId;

    // --- Validaciones Comunes ---
    if (!dia || !horaInicio || !salaNombre || !profesorId) {
        return res.status(400).json({ success: false, message: 'Faltan datos básicos del slot (día, hora, sala) o profesor.' });
    }
    if (!tipoEvento || (tipoEvento !== 'alumnos' && tipoEvento !== 'banda')) {
        return res.status(400).json({ success: false, message: 'Tipo de evento inválido o no especificado.' });
    }

    let datosParaCrearClase = {
        diaOriginalSlot: dia,
        horaInicioOriginalSlot: horaInicio,
        salaNombreOriginalSlot: salaNombre,
        profesorId: profesorId,
        instrumentoId: null, // Forzamos a null según EJS
        // tipo, alumnosData/bandaId, fechaClase se definen a continuación
    };

    if (tipoEvento === 'banda') {
        if (!bandaId) {
            return res.status(400).json({ success: false, message: 'Se requiere bandaId para el tipoEvento "banda".' });
        }
        datosParaCrearClase.tipo = 'banda';
        datosParaCrearClase.bandaId = bandaId;
        datosParaCrearClase.fechaClase = new Date().toISOString().split('T')[0]; // Fecha actual para bandas
    } else { // tipoEvento === 'alumnos'
        if (!Array.isArray(alumnosData)) { // alumnosData puede ser vacío si se quiere dejar el slot disponible
            return res.status(400).json({ success: false, message: 'alumnosData debe ser un array (puede ser vacío).'});
        }

        const esModoRecuperacionDeterminado = esRecuperacion === true || String(esRecuperacion).toLowerCase() === 'true';
        console.log('[DEBUG /guardar-horario] esModoRecuperacionDeterminado (alumnos):', esModoRecuperacionDeterminado);

        if (esModoRecuperacionDeterminado) {
            if (!fechaRecuperacion) {
                return res.status(400).json({ success: false, message: 'Debe seleccionar una fecha para la recuperación.' });
            }
            if (alumnosData.length !== 1) {
                return res.status(400).json({ success: false, message: 'Las recuperaciones solo pueden tener un alumno.' });
            }
            if (alumnosData[0].modalidad !== 'individual') {
                return res.status(400).json({ success: false, message: 'El alumno para recuperación debe estar en modalidad Personalizada.' });
            }
            datosParaCrearClase.tipo = 'recuperacion';
            datosParaCrearClase.fechaClase = fechaRecuperacion;
        } else {
            // Solo validar alumnosData si NO es recuperación y hay alumnosData.
            // Si alumnosData está vacío, se interpreta como que se quiere dejar el slot disponible.
            if (alumnosData.length > 0 && alumnosData.some(a => !a.id || !a.modalidad)) {
                return res.status(400).json({ success: false, message: 'Datos de alumnos incompletos (falta ID o modalidad).' });
            }
            if (alumnosData.length === 0 && !esModoRecuperacionDeterminado) {
                 console.log('[DEBUG /guardar-horario] Programando slot como disponible (sin alumnos y no es recuperación).');
                 // Si se quiere dejar disponible, no hay alumnosData que pasar, tipo sería normal pero sin alumnos
                 // queries.crearClase debería manejar alumnosData vacío para tipo normal.
            }
            datosParaCrearClase.tipo = 'normal';
            datosParaCrearClase.fechaClase = new Date().toISOString().split('T')[0];
        }
        datosParaCrearClase.alumnosData = alumnosData; // Puede ser un array vacío
    }
    
    // Calcular horaFin (asumiendo 1 hora de duración)
    const [h, m] = horaInicio.split(':').map(Number);
    const finDate = new Date();
    finDate.setHours(h + 1, m, 0);
    // No es necesario añadir horaFin a datosParaCrearClase, ya que crearClase lo calcula.
    // datosParaCrearClase.horaFinCalculada = `${String(finDate.getHours()).padStart(2, '0')}:${String(finDate.getMinutes()).padStart(2, '0')}:00`;

    console.log('[DEBUG /guardar-horario] datosParaCrearClase FINAL antes de llamar a queries.crearClase:', JSON.stringify(datosParaCrearClase, null, 2));

    try {
        const resultadoCreacion = await queries.crearClase(datosParaCrearClase);
        res.json(resultadoCreacion); 
    } catch (error) {
        console.error('Error en POST /guardar-horario:', error);
        res.status(500).json({ success: false, message: error.message || 'Error interno al programar la clase.' });
    }
});


// API para obtener detalles de una clase/evento específico (MODIFICADA)
// El ID ahora es el ID de la tabla `clases`
router.get('/api/horario-detalles/:claseId', verificarToken, async (req, res) => {
    const { claseId } = req.params;
    
    if (!claseId || isNaN(parseInt(claseId))) {
        return res.status(400).json({ success: false, message: 'ID de clase inválido.' });
    }
    
    try {
        const detalles = await queries.obtenerDetallesClase(parseInt(claseId));
        
        if (!detalles) {
            return res.status(404).json({ success: false, message: 'Clase o evento no encontrado.' });
        }
        res.json({ success: true, detalles }); // `detalles` ya está formateado por `obtenerDetallesClase`
    } catch (error) {
        console.error(`Error en GET /api/horario-detalles/${claseId} (nueva lógica):`, error);
        res.status(500).json({ success: false, message: 'Error interno al obtener detalles.' });
    }
});

// API para actualizar una clase/evento (MODIFICADA PARA SINCRONIZAR GRUPO)
// El ID ahora es el ID de la tabla `clases` de una de las clases del slot.
router.put('/api/clase/:claseIdReferencia', verificarToken, async (req, res) => {
    const { claseIdReferencia } = req.params;
    const datosNuevosDelSlot = req.body; // Contiene alumnosData, esRecuperacion, fechaRecuperacion, etc.
    const profesorIdAutenticado = req.profesorId; 
    const userTipo = req.userTipo;

    console.log(`[ROUTE PUT /api/clase/${claseIdReferencia}] Solicitud para Sincronizar Slot. Body:`, JSON.stringify(datosNuevosDelSlot, null, 2));
    console.log(`[ROUTE PUT /api/clase/${claseIdReferencia}] Clase ID Ref: ${claseIdReferencia}, Profesor ID Token: ${profesorIdAutenticado}, User Tipo: ${userTipo}`);

    if (!claseIdReferencia || isNaN(parseInt(claseIdReferencia))) {
         return res.status(400).json({ success: false, message: 'ID de clase de referencia inválido en la URL.' });
    }

    // Validaciones del cuerpo según el tipo de evento
    if (!datosNuevosDelSlot.tipoEvento || (datosNuevosDelSlot.tipoEvento !== 'alumnos' && datosNuevosDelSlot.tipoEvento !== 'banda')) {
        return res.status(400).json({ success: false, message: 'Falta el campo tipoEvento o es inválido (debe ser \'alumnos\' o \'banda\').' });
    }

    if (datosNuevosDelSlot.tipoEvento === 'alumnos') {
        if (!datosNuevosDelSlot.alumnosData || !Array.isArray(datosNuevosDelSlot.alumnosData)) {
            return res.status(400).json({ success: false, message: 'Falta alumnosData o no es un array para tipoEvento \'alumnos\'.' });
        }
        // Permitir que alumnosData esté vacío si la intención es vaciar el slot (ej. convertirlo a disponible)
        // Esta lógica se maneja más adelante en sincronizarClasesDelSlot.

        if (typeof datosNuevosDelSlot.esRecuperacion === 'undefined') {
            return res.status(400).json({ success: false, message: 'Falta el campo esRecuperacion para tipoEvento \'alumnos\'.' });
        }
        if (datosNuevosDelSlot.esRecuperacion === true) {
            if (!datosNuevosDelSlot.fechaRecuperacion) {
                return res.status(400).json({ success: false, message: 'Fecha es requerida si esRecuperacion es true para tipoEvento \'alumnos\'.'});
            }
            if (datosNuevosDelSlot.alumnosData.length !== 1 || datosNuevosDelSlot.alumnosData[0].modalidad !== 'individual') {
                return res.status(400).json({ success: false, message: 'Recuperación de alumnos debe tener un solo alumno en modalidad individual.'});
            }
        } else {
            // Si no es recuperación y hay alumnos, todos deben tener modalidad
            if (datosNuevosDelSlot.alumnosData.length > 0 && datosNuevosDelSlot.alumnosData.some(a => !a.modalidad)) {
                 return res.status(400).json({ success: false, message: 'Todos los alumnos deben tener una modalidad seleccionada si no es recuperación.'});
            }
        }
    } else if (datosNuevosDelSlot.tipoEvento === 'banda') {
        if (!datosNuevosDelSlot.bandaId) {
            return res.status(400).json({ success: false, message: 'Falta el campo bandaId para tipoEvento \'banda\'.' });
        }
        // Para bandas, nos aseguramos que no se envíen por error datos de recuperación
        // y que alumnosData no sea relevante o esté vacío si se envía.
        // La función sincronizarClasesDelSlot ya ignora alumnosData si tipoEvento es 'banda'
    }

    try {
        const resultadoSincro = await queries.sincronizarClasesDelSlot(
            parseInt(claseIdReferencia),
            datosNuevosDelSlot, 
            profesorIdAutenticado 
        );
        
        console.log(`[ROUTE PUT /api/clase/${claseIdReferencia}] Respuesta de queries.sincronizarClasesDelSlot:`, JSON.stringify(resultadoSincro, null, 2));
        res.json(resultadoSincro); // La función queries.sincronizarClasesDelSlot debería devolver { success, message, slotActualizado }

    } catch (error) {
        console.error(`[ROUTE ERROR PUT /api/clase/${claseIdReferencia}]:`, error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error interno del servidor al sincronizar el slot.'
        });
    }
});

// API para eliminar (cancelar) una clase/evento (MODIFICADA)
// El ID ahora es el ID de la tabla `clases`
router.delete('/api/clase/:claseId', verificarToken, async (req, res) => {
    const { claseId } = req.params;

    if (!claseId || isNaN(parseInt(claseId))) {
        return res.status(400).json({ success: false, message: 'ID de clase inválido.' });
    }

    try {
        // Aquí podrías añadir una verificación para asegurar que el req.profesorId
        // tiene permiso para eliminar esta claseId, o si es un admin.
        const resultadoEliminacion = await queries.eliminarClasesDelSlot(parseInt(claseId));
        res.json(resultadoEliminacion); // success y message

    } catch (error) {
        console.error(`Error en DELETE /api/clase/${claseId} (nueva lógica):`, error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error interno al eliminar/cancelar la clase.'
        });
    }
});


// ------------------- Registro de pagos -------------------
router.get('/registro-de-pagos', verificarToken, (req, res) => {
    if (req.userTipo !== 2 && req.userTipo !== 1) {
    return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder a esta página'));
    }
    res.render('registro-de-pagos', { 
        title: 'Registro De Pagos', 
        userTipo: req.userTipo 
    });
    });







// ------------------- Middleware para Verificar Token -------------------
function verificarToken(req, res, next) {
    console.log("A. Entrando a verificarToken"); 
    const token = req.cookies.auth_token;
    if (!token) {
        console.log("B. No hay token, redirigiendo a login"); 
        return res.redirect('/login2?error=' + encodeURIComponent('Debes iniciar sesión para acceder a esta página'));
    }
    const tokenPart = token.split(' ')[1];
    jwt.verify(tokenPart, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log("C. Error verificando token:", err.message); 
            return res.redirect('/login2?error=' + encodeURIComponent('Tu sesión ha expirado. Por favor, inicia sesión nuevamente'));
        }
        req.userId = decoded.id; // ID de la tabla usuarios
        req.userTipo = decoded.tipo; // 1 Admin, 2 Profesor, 3 Alumno
        req.profesorId = decoded.profesorId; // ID de la tabla profesor (si el usuario es profesor)
        req.alumnoId = decoded.alumnoId; // ID de la tabla alumno (si el usuario es alumno)
        console.log("D. Token verificado:", { userId: req.userId, userTipo: req.userTipo, profesorId: req.profesorId, alumnoId: req.alumnoId });
        next();
    });
}

// ------------------- Ruta de Logout -------------------
router.get('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy();
    }
    res.clearCookie('auth_token');
    res.clearCookie('connect.sid');
    res.redirect('/login2');
});

// ------------------- Función auxiliar para generar token -------------------
async function generarTokenAsync(usuario, tipo) {
    if (tipo === 3) {
        const token = jwt.sign({
            id: usuario.id,
            tipo: usuario.tipo,
            alumnoId: usuario.alumno_id
        }, process.env.JWT_SECRET, { expiresIn: '4h' });
        return { token, redirectUrl: '/horario' };
    } else {
        try {
            const profesorResult = await queries.obtenerProfesorId(usuario.id);
            
            const profesorId = profesorResult[0]?.profesor_id;
            if (profesorId === undefined) {
                 throw new Error(`No se pudo obtener profesorId para usuario ID: ${usuario.id}`);
            }

            const token = jwt.sign({
                id: usuario.id,
                tipo: usuario.tipo,
                profesorId: profesorId
            }, process.env.JWT_SECRET, { expiresIn: '4h' });
            
            // const redirectUrl = usuario.tipo === 2 ? '/dashboard-profesor' : '/dashboard';
            // Cambiar la URL de redirección para admin (1) y profesor (2)
            let redirectUrl;
            if (usuario.tipo === 1) { // Admin
                redirectUrl = '/horarios-generales';
            } else if (usuario.tipo === 2) { // Profesor
                redirectUrl = '/horarios-generales';
            } else if (usuario.tipo === 3) { // Alumno
                redirectUrl = '/horario';
            } else {
                // Otros tipos de usuario (si los hubiera) mantendrían su lógica original o una por defecto
                redirectUrl = '/'; // O alguna otra ruta por defecto
            }
            return { token, redirectUrl };

        } catch (err) {
            console.error('Error al obtener profesorId en generarTokenAsync:', err);
            throw new Error('Error interno al generar el token');
        }
    }
}


// Ruta para la página de inicio
router.get('/', (req, res) => {
    res.render('index-x02', { title: 'Inicio' });
});



// ------------------- Rutas para Bandas -------------------

// Vista para añadir nueva banda (estilo form.ejs)
router.get('/bandas/nueva', verificarToken, (req, res) => {
    // Solo admin o profesor pueden añadir bandas
    if (req.userTipo !== 1 && req.userTipo !== 2) {
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder.'));
    }
    // Pasamos el userTipo para que el header/sidebar se renderice correctamente
    res.render('bandas-form', { title: 'Añadir Nueva Banda', userTipo: req.userTipo, banda: null, error: null, success: null });
});

// Vista para listar/editar bandas (estilo filtro2.ejs)
router.get('/bandas', verificarToken, async (req, res) => {
    if (req.userTipo !== 1 && req.userTipo !== 2) {
        return res.redirect('/login2?error=' + encodeURIComponent('No tienes permiso para acceder.'));
    }
    try {
        const bandas = await queries.obtenerTodasLasBandas();
        res.render('bandas-listado', { 
            title: 'Listado de Bandas', 
            bandas: bandas, 
            userTipo: req.userTipo,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error("Error en GET /bandas:", error);
        res.render('bandas-listado', { title: 'Listado de Bandas', bandas: [], userTipo: req.userTipo, error: 'Error al cargar las bandas.', success: null });
    }
});

// API: Crear nueva banda
router.post('/api/bandas', verificarToken, [body('nombre').notEmpty().withMessage('El nombre de la banda es requerido').trim()], async (req, res) => {
    if (req.userTipo !== 1 && req.userTipo !== 2) {
        return res.status(403).json({ success: false, message: 'No tienes permiso.' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    try {
        const { nombre } = req.body;
        const resultado = await queries.crearBanda(nombre);
        // Redirigir a la vista de listado con mensaje de éxito
        res.redirect('/bandas?success=' + encodeURIComponent(`Banda "${resultado.nombre}" creada con éxito.`));
    } catch (error) {
        console.error("Error en POST /api/bandas:", error);
        // Redirigir a la vista de formulario con mensaje de error
        res.render('bandas-form', { title: 'Añadir Nueva Banda', userTipo: req.userTipo, banda: req.body, error: error.message, success: null });
    }
});

// API: Actualizar banda
router.put('/api/bandas/:id', verificarToken, [body('nombre').notEmpty().withMessage('El nombre es requerido').trim()], async (req, res) => {
    if (req.userTipo !== 1 && req.userTipo !== 2) {
        return res.status(403).json({ success: false, message: 'No tienes permiso.' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        await queries.actualizarBanda(parseInt(id), nombre);
        res.json({ success: true, message: 'Banda actualizada correctamente.' });
    } catch (error) {
        console.error("Error en PUT /api/bandas/:id:", error);
        res.status(500).json({ success: false, message: error.message || 'Error al actualizar la banda.' });
    }
});

// API: Eliminar banda
router.delete('/api/bandas/:id', verificarToken, async (req, res) => {
    if (req.userTipo !== 1 && req.userTipo !== 2) {
        return res.status(403).json({ success: false, message: 'No tienes permiso.' });
    }
    try {
        const { id } = req.params;
        await queries.eliminarBanda(parseInt(id));
        res.json({ success: true, message: 'Banda eliminada correctamente.' });
    } catch (error) {
        console.error("Error en DELETE /api/bandas/:id:", error);
        res.status(500).json({ success: false, message: error.message || 'Error al eliminar la banda.' });
    }
});

// API: Buscar bandas por nombre (para el modal de horarios)
router.get('/api/bandas/buscar', verificarToken, async (req, res) => {
    const { nombre } = req.query;
    if (!nombre || nombre.trim().length < 1) { // Permitir búsqueda con 1 caracter para más flexibilidad
        return res.json([]); // Devolver vacío si no hay término o es muy corto
    }
    try {
        const bandas = await queries.buscarBandasPorNombre(nombre.trim());
        res.json(bandas);
    } catch (error) {
        console.error("Error en GET /api/bandas/buscar:", error);
        res.status(500).json({ error: 'Error al buscar bandas.' });
    }
});


// Exportar el router
module.exports = router;

// ----------- RUTAS CRUD PARA SALAS ----------- //

// GET para mostrar el formulario de nueva sala
router.get('/salas/nueva', verificarToken, (req, res) => {
    // Solo permitir acceso a administradores (userTipo 1)
    if (req.userTipo !== 1) {
        return res.status(403).send('Acceso denegado.');
    }
    res.render('nueva-sala', { 
        title: 'Añadir Nueva Sala', 
        userTipo: req.userTipo,
        user: req.user, // Pasar el objeto user si es necesario en el header/sidebar
        error: null, 
        success: null 
    });
});

// POST para crear una nueva sala
router.post('/salas', verificarToken, async (req, res) => {
    if (req.userTipo !== 1) {
        return res.status(403).render('error-permisos', { title: 'Error', userTipo: req.userTipo });
    }
    let { nombre_base, nombre_personalizado } = req.body;

    // Formatear nombre_base aquí también
    if (nombre_base) {
        nombre_base = nombre_base.trim();
        let partes = nombre_base.match(/^(sala|Sala|SALA)\s*(\d+)$/i);
        if (partes && partes.length === 3) {
            nombre_base = 'Sala ' + partes[2];
        } else {
            // Fallback si no es "Sala N", aunque el pattern del frontend debería evitarlo
            // Podrías decidir lanzar un error aquí si el formato es estrictamente necesario.
             if (nombre_base.length > 0) {
                 nombre_base = nombre_base.charAt(0).toUpperCase() + nombre_base.slice(1).toLowerCase();
             }
        }
    }

    try {
        await queries.crearSala(nombre_base, nombre_personalizado);
        res.redirect('/salas?message=Sala creada exitosamente');
    } catch (error) {
        console.error("Error al crear sala:", error);
        // Renderizar de nuevo el formulario con un mensaje de error
        res.render('nueva-sala', {
            title: 'Añadir Nueva Sala',
            userTipo: req.userTipo,
            user: req.user,
            error: error.message || 'Error al crear la sala.',
            success: null
        });
    }
});

// GET para ver todas las salas
router.get('/salas', verificarToken, async (req, res) => {
    if (req.userTipo !== 1) {
        return res.status(403).send('Acceso denegado.');
    }
    try {
        const salas = await queries.obtenerTodasLasSalasDetalladas();
        res.render('ver-salas', { 
            title: 'Ver Salas', 
            salas: salas, 
            userTipo: req.userTipo, 
            user: req.user,
            message: req.query.message, // Para mensajes post-actualización/eliminación
            error: req.query.error
        });
    } catch (error) {
        // Idealmente, tener una página de error genérica
        res.status(500).send('Error al obtener las salas: ' + error.message);
    }
});

// GET para mostrar el formulario de edición de sala
router.get('/salas/editar/:id', verificarToken, async (req, res) => {
    if (req.userTipo !== 1) {
        return res.status(403).send('Acceso denegado.');
    }
    try {
        const sala = await queries.obtenerSalaPorId(req.params.id);
        if (!sala) {
            return res.status(404).send('Sala no encontrada.');
        }
        res.render('editar-sala', { 
            title: 'Editar Sala', 
            sala: sala, 
            userTipo: req.userTipo,
            user: req.user,
            error: null, 
            success: null 
        });
    } catch (error) {
        res.status(500).send('Error al obtener la sala para editar: ' + error.message);
    }
});

// POST para actualizar una sala
router.post('/salas/editar/:id', verificarToken, async (req, res) => {
    if (req.userTipo !== 1) {
        return res.status(403).send('Acceso denegado.');
    }
    const { id } = req.params;
    const { nombre_personalizado } = req.body;

    try {
        await queries.actualizarSala(id, nombre_personalizado);
        res.redirect('/salas?message=Sala actualizada exitosamente');
    } catch (error) {
        console.error(`Error al actualizar sala ${id}:`, error);
        // Re-renderizar el formulario de edición con error
        const sala = await queries.obtenerSalaPorId(id); // Volver a obtener los datos para el form
        res.render('editar-sala', {
            title: 'Error al Actualizar Sala',
            userTipo: req.userTipo,
            user: req.user,
            sala: sala, // Pasar la sala original para repoblar el form
            error: error.message || 'Error al actualizar la sala.',
            success: null
        });
    }
});

// POST para eliminar una sala (se mantiene la ruta DELETE, pero el form usa POST por simplicidad)
// La lógica de doble confirmación se manejará en el frontend (EJS)
router.post('/salas/eliminar/:id', verificarToken, async (req, res) => {
    if (req.userTipo !== 1) {
        return res.status(403).send('Acceso denegado.');
    }
    const { id } = req.params;
    try {
        await queries.eliminarSalaConDependencias(id);
        res.redirect('/salas?message=' + encodeURIComponent('Sala eliminada correctamente.'));
    } catch (error) {
        res.redirect('/salas?error=' + encodeURIComponent(error.message));
    }
});

// -------- NUEVAS RUTAS API --------

// Ruta API para que un profesor actualice su color
router.post('/api/profesor/actualizar-color', verificarToken, async (req, res) => {
    if (req.userTipo !== 2) { // Solo profesores pueden cambiar su propio color
        return res.status(403).json({ success: false, message: 'No tienes permiso.' });
    }
    if (!req.profesorId) {
        return res.status(400).json({ success: false, message: 'ID de profesor no encontrado en la sesión.' });
    }

    const { color } = req.body;
    if (!color) {
        return res.status(400).json({ success: false, message: 'Color no proporcionado.' });
    }

    try {
        await queries.actualizarColorProfesor(req.profesorId, color);
        res.json({ success: true, message: 'Color actualizado correctamente.' });
    } catch (error) {
        console.error('Error en POST /api/profesor/actualizar-color:', error);
        res.status(500).json({ success: false, message: error.message || 'Error al actualizar el color.' });
    }
});

// Ruta API para obtener el total de alumnos (diferente para admin y profesor)
router.get('/api/total-alumnos', verificarToken, async (req, res) => {
    try {
        let totalAlumnos;
        if (req.userTipo === 1) { // Administrador
            totalAlumnos = await queries.contarTodosLosAlumnos();
        } else if (req.userTipo === 2) { // Profesor
            if (!req.profesorId) {
                return res.status(400).json({ success: false, message: 'ID de profesor no encontrado para el usuario profesor.' });
            }
            totalAlumnos = await queries.contarMisAlumnos(req.profesorId);
        } else { // Otro tipo de usuario o no logueado (aunque verificarToken debería manejar no logueado)
            return res.status(403).json({ success: false, message: 'No tienes permiso para esta acción.' });
        }
        res.json({ success: true, totalAlumnos });
    } catch (error) {
        console.error('Error en GET /api/total-alumnos:', error);
        res.status(500).json({ success: false, message: error.message || 'Error al obtener el total de alumnos.' });
    }
});

// API para actualizar un alumno
router.put('/api/alumnos/:id', verificarToken, [
    // Validaciones (puedes añadir más según necesidad)
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío si se envía.').trim(),
    body('apellido').optional().notEmpty().withMessage('El apellido no puede estar vacío si se envía.').trim(),
    body('email').optional().isEmail().withMessage('Email inválido.').normalizeEmail(),
    body('numero_telefono').optional().isMobilePhone('any', { strictMode: false }).withMessage('Número de teléfono inválido. Intenta con formato internacional (+569xxxxxxxx).'),
    body('comentarios').optional().trim()
], async (req, res) => {
    if (req.userTipo !== 1 && req.userTipo !== 2) { // Solo Admin o Profesor
        return res.status(403).json({ success: false, message: 'No tienes permiso para actualizar alumnos.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array(), message: errors.array()[0].msg });
    }

    try {
        const alumnoId = req.params.id;
        const datosAlumno = req.body; // Contiene los campos que se enviaron para actualizar
        console.log(`[PUT /api/alumnos/${alumnoId}] req.body recibido:`, JSON.stringify(datosAlumno)); // LOG 1
        
        // Filtrar solo los campos que realmente se pueden editar desde esta interfaz
        const camposPermitidos = ['nombre', 'apellido', 'email', 'numero_telefono', 'comentarios'];
        const datosParaActualizar = {};
        for (const campo of camposPermitidos) {
            if (datosAlumno.hasOwnProperty(campo)) {
                datosParaActualizar[campo] = datosAlumno[campo];
            }
        }

        console.log(`[PUT /api/alumnos/${alumnoId}] datosParaActualizar que se enviarán a queries.actualizarAlumno:`, JSON.stringify(datosParaActualizar)); // LOG 2

        if (Object.keys(datosParaActualizar).length === 0) {
            return res.status(400).json({ success: false, message: 'No hay datos para actualizar.' });
        }

        await queries.actualizarAlumno(alumnoId, datosParaActualizar);
        res.json({ success: true, message: 'Alumno actualizado correctamente.' });

    } catch (error) {
        console.error(`Error en PUT /api/alumnos/${req.params.id}:`, error);
        res.status(500).json({ success: false, message: error.message || 'Error interno al actualizar el alumno.' });
    }
});

// API para "eliminar" (desactivar) un alumno
router.delete('/api/alumnos/:id', verificarToken, async (req, res) => {
    if (req.userTipo !== 1 && req.userTipo !== 2) { // Solo Admin o Profesor
        return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar alumnos.' });
    }
    try {
        const alumnoId = req.params.id;
        await queries.eliminarAlumnoPermanentemente(alumnoId);
        res.json({ success: true, message: 'Alumno eliminado permanentemente.' });
    } catch (error) {
        console.error(`Error en DELETE /api/alumnos/${req.params.id}:`, error);
        res.status(500).json({ success: false, message: error.message || 'Error interno al eliminar el alumno.' });
    }
});