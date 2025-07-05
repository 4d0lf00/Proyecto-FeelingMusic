const db = require('../db');

const pageViewCounter = (req, res, next) => {
    const today = new Date().toISOString().split('T')[0];

    const query = `
        INSERT INTO page_views (fecha, contador)
        VALUES (?, 1)
        ON DUPLICATE KEY UPDATE contador = contador + 1
    `;

    db.query(query, [today], (err) => {
        if (err) {
            console.error('Error al actualizar contador de visitas:', err);
        }
    });

    next();
};

module.exports = pageViewCounter;