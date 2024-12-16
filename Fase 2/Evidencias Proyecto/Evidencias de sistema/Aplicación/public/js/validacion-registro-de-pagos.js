function validarCampo(campo) {
    const checkIcon = campo.nextElementSibling;
    if (campo.checkValidity() && campo.value.trim() !== '') {
        checkIcon.classList.add('show');
    } else {
        checkIcon.classList.remove('show');
    }
}

function camposCompletos() {
    const campos = document.querySelectorAll('input, textarea');
    let todosCompletos = true;
    campos.forEach(campo => {
        validarCampo(campo);
        if (campo.required && campo.value.trim() === '') {
            todosCompletos = false;
        }
    });
    return todosCompletos;
}

function datosCorrectos() {
    return camposCompletos();
}

function manejarEnvio(event) {
    event.preventDefault();

    if (!datosCorrectos()) {
        alert('Por favor, complete todos los campos requeridos correctamente.');
        return;
    }

    if (confirm('Los datos son correctos. ¿Desea continuar?')) {
        const formulario = event.target;
        const formData = new FormData(formulario);

        // Convertir FormData a un objeto simple
        const data = {};
        formData.forEach((value, key) => { data[key] = value });

        fetch(formulario.action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert(data.message);
                window.location.href = data.redirectUrl;
            } else {
                throw new Error(data.error || 'Hubo un problema con el envío del formulario.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message || 'Hubo un error al enviar el formulario. Por favor, inténtelo de nuevo.');
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.querySelector('form');
    if (formulario) {
        formulario.addEventListener('submit', manejarEnvio);
        const campos = document.querySelectorAll('input, textarea');
        campos.forEach(campo => {
            campo.addEventListener('input', () => validarCampo(campo));
            campo.addEventListener('blur', () => validarCampo(campo));
        });
    }

    const modal = document.getElementById('modalBuscarAlumno');
    const closeButton = document.querySelector('.close');

    // Cerrar el modal al hacer clic en el botón de cerrar
    closeButton.onclick = function() {
        modal.style.display = 'none';
    }

    // Cerrar el modal al hacer clic fuera del contenido del modal
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }

    // Mostrar el modal al hacer clic en el botón "Buscar Alumno"
    document.getElementById('buscarAlumnoBtn').onclick = function() {
        modal.style.display = "block";
    }

    document.getElementById('buscadorAlumno').addEventListener('input', async function() {
        const query = this.value;
        const response = await fetch(`/api/buscar-alumno?nombre=${query}`);
        const alumnos = await response.json();
        const listaAlumnos = document.getElementById('listaAlumnos');
        listaAlumnos.innerHTML = ''; // Limpiar la lista antes de agregar nuevos resultados

        alumnos.forEach(alumno => {
            const button = document.createElement('button');
            button.textContent = `${alumno.nombre} ${alumno.apellido}`;
            button.className = 'button-alumno'; // Clase para el estilo
            button.dataset.id = alumno.id; // Guardar el ID en un atributo de datos

            // Agregar evento para seleccionar el alumno
            button.onclick = function() {
                document.getElementById('alumno_id').value = alumno.id; // Asignar el ID al campo oculto
                document.getElementById('modalBuscarAlumno').style.display = "none"; // Cerrar el modal
            };

            listaAlumnos.appendChild(button); // Agregar el botón al contenedor
        });
    });
});