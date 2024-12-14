const db = require('../db');

const getDashboardData = (req, res) => {
    try {
        // Consulta para obtener alumnos por mes
        const monthlyQuery = `
            SELECT 
                MONTH(fecha_registro) as mes,
                COUNT(*) as total
            FROM alumno
            WHERE YEAR(fecha_registro) = YEAR(CURRENT_DATE())
            GROUP BY MONTH(fecha_registro)
            ORDER BY mes
        `;

        // Consulta modificada para contar alumnos por instrumento a través del profesor
        const instrumentQuery = `
            SELECT 
                LOWER(i.nombre) as instrumento,
                COUNT(DISTINCT a.id) as total
            FROM instrumentos i
            LEFT JOIN profesor p ON i.profesor_id = p.id
            LEFT JOIN alumno a ON a.profesor_id = p.id
            WHERE i.estado = 'activo'
            GROUP BY LOWER(i.nombre)
            ORDER BY total DESC
        `;

        // Consulta para obtener el conteo de visualizaciones
        const viewsQuery = `
            SELECT SUM(contador) as total_views
            FROM page_views
        `;

        // Ejecutar ambas consultas
        db.query(monthlyQuery, (err, monthlyResults) => {
            if (err) {
                console.error('Error al obtener datos mensuales:', err);
                return res.status(500).render('error', { message: 'Error al cargar el dashboard' });
            }

            db.query(instrumentQuery, (err, instrumentResults) => {
                if (err) {
                    console.error('Error al obtener datos de instrumentos:', err);
                    return res.status(500).render('error', { message: 'Error al cargar el dashboard' });
                }

                db.query(viewsQuery, (err, viewsResults) => {
                    if (err) {
                        console.error('Error al obtener visualizaciones:', err);
                        return res.status(500).render('error', { message: 'Error al cargar el dashboard' });
                    }

                    const totalViews = viewsResults[0].total_views || 0;

                    // Inicializar array con 12 meses en 0
                    const monthlyData = new Array(12).fill(0);
                    
                    // Llenar con datos reales mensuales
                    monthlyResults.forEach(row => {
                        monthlyData[row.mes - 1] = row.total;
                    });

                    // Preparar datos para el gráfico de instrumentos
                    const instrumentLabels = [];
                    const instrumentValues = [];
                    
                    instrumentResults.forEach(row => {
                        // Capitalizar primera letra del instrumento
                        const instrumentName = row.instrumento.charAt(0).toUpperCase() + 
                                            row.instrumento.slice(1).toLowerCase().trim();
                        instrumentLabels.push(instrumentName);
                        instrumentValues.push(row.total);
                    });

                    console.log('Datos de instrumentos:', instrumentResults); // Para debugging

                    const dashboardData = {
                        monthly: monthlyData,
                        users: monthlyResults.reduce((acc, curr) => acc + curr.total, 0),
                        revenue: 45600,
                        orders: totalViews,
                        categoryData: {
                            labels: instrumentLabels,
                            values: instrumentValues
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