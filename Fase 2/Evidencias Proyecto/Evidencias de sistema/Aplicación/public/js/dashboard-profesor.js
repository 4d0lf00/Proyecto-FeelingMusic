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
    const ctxInstrumentos = document.getElementById('instrumentosChart').getContext('2d');
    new Chart(ctxInstrumentos, {
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

    // Actualizar contador de alumnos
    const actualizarContadores = async () => {
        try {
            const elementoAlumnos = document.getElementById('totalMisAlumnos');
            elementoAlumnos.textContent = window.dashboardData.totalAlumnos;
            
            elementoAlumnos.classList.add('updating');
            setTimeout(() => {
                elementoAlumnos.classList.remove('updating');
            }, 300);
            
        } catch (error) {
            console.error('Error al actualizar contadores:', error);
        }
    };

    actualizarContadores();
});