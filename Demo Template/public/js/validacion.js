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
                window.location.href = '/formulario-class';
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
});