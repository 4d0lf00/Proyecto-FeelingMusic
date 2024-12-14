// Función para formatear la fecha
function formatDate(dia, mes, annio) {
    return new Date(annio, mes - 1, dia).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Función para verificar si una clase está en curso
function isCurrentClass(hora_inicio, hora_fin) {
    const now = new Date();
    const [horaInicio, minutosInicio] = hora_inicio.split(':').map(Number);
    const [horaFin, minutosFin] = hora_fin.split(':').map(Number);
    
    const classStart = new Date();
    classStart.setHours(horaInicio, minutosInicio, 0);
    
    const classEnd = new Date();
    classEnd.setHours(horaFin, minutosFin, 0);
    
    return now >= classStart && now <= classEnd;
}

// Función para crear el elemento HTML de una clase
function createClassElement(classData, isCurrent = false) {
    const classItem = document.createElement('div');
    classItem.className = `class-item ${isCurrent ? 'current' : ''}`;
    
    const fecha = formatDate(classData.dia, classData.mes, classData.annio);
    
    classItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <h4 class="h5 mb-1">${classData.nombre_clase}</h4>
            <span class="time-badge">${classData.hora_inicio} - ${classData.hora_fin}</span>
        </div>
        <div class="class-info mb-2">
            <p class="mb-1"><strong>Fecha:</strong> ${fecha}</p>
            <p class="mb-1"><strong>Instrumento:</strong> ${classData.instrumento}</p>
            <p class="mb-1"><strong>Profesor:</strong> ${classData.profesor_nombre} ${classData.profesor_apellido}</p>
            <p class="mb-0"><strong>Sala:</strong> ${classData.sala_nombre || 'Por asignar'}</p>
        </div>
    `;
    
    return classItem;
}

// Función para actualizar el horario en la página
async function updateSchedule() {
    try {
        const response = await fetch('/clases-alumno');
        if (!response.ok) {
            throw new Error('Error al obtener las clases');
        }
        
        const clases = await response.json();
        
        // Actualizar la fecha actual
        document.getElementById('current-date').textContent = new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Filtrar clases de hoy
        const today = new Date();
        const clasesHoy = clases.filter(clase => {
            const fechaClase = new Date(clase.annio, clase.mes - 1, clase.dia);
            return fechaClase.toDateString() === today.toDateString();
        });
        
        // Actualizar el horario de hoy
        const todayScheduleContainer = document.getElementById('today-schedule');
        todayScheduleContainer.innerHTML = '';
        
        if (clasesHoy.length === 0) {
            todayScheduleContainer.innerHTML = '<p class="text-muted">No hay clases programadas para hoy.</p>';
        } else {
            clasesHoy.forEach(classData => {
                const isCurrent = isCurrentClass(classData.hora_inicio, classData.hora_fin);
                todayScheduleContainer.appendChild(createClassElement(classData, isCurrent));
            });
        }
        
        // Actualizar próximas clases
        const upcomingScheduleContainer = document.getElementById('upcoming-schedule');
        upcomingScheduleContainer.innerHTML = '';
        
        const proximasClases = clases.filter(clase => {
            const fechaClase = new Date(clase.annio, clase.mes - 1, clase.dia);
            return fechaClase > today;
        }).slice(0, 5); // Mostrar solo las próximas 5 clases
        
        if (proximasClases.length === 0) {
            upcomingScheduleContainer.innerHTML = '<p class="text-muted">No hay próximas clases programadas.</p>';
        } else {
            proximasClases.forEach(classData => {
                upcomingScheduleContainer.appendChild(createClassElement(classData));
            });
        }
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('today-schedule').innerHTML = '<p class="text-danger">Error al cargar las clases.</p>';
    }
}

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    updateSchedule();
    // Actualizar el horario cada minuto
    setInterval(updateSchedule, 60000);
});