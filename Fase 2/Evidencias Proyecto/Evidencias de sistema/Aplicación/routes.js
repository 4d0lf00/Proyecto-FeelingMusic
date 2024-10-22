const express = require('express');
const queries = require('./queries'); // Importar las funciones de consulta
const router = express.Router();

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
