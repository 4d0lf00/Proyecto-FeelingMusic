const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// Lista de alumnos con sus detalles (datos de ejemplo)
const alumnos = [
    { id: 1, nombre: "Ana", apellido1: "García", apellido2: "López", rut: "12345678-9", numero_telefono: 123456789, email: "ana@example.com", fecha_nacimiento: "1990-01-15", comentarios: "Estudiante dedicada" },
    { id: 2, nombre: "Carlos", apellido1: "López", apellido2: "Pérez", rut: "23456789-0", numero_telefono: 234567890, email: "carlos@example.com", fecha_nacimiento: "1992-05-20", comentarios: "Interesado en composición" },
    { id: 3, nombre: "María", apellido1: "Rodríguez", apellido2: "Sánchez", rut: "34567890-1", numero_telefono: 345678901, email: "maria@example.com", fecha_nacimiento: "1995-11-30", comentarios: "Excelente voz" },
    { id: 4, nombre: "Juan", apellido1: "Pérez", apellido2: "González", rut: "45678901-2", numero_telefono: 456789012, email: "juan@example.com", fecha_nacimiento: "1988-07-10", comentarios: "Principiante entusiasta" },
    { id: 5, nombre: "Sofía", apellido1: "Martínez", apellido2: "Ruiz", rut: "56789012-3", numero_telefono: 567890123, email: "sofia@example.com", fecha_nacimiento: "1993-03-25", comentarios: "Talento natural para el piano" }
];

// Datos de ejemplo para las relaciones entre alumnos, instrumentos y modalidades
const alumnosInstrumentos = [
    { alumno_id: 1, instrumento: "Guitarra" },
    { alumno_id: 1, instrumento: "Canto" },
    { alumno_id: 2, instrumento: "Piano" },
    { alumno_id: 3, instrumento: "Canto" },
    { alumno_id: 4, instrumento: "Guitarra" },
    { alumno_id: 5, instrumento: "Piano" }
];

const alumnosModalidades = [
    { alumno_id: 1, modalidad: "Individual" },
    { alumno_id: 2, modalidad: "Grupal" },
    { alumno_id: 3, modalidad: "Individual" },
    { alumno_id: 4, modalidad: "Grupal" },
    { alumno_id: 5, modalidad: "Individual" }
];

// Función para obtener los instrumentos de un alumno
function obtenerInstrumentosAlumno(alumnoId) {
    return alumnosInstrumentos
        .filter(ai => ai.alumno_id === alumnoId)
        .map(ai => ai.instrumento);
}

// Función para obtener las modalidades de un alumno
function obtenerModalidadesAlumno(alumnoId) {
    return alumnosModalidades
        .filter(am => am.alumno_id === alumnoId)
        .map(am => am.modalidad);
}

// Ruta para obtener todos los alumnos con información detallada
app.get('/alumnos', (req, res) => {
    const alumnosDetallados = alumnos.map(alumno => ({
        ...alumno,
        instrumentos: obtenerInstrumentosAlumno(alumno.id),
        modalidades: obtenerModalidadesAlumno(alumno.id)
    }));
    res.json(alumnosDetallados);
});

// Ruta para filtrar alumnos por instrumento
app.get('/alumnos/instrumento/:instrumento', (req, res) => {
    const instrumento = req.params.instrumento.toLowerCase();
    const alumnosFiltrados = alumnos.filter(alumno => 
        obtenerInstrumentosAlumno(alumno.id).some(i => i.toLowerCase() === instrumento)
    );
    res.json(alumnosFiltrados);
});

// Ruta para filtrar alumnos por modalidad
app.get('/alumnos/modalidad/:modalidad', (req, res) => {
    const modalidad = req.params.modalidad.toLowerCase();
    const alumnosFiltrados = alumnos.filter(alumno => 
        obtenerModalidadesAlumno(alumno.id).some(m => m.toLowerCase() === modalidad)
    );
    res.json(alumnosFiltrados);
});

// Función para obtener todas las clases (instrumentos) únicas
app.get('/clases', (req, res) => {
    const clasesUnicas = [...new Set(alumnosInstrumentos.map(ai => ai.instrumento))];
    res.json(clasesUnicas);
});

// Función para contar alumnos por modalidad en un instrumento específico
app.get('/alumnos/instrumento/:instrumento/modalidades', (req, res) => {
    const instrumento = req.params.instrumento.toLowerCase();
    const alumnosInstrumento = alumnos.filter(alumno => 
        obtenerInstrumentosAlumno(alumno.id).some(i => i.toLowerCase() === instrumento)
    );
    
    const conteo = {
        Individual: 0,
        Grupal: 0
    };

    alumnosInstrumento.forEach(alumno => {
        const modalidades = obtenerModalidadesAlumno(alumno.id);
        modalidades.forEach(modalidad => {
            conteo[modalidad]++;
        });
    });

    res.json(conteo);
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});