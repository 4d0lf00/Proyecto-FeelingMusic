// Lista de alumnos con sus detalles (La bd no ha sido creada, asi que solo son unos placeholder)
const alumnos = [
    { id: 1, nombre: "Ana García", clase: "Guitarra", nivel: "Individual" },
    { id: 2, nombre: "Carlos López", clase: "Piano", nivel: "Grupal" },
    { id: 3, nombre: "María Rodríguez", clase: "Canto", nivel: "Individual" },
    { id: 4, nombre: "Juan Pérez", clase: "Guitarra", nivel: "Grupal" },
    { id: 5, nombre: "Sofía Martínez", clase: "Piano", nivel: "Grupal" },
    { id: 6, nombre: "Diego Fernández", clase: "Batería", nivel: "Individual" },
    { id: 7, nombre: "Laura Sánchez", clase: "Canto", nivel: "Individual" },
    { id: 8, nombre: "Pedro Ramírez", clase: "Guitarra", nivel: "Individual" },
    { id: 9, nombre: "Isabel Torres", clase: "Piano", nivel: "Grupal" },
    { id: 10, nombre: "Andrés Vargas", clase: "Batería", nivel: "Individual" }
];

// Función para filtrar alumnos por clase
function filtrarAlumnosPorClase(clase) {
    return alumnos.filter(alumno => alumno.clase.toLowerCase() === clase.toLowerCase());
}

// Función para mostrar alumnos en consola
function mostrarAlumnos(listaAlumnos) {
    console.log("Lista de Alumnos:");
    listaAlumnos.forEach(alumno => {
        console.log(`ID: ${alumno.id}, Nombre: ${alumno.nombre}, Clase: ${alumno.clase}, Nivel: ${alumno.nivel}`);
    });
}

// Función principal para filtrar y mostrar alumnos
function filtrarYMostrarAlumnos(clase) {
    const alumnosFiltrados = filtrarAlumnosPorClase(clase);
    mostrarAlumnos(alumnosFiltrados);
    return alumnosFiltrados; // Retorna la lista filtrada para uso adicional si es necesario
}

// Ejemplo de uso
console.log("Alumnos de Guitarra:");
filtrarYMostrarAlumnos("Guitarra");

console.log("\nAlumnos de Piano:");
filtrarYMostrarAlumnos("Piano");

// Función para obtener todas las clases únicas
function obtenerClasesUnicas() {
    return [...new Set(alumnos.map(alumno => alumno.clase))];
}

// Mostrar todas las clases disponibles
console.log("\nClases disponibles:");
console.log(obtenerClasesUnicas());

// Función para contar alumnos por nivel en una clase específica
function contarAlumnosPorNivel(clase) {
    const alumnosClase = filtrarAlumnosPorClase(clase);
    const conteo = {
        Individual: 0,
        Grupal: 0
    
    };
    alumnosClase.forEach(alumno => {
        conteo[alumno.nivel]++;
    });
    return conteo;
}

// Ejemplo de uso del conteo por nivel
console.log("\nDistribución de niveles en la clase de Guitarra:");
console.log(contarAlumnosPorNivel("Guitarra"));