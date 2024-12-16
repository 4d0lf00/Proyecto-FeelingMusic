const db = require('../db');

const getDashboardData = async (req, res) => {
    try {
        const profesorId = req.userId;

        // Consulta para alumnos por instrumento
        const instrumentosQuery = `
            SELECT 
                i.nombre as instrumento,
                COUNT(DISTINCT c.id) as total
            FROM clases c
            JOIN instrumentos i ON c.instrumento_id = i.id
            WHERE c.profesor_id = ?
            GROUP BY i.nombre
        `;

        // Consulta para total de alumnos del profesor
        const totalAlumnosQuery = `
            SELECT COUNT(DISTINCT a.id) as total
            FROM alumno a
            JOIN asistencia ast ON a.id = ast.alumno_id
            JOIN clases c ON ast.clase_id = c.id
            WHERE c.profesor_id = ?
        `;

        // Ejecutar consultas
        db.query(instrumentosQuery, [profesorId], (err, instrumentosResults) => {
            if (err) {
                console.error('Error al obtener datos de instrumentos:', err);
                return res.status(500).render('error', { message: 'Error al cargar el dashboard' });
            }

            db.query(totalAlumnosQuery, [profesorId], (err, totalResults) => {
                if (err) {
                    console.error('Error al obtener total de alumnos:', err);
                    return res.status(500).render('error', { message: 'Error al cargar el dashboard' });
                }

                const dashboardData = {
                    instrumentos: {
                        labels: instrumentosResults.map(row => row.instrumento),
                        values: instrumentosResults.map(row => row.total)
                    },
                    totalAlumnos: totalResults[0].total || 0
                };

                res.render('dashboard-profesor', {
                    title: 'Dashboard Profesor',
                    data: dashboardData,
                    userTipo: req.userTipo
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