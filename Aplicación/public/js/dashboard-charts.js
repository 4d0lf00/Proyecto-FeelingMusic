document.addEventListener('DOMContentLoaded', function() {
    // Configuración común para los gráficos
    Chart.defaults.font.family = "'Arial', sans-serif";
    Chart.defaults.color = '#666';

    // Función para crear el gráfico de ventas mensuales
    function createSalesChart() {
        const ctx = document.getElementById('salesChart').getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(54, 162, 235, 0.3)');
        gradient.addColorStop(1, 'rgba(54, 162, 235, 0)');

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: [{
                    label: 'Ventas Mensuales',
                    data: window.dashboardData.monthly,
                    borderColor: '#36A2EB',
                    backgroundColor: gradient,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#36A2EB',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Función para crear el gráfico de categorías
    function createCategoryChart() {
        const ctx = document.getElementById('categoryChart');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: window.dashboardData.categoryData.labels,
                datasets: [{
                    data: window.dashboardData.categoryData.values,
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            boxWidth: 12
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12
                    }
                },
                cutout: '60%'
            }
        });
    }

    // Función para crear el gráfico de fuentes de tráfico
    function createTrafficChart() {
        const ctx = document.getElementById('trafficChart');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: window.dashboardData.trafficSources.labels,
                datasets: [{
                    label: 'Visitantes',
                    data: window.dashboardData.trafficSources.values,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)'
                    ],
                    borderColor: [
                        'rgb(255, 99, 132)',
                        'rgb(54, 162, 235)',
                        'rgb(255, 206, 86)',
                        'rgb(75, 192, 192)',
                        'rgb(153, 102, 255)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Inicializar las gráficas solo si existen los datos y los elementos canvas
    if (window.dashboardData && 
        document.getElementById('salesChart') && 
        document.getElementById('categoryChart') && 
        document.getElementById('trafficChart')) {
        try {
            createSalesChart();
            createCategoryChart();
            createTrafficChart();
        } catch (error) {
            console.error('Error al crear las gráficas:', error);
        }
    }
}); 