const db = require('../db');

const getDashboardData = async (req, res) => {
    try {
        // Definir las consultas
        const monthlyQuery = `
            SELECT MONTH(fecha_registro) as mes, COUNT(*) as total
            FROM alumno WHERE YEAR(fecha_registro) = YEAR(CURRENT_DATE())
            GROUP BY MONTH(fecha_registro) ORDER BY mes
        `;
        const pagosQuery = `
            SELECT COALESCE(SUM(monto), 0) as total_ganancias FROM pagos
            WHERE MONTH(fecha_pago) = MONTH(CURRENT_DATE()) AND YEAR(fecha_pago) = YEAR(CURRENT_DATE())
        `;
        const instrumentQuery = `
            SELECT LOWER(i.nombre) as instrumento, COUNT(DISTINCT a.id) as total
            FROM instrumentos i LEFT JOIN profesor p ON i.profesor_id = p.id
            LEFT JOIN alumno a ON a.profesor_id = p.id
            WHERE i.estado = 'activo' GROUP BY LOWER(i.nombre) ORDER BY total DESC
        `;
        const viewsQuery = `SELECT SUM(contador) as total_views FROM page_views`;

        // Ejecutar todas las consultas en paralelo usando el pool de promesas
        console.log("Ejecutando consultas del dashboard..."); // LOG
        const [pagosResults, monthlyResults, instrumentResults, viewsResults] = await Promise.all([
            db.query(pagosQuery),
            db.query(monthlyQuery),
            db.query(instrumentQuery),
            db.query(viewsQuery)
        ]);
        console.log("Consultas del dashboard completadas."); // LOG

        // Desestructurar los resultados (cada elemento es un array [rows, fields])
        const [pagosRows] = pagosResults;
        const [monthlyRows] = monthlyResults;
        const [instrumentRows] = instrumentResults;
        const [viewsRows] = viewsResults;

        // Procesar los resultados
        const totalViews = viewsRows[0]?.total_views || 0;
        const monthlyData = new Array(12).fill(0);
        monthlyRows.forEach(row => {
            monthlyData[row.mes - 1] = row.total;
        });

        const instrumentLabels = [];
        const instrumentValues = [];
        instrumentRows.forEach(row => {
            const instrumentName = row.instrumento.charAt(0).toUpperCase() + 
                                row.instrumento.slice(1).toLowerCase().trim();
            instrumentLabels.push(instrumentName);
            instrumentValues.push(row.total);
        });

        const dashboardData = {
            monthly: monthlyData,
            users: monthlyRows.reduce((acc, curr) => acc + curr.total, 0),
            revenue: pagosRows[0]?.total_ganancias || 0,
            orders: totalViews,
            categoryData: {
                labels: instrumentLabels,
                values: instrumentValues
            },
            trafficSources: { // Datos de ejemplo, ajustar si es necesario
                labels: ['Direct', 'Social', 'Email', 'Ads', 'Organic'],
                values: [1200, 900, 800, 600, 500]
            }
        };
        
        console.log("Renderizando dashboard..."); // LOG
        res.render('dashboard', {
            title: 'Dashboard',
            data: dashboardData,
            userTipo: req.userTipo
        });

    } catch (error) {
        console.error('Error en getDashboardData:', error); // Loguear error
        res.status(500).render('error-page', { // Renderizar una página de error amigable
             title: "Error", 
             message: "Ocurrió un error al cargar los datos del dashboard.",
             errorDetail: process.env.NODE_ENV !== 'production' ? error.message : '' // Mostrar detalle solo en desarrollo
         }); 
        // O enviar JSON si es una API
        // res.status(500).json({ error: 'Error al cargar el dashboard' });
    }
};

const getGananciasMes = async (req, res) => { // Convertir a async
    const query = `
        SELECT COALESCE(SUM(monto), 0) as total_ganancias FROM pagos
        WHERE MONTH(fecha_pago) = MONTH(CURRENT_DATE()) AND YEAR(fecha_pago) = YEAR(CURRENT_DATE())
    `;
    
    try {
        const [results] = await db.query(query); // Usar await
        res.json({ total: results[0]?.total_ganancias || 0 }); // Devolver JSON
    } catch (err) {
        console.error('Error al obtener ganancias:', err);
        res.status(500).json({ error: 'Error al obtener ganancias' });
    }
};

module.exports = {
    getDashboardData,
    getGananciasMes
}; 