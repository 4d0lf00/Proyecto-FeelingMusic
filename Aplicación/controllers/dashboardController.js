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

        // Consulta para obtener la suma de pagos del mes actual
        const pagosQuery = `
            SELECT COALESCE(SUM(monto), 0) as total_ganancias
            FROM pagos
            WHERE MONTH(fecha_pago) = MONTH(CURRENT_DATE())
            AND YEAR(fecha_pago) = YEAR(CURRENT_DATE())
        `;

        // Consulta para instrumentos
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

        // Consulta para visualizaciones
        const viewsQuery = `
            SELECT SUM(contador) as total_views
            FROM page_views
        `;

        // Ejecutar consultas
        db.query(pagosQuery, (err, pagosResults) => {
            if (err) {
                console.error('Error al obtener pagos:', err);
                return res.status(500).render('error', { message: 'Error al cargar el dashboard' });
            }

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
                        const monthlyData = new Array(12).fill(0);
                        
                        monthlyResults.forEach(row => {
                            monthlyData[row.mes - 1] = row.total;
                        });

                        const instrumentLabels = [];
                        const instrumentValues = [];
                        
                        instrumentResults.forEach(row => {
                            const instrumentName = row.instrumento.charAt(0).toUpperCase() + 
                                                row.instrumento.slice(1).toLowerCase().trim();
                            instrumentLabels.push(instrumentName);
                            instrumentValues.push(row.total);
                        });

                        const dashboardData = {
                            monthly: monthlyData,
                            users: monthlyResults.reduce((acc, curr) => acc + curr.total, 0),
                            revenue: pagosResults[0].total_ganancias, // Aquí asignamos las ganancias del mes
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
        });

    } catch (error) {
        console.error('Error en el dashboard:', error);
        res.status(500).render('error', { message: 'Error al cargar el dashboard' });
    }
};

const getGananciasMes = (req, res) => {
    const query = `
        SELECT COALESCE(SUM(monto), 0) as total_ganancias
        FROM pagos
        WHERE MONTH(fecha_pago) = MONTH(CURRENT_DATE())
        AND YEAR(fecha_pago) = YEAR(CURRENT_DATE())
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener ganancias:', err);
            return res.status(500).json({ error: 'Error al obtener ganancias' });
        }
        res.json({ total: results[0].total_ganancias });
    });
};

module.exports = {
    getDashboardData,
    getGananciasMes
}; 