const db = require('../db');

const getDashboardData = async (req, res) => {
    console.log("dashboardControllerProfesor.getDashboardData ya no se utiliza activamente para la ruta /dashboard-profesor. La lógica está en routes.js.");
    // Si esta función aún es llamada desde algún lugar, podría necesitar devolver una respuesta o llamar a next().
    // Por ahora, solo lo notificamos.
    if (res && typeof res.status === 'function' && typeof res.send === 'function') {
         // res.status(500).send('Controlador obsoleto invocado.');
    } else if (next && typeof next === 'function'){
        // next();
    }
};

module.exports = {
    getDashboardData
}; 