const db = require('../db');

const getDashboardData = (req, res) => {
    try {
        // Consulta para obtener alumnos por mes
        const query = `
            SELECT 
                MONTH(fecha_registro) as mes,
                COUNT(*) as total
            FROM alumno
            WHERE YEAR(fecha_registro) = YEAR(CURRENT_DATE())
            GROUP BY MONTH(fecha_registro)
            ORDER BY mes
        `;

        db.query(query, (err, results) => {
            if (err) {
                console.error('Error al obtener datos:', err);
                return res.status(500).render('error', { message: 'Error al cargar el dashboard' });
            }

            // Inicializar array con 12 meses en 0
            const monthlyData = new Array(12).fill(0);
            
            // Llenar con datos reales
            results.forEach(row => {
                monthlyData[row.mes - 1] = row.total;
            });

            const dashboardData = {
                monthly: monthlyData,  // Datos reales de alumnos por mes
                users: results.reduce((acc, curr) => acc + curr.total, 0),  // Total de alumnos
                revenue: 45600,
                orders: 390,
                categoryData: {
                    labels: ['Electronics', 'Clothing', 'Books', 'Food', 'Sports'],
                    values: [35, 25, 15, 15, 10]
                },
                trafficSources: {
                    labels: ['Direct', 'Social', 'Email', 'Ads', 'Organic'],
                    values: [1200, 900, 800, 600, 500]
                }
            };

            res.render('dashboard', {
                title: 'Dashboard',
                data: dashboardData,
                userTipo: req.userTipo
            });
        });

    } catch (error) {
        console.error('Error en el dashboard:', error);
        res.status(500).render('error', { message: 'Error al cargar el dashboard' });
    }
};

module.exports = {
    getDashboardData
}; 