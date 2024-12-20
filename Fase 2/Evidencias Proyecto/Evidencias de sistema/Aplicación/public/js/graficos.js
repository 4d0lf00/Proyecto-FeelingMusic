document.addEventListener('DOMContentLoaded', function() {
    
    // Función para crear el gráfico de barras
    function createSalesChart(data) {
        const ctx = document.getElementById('salesChart').getContext('2d');
        
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: [{
                    label: 'Alumnos Registrados',
                    data: data.monthly,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Alumnos Registrados por Mes'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                return value + ' alumnos';
                            }
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Función para crear el gráfico de categorías
    function createCategoryChart(data) {
        return new Chart(document.getElementById('categoryChart'), {
            type: 'doughnut',
            data: {
                labels: data.categoryData.labels,
                datasets: [{
                    data: data.categoryData.values,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'right' }
                }
            }
        });
    }

    // Función para crear el gráfico de tráfico
    function createTrafficChart(data) {
        return new Chart(document.getElementById('trafficChart'), {
            type: 'bar',
            data: {
                labels: data.trafficSources.labels,
                datasets: [{
                    label: 'Visitors',
                    data: data.trafficSources.values,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Actualizar el gráfico cada 30 segundos
    async function actualizarGraficoAlumnos() {
        try {
            const response = await fetch('/api/alumnos-por-mes');
            const data = await response.json();
            
            // Actualizar los datos del gráfico
            if (window.salesChart) {
                window.salesChart.data.datasets[0].data = data.monthly;
                window.salesChart.update();
            }
        } catch (error) {
            console.error('Error al actualizar gráfico:', error);
        }
    }

    // Inicializar las gráficas
    const dashboardData = window.dashboardData;
    if (dashboardData) {
        window.salesChart = createSalesChart(dashboardData);
        createCategoryChart(dashboardData);
        createTrafficChart(dashboardData);

        // Actualizar el gráfico cada 30 segundos
        setInterval(actualizarGraficoAlumnos, 15000);
    }
});