const dashboardData = {
    monthly: [1500, 2300, 3200, 2800, 3800, 4200, 3900, 4600, 5200, 4800, 5500, 6000],
    users: 1250,
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

const getDashboardData = (req, res) => {
    try {
        console.log('Datos enviados al dashboard:', dashboardData);
        
        res.render('dashboard', { 
            title: 'Dashboard',
            data: dashboardData,
            userTipo: req.userTipo
        });
    } catch (error) {
        console.error('Error en el dashboard:', error);
        res.status(500).render('error', { message: 'Error al cargar el dashboard' });
    }
};

module.exports = {
    getDashboardData
}; 