document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const content = document.querySelector('.content');
    const sidebarToggle = document.getElementById('sidebarToggle');

    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        content.classList.toggle('expanded');
        
        // Actualizar los gráficos cuando cambie el tamaño del contenedor
        const charts = document.querySelectorAll('canvas');
        charts.forEach(canvas => {
            const chart = Chart.getChart(canvas);
            if (chart) {
                setTimeout(() => {
                    chart.resize();
                }, 300); // Esperar a que termine la animación
            }
        });
    });
}); 