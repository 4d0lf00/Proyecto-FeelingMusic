// Función para verificar si todos los campos están completos
function camposCompletos() {
    const campos = document.querySelectorAll('input, textarea');
    for (let campo of campos) {
        if (campo.required && campo.value.trim() === '') {
            return false;
        }
    }
    return true;
}

// Función para validar los datos (puedes personalizar según tus necesidades)
function datosCorrectos() {
    // Aquí puedes agregar validaciones específicas
    // Por ejemplo, validar formato de email, longitud de contraseña, etc.
    // Por ahora, solo verificaremos si los campos están completos
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
            window.location.href = 'formulario-class.html';
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