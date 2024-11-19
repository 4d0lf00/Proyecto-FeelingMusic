document.addEventListener('DOMContentLoaded', function() {
    
    // Función para crear el gráfico de líneas
    function createSalesChart(data) {
        const ctx = document.getElementById('salesChart').getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(54, 162, 235, 0.5)');
        gradient.addColorStop(1, 'rgba(54, 162, 235, 0)');

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Monthly Sales',
                    data: data.monthly,
                    borderColor: '#36A2EB',
                    backgroundColor: gradient,
                    tension: 0.4,
                    fill: true
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

    // Inicializar las gráficas
    const dashboardData = window.dashboardData; // Asegúrate de pasar estos datos desde el servidor
    if (dashboardData) {
        createSalesChart(dashboardData);
        createCategoryChart(dashboardData);
        createTrafficChart(dashboardData);
    }
});