// Obtener el horario disponible del profesor
obtenerHorarioDisponible(profesorId, (error, horarios) => {
    if (error) {
        console.error(error);
    } else {
        // Mostrar el horario disponible del profesor
        const horariosContainer = document.getElementById('horarios');
        horariosContainer.innerHTML = '';

        horarios.forEach((horario) => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = horario.id;
            checkbox.id = `horario${horario.id}`;

            const label = document.createElement('label');
            label.htmlFor = `horario${horario.id}`;
            label.textContent = `${horario.dia} ${horario.hora_inicio} - ${horario.hora_fin}`;

            horariosContainer.appendChild(checkbox);
            horariosContainer.appendChild(label);
        });
    }
});