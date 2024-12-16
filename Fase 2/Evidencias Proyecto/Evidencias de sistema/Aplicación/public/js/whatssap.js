const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    webVersionCache: {
        type: "remote",
        remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
    },
    authStrategy: new LocalAuth()
});

// Respuestas predefinidas similar a tu chat-widget
const respuestasPredefinidas = {
    'saludo': {
        palabrasClave: ['hola', 'hi', 'hey', 'que tal'],
        respuesta: '¡Hola! Soy un asistente virtual. ¿En qué puedo ayudarte hoy?'
    },
    'servicios': {
        palabrasClave: ['servicios', 'que hacen', 'que ofrecen'],
        respuesta: 'Nuestros servicios incluyen:\n• Consultoría\n• Desarrollo web\n• Diseño digital'
    },
    'contacto': {
        palabrasClave: ['contacto', 'correo', 'teléfono'],
        respuesta: 'Puedes contactarnos:\nEmail: contacto@miempresa.com\nTeléfono: +56 9 1234 5678'
    },
    'default': {
        respuesta: 'Lo siento, no entendí tu mensaje. ¿Podrías ser más específico?'
    }
};

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Bot de WhatsApp conectado');
});

client.on('message', message => {
    const mensajeLower = message.body.toLowerCase();

    // Buscar respuesta en respuestas predefinidas
    let respuesta = respuestasPredefinidas.default.respuesta;
    
    for (const tipo in respuestasPredefinidas) {
        if (tipo !== 'default') {
            const palabrasClave = respuestasPredefinidas[tipo].palabrasClave;
            if (palabrasClave.some(palabra => mensajeLower.includes(palabra))) {
                respuesta = respuestasPredefinidas[tipo].respuesta;
                break;
            }
        }
    }

    // Enviar respuesta
    client.sendMessage(message.from, respuesta);
});

// Agregar función para enviar mensajes desde el chat-widget
function enviarMensajeDesdeChatWidget(mensaje, numero) {
    client.sendMessage(numero, mensaje);
}

// Exportar función para enviar mensajes desde el chat-widget
module.exports = {
    enviarMensajeDesdeChatWidget
};