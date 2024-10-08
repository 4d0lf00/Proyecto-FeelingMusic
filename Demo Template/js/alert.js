// Funcion para verificar si los campos son correctos
document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("bugform");

    form.addEventListener("submit", function(event) {
        event.preventDefault(); // Evita el envío del formulario

        // Obtén los valores de los campos
        const issuerName = document.getElementById("issuername").value;
        const apellido = document.getElementById("apellido").value;
        const issuerPhone = document.getElementById("issuerphone").value;
        const rut = document.getElementById("rut").value;
        const bugReport = document.getElementById("bug-report").value;

        // Verifica que los campos no estén vacíos
        if (issuerName && apellido && issuerPhone && rut && bugReport) {
            alert("Los datos son correctos. ¡Formulario enviado!");
            window.location.href = "formulario.html"; // Redirige al formulario.html
        } else {
            alert("Por favor, complete todos los campos.");
        }
    });
});
