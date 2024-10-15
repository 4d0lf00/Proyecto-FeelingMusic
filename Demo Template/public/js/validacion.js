// Función para verificar si todos los campos están completos
function camposCompletos() {
    const campos = document.querySelectorAll('input, textarea');
    let todosCompletos = true; // Variable para verificar todos los campos
    campos.forEach(campo => {
        const checkIcon = campo.nextElementSibling; // Obtenemos el span para el check
        if (campo.required && campo.value.trim() === '') {
            checkIcon.textContent = ''; // Limpiar el icono si no está completo
            todosCompletos = false;
        } else {
            checkIcon.textContent = '✔️'; // Agregar un icono de verificación
        }
    });
    return todosCompletos;
}

// Función para validar los datos (puedes personalizar según tus necesidades)
function datosCorrectos() {
    // Aquí se puede agregar validaciones específicas
    return camposCompletos();
}

// Función principal que se ejecuta al enviar el formulario
function manejarEnvio(event) {
    event.preventDefault(); // Prevenir el envío del formulario por defecto

    if (!camposCompletos()) {
        alert('Por favor, complete todos los campos requeridos.');
        return;
    }

    if (datosCorrectos()) {
        if (confirm('Los datos son correctos. ¿Desea continuar?')) {
            window.location.href = 'formulario-class.html'; // Redireccionar si es necesario
        }
    } else {
        alert('Por favor, verifique los datos ingresados.');
    }
}

// Agregar el evento de envío al formulario
document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.querySelector('form');
    if (formulario) {
        formulario.addEventListener('submit', manejarEnvio);
    }
});
