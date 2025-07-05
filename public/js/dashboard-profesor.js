document.addEventListener('DOMContentLoaded', function() {
    // Seleccionar todos los triggers de dropdown
    const dropdownTriggers = document.querySelectorAll('.dropdown-trigger-profesor');
    
    dropdownTriggers.forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Encontrar el elemento li padre
            const parentLi = this.parentElement;
            
            // Toggle de la clase active
            parentLi.classList.toggle('submenu-active');
            
            // Cerrar otros submenús abiertos
            dropdownTriggers.forEach(otherTrigger => {
                if (otherTrigger !== trigger) {
                    otherTrigger.parentElement.classList.remove('submenu-active');
                }
            });
        });
    });
    
    // Cerrar el menú al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.sidebar-profesor')) {
            document.querySelectorAll('.submenu-active').forEach(item => {
                item.classList.remove('submenu-active');
            });
        }
    });

    // Crear gráfico de instrumentos
    const ctxInstrumentos = document.getElementById('instrumentosChart');
    if (ctxInstrumentos && window.dashboardData && window.dashboardData.instrumentos) {
        new Chart(ctxInstrumentos.getContext('2d'), {
            type: 'bar',
            data: {
                labels: window.dashboardData.instrumentos.labels,
                datasets: [{
                    label: 'Alumnos por Instrumento',
                    data: window.dashboardData.instrumentos.values,
                    backgroundColor: [
                        '#3498db',
                        '#2ecc71',
                        '#e74c3c',
                        '#f1c40f',
                        '#9b59b6',
                        '#34495e'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Distribución de Alumnos por Instrumento'
                    }
                }
            }
        });
    } else {
        console.warn('Elemento del gráfico o datos de instrumentos no encontrados. El gráfico no se renderizará.');
    }

    // Actualizar contador de alumnos
    const actualizarContadorAlumnos = () => {
        const elementoAlumnos = document.getElementById('totalMisAlumnos');
        if (elementoAlumnos && window.dashboardData && typeof window.dashboardData.totalAlumnos !== 'undefined') {
            elementoAlumnos.textContent = window.dashboardData.totalAlumnos;
            elementoAlumnos.classList.add('updating');
            setTimeout(() => {
                elementoAlumnos.classList.remove('updating');
            }, 300);
        } else {
            // Si window.dashboardData no está listo, intentar obtenerlo de la API (fallback)
            // Esto es útil si la página carga inicialmente sin los datos completos por alguna razón
            fetch('/api/total-alumnos') // Ruta corregida
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success && elementoAlumnos) {
                        elementoAlumnos.textContent = data.totalAlumnos;
                    } else if (elementoAlumnos) {
                        elementoAlumnos.textContent = 'N/A';
                        console.error('Error al obtener total de alumnos desde API:', data.message);
                    }
                })
                .catch(error => {
                    console.error('Error al actualizar contador de alumnos (fetch):', error);
                    if (elementoAlumnos) elementoAlumnos.textContent = 'Error';
                });
        }
    };

    actualizarContadorAlumnos();

    // --- MANEJO DEL CAMBIO DE COLOR DEL PROFESOR ---
    const colorPicker = document.getElementById('profesorColorPicker');
    const guardarColorBtn = document.getElementById('guardarColorProfesor');
    const mensajeColor = document.getElementById('mensajeColorProfesor');

    if (guardarColorBtn && colorPicker && mensajeColor) {
        guardarColorBtn.addEventListener('click', function() {
            const nuevoColor = colorPicker.value;
            mensajeColor.textContent = 'Guardando...';
            mensajeColor.className = 'mensaje-feedback neutral';

            fetch('/api/profesor/actualizar-color', { // Ruta API corregida
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Asegúrate de enviar el token CSRF si es necesario en tu aplicación
                },
                body: JSON.stringify({ color: nuevoColor })
            })
            .then(response => {
                // Primero, verifica si la respuesta es OK, incluso si no es JSON válido (ej. un 500 error page)
                if (!response.ok) {
                    // Intenta obtener texto para ver si es una página de error HTML
                    return response.text().then(text => {
                        throw new Error(`Error del servidor: ${response.status}. Respuesta: ${text.substring(0,100)}`);
                    });
                }
                return response.json(); // Procede a parsear como JSON solo si la respuesta es OK
            })
            .then(data => {
                if (data.success) {
                    mensajeColor.textContent = 'Color guardado con éxito.';
                    mensajeColor.className = 'mensaje-feedback success';
                    // Opcionalmente, actualiza el color visualmente en la UI sin recargar la página
                    if (document.querySelector('.profesor-avatar-color')) {
                         document.querySelector('.profesor-avatar-color').style.backgroundColor = nuevoColor;
                    }
                } else {
                    mensajeColor.textContent = `Error: ${data.message || 'No se pudo guardar el color.'}`;
                    mensajeColor.className = 'mensaje-feedback error';
                }
            })
            .catch(error => {
                console.error('Error al actualizar color:', error);
                mensajeColor.textContent = `Error de conexión al guardar el color. Detalles: ${error.message}`;
                mensajeColor.className = 'mensaje-feedback error';
            });
        });
    }

});