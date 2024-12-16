document.addEventListener('DOMContentLoaded', function() {
    
    // Función para crear el gráfico de alumnos por instrumento
    function createInstrumentosChart(data) {
        const ctx = document.getElementById('instrumentosChart').getContext('2d');
        return new Chart(ctx, {
            type: 'bar', // Tipo de gráfico
            data: {
                labels: data.instrumentos.labels, // Etiquetas de los instrumentos
                datasets: [{
                    label: 'Número de Alumnos',
                    data: data.instrumentos.values, // Valores de alumnos por instrumento
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Función para crear otros gráficos si es necesario
    function createOtherCharts(data) {
        // Aquí puedes agregar más gráficos si es necesario
    }

    // Inicializar las gráficas
    const dashboardData = window.dashboardData;
    if (dashboardData) {
        createInstrumentosChart(dashboardData); // Crear gráfico de instrumentos
        createOtherCharts(dashboardData); // Llamar a otras funciones de gráficos si es necesario
    }
});