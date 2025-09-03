document.addEventListener('DOMContentLoaded', function() {

    // --- VARIABLES DE CONFIGURACIÓN ---
    const WA_PHONE = '56956425461';
    const INSTAGRAM_URL = 'https://www.instagram.com/academia_feelingmusic/';
    const WA_LINK_BASE = `https://wa.me/${WA_PHONE}`;
    const CHAT_IMAGE_SRC = "/images/5733925.png";
    const USER_AVATAR_SRC = "/images/userAvatar.png";
    const BOT_AVATAR_SRC = "/images/chat.png";

    // --- OBJETO DE RESPUESTAS CON LÓGICA DE PRIORIDAD ---
    const respuestasPredefinidas = {
        // Orden de prioridad: de lo más específico a lo más general.
        'sqlInjection': {
            palabrasClave: ['select', 'union', 'insert', 'delete', 'update', 'drop', 'alter', 'create', 'truncate', 'exec', 'or', 'and', '--', ';', '#', 'sleep', 'benchmark', 'load_file', 'outfile', 'database()', "'", '"', '%', '=', '1=1', 'union select', 'drop table'],
            respuesta: `Lo siento, no he entendido tu pregunta. Para más información, puedes contactarnos directamente por WhatsApp 
            <a href="${WA_LINK_BASE}?text=Hola,%20necesito%20más%20información%20de%20la%20academia" target="_blank" class="whatsapp-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z"/>
                </svg>
                Contactar por WhatsApp
            </a>`
        },
        'instrumentos_disponibles': {
            palabrasClave: ['que instrumentos', 'cuales instrumentos', 'que puedo aprender', 'enseñan', 'guitarra', 'piano', 'bateria', 'canto', 'violin', 'bajo', 'teclado', 'saxofon', 'flauta'],
            respuesta: '¡Genial! Me alegro que estés interesado en aprender música. Ofrecemos clases de:\n\n' +
                '🎸 Guitarra (acústica y eléctrica)\n' +
                '🎹 Piano y teclado\n' +
                '🥁 Batería\n' +
                '🎤 Canto\n' +
                '🎻 Violín\n' +
                '🎸 Bajo eléctrico\n' +
                '🎺 Instrumentos de viento\n\n' +
                `Para más información sobre horarios y precios, contáctanos por WhatsApp:\n` +
                crearBotonWhatsApp('Hola, me interesa tomar clases de música', 'Consultar Disponibilidad 📅')
        },
        'precios_planes': {
            palabrasClave: ['cuánto cuesta', 'precio', 'valor', 'planes', 'costos', 'mensualidad', 'pago'],
            respuesta: 'Tenemos diferentes planes adaptados a tus necesidades:\n\n' +
                '• Clases individuales personalizadas\n' +
                '• Clases grupales (máximo 4 estudiantes)\n' +
                '• Planes mensuales o por clase\n\n' +
                `Para recibir información detallada sobre precios, te invito a contactarnos por WhatsApp:\n` +
                crearBotonWhatsApp('Hola, me interesa conocer los precios de los planes', 'Consultar Precios 💰')
        },
        'metodos_pago': {
            palabrasClave: ['como pago', 'metodo de pago', 'formas de pago', 'pagar', 'transferencia', 'efectivo', 'debito', 'credito'],
            respuesta: 'Nuestros métodos de pago aceptados son:\n\n' +
                '💵 Efectivo\n' +
                '🏦 Transferencia bancaria\n\n' +
                'El pago debe realizarse antes de iniciar las clases del mes.\n' +
                `Para más detalles sobre precios y planes, contáctanos:\n` +
                crearBotonWhatsApp('Hola, quisiera información sobre los métodos de pago', 'Consultar Precios y Pagos 💰')
        },
        'metodologia_aprendizaje': {
            palabrasClave: ['como enseñan', 'metodologia', 'aprendizaje', 'metodo', 'forma de enseñar', 'sistema'],
            respuesta: 'Nuestra metodología de enseñanza se basa en 4 pilares fundamentales:\n\n' +
                '1. Diagnóstico inicial personalizado 📋\n' +
                '2. Plan de estudio adaptado a tus objetivos 🎯\n' +
                '3. Práctica guiada con retroalimentación constante 🎼\n' +
                '4. Evaluaciones periódicas de progreso 📈\n\n' +
                'Además, complementamos las clases con material instrumental.'
        },
        'tipo-clases': {
            palabrasClave: ['tipo', 'clases', 'grupales', 'individuales'],
            respuesta: 'Nuestras clases pueden ser grupales o individuales, adaptándonos a las necesidades de cada estudiante🎒.'
        },
        'profesores': {
            palabrasClave: ['profesores', 'especializados'],
            respuesta: 'Nuestro equipo de profesores está compuesto por especialistas en guitarra, piano, batería, canto, cello, bajo y otros instrumentos.🎶🎵'
        },
        'horarios': {
            palabrasClave: ['horario', 'atencion', 'abierto', 'cierran', 'dias', 'cuando'],
            respuesta: 'Nuestros horarios de atención son:\n\n' +
                '📅 Lunes a Viernes: 09:00 - 22:00\n' +
                '📅 Sábados: 09:00 - 22:00\n' +
                '📅 Domingos: Cerrado\n\n' +
                `Para agendar tu clase, contáctanos por WhatsApp:\n` +
                crearBotonWhatsApp('Hola, quisiera agendar una clase', 'Agendar Clase ⏰')
        },
        'ubicacion': {
            palabrasClave: ['donde', 'ubicacion', 'ubicación', 'direccion', 'dirección', 'direcion', 'lugar'],
            respuesta: 'Nos encontramos en San Miguel 594, Melipilla, Región Metropolitana.🗺️'
        },
        'contacto': {
            palabrasClave: ['telefono', 'teléfono', 'contacto', 'email', 'correo', 'contactar'],
            respuesta: `Puedes contactarnos directamente por WhatsApp:
                ${crearBotonWhatsApp('Hola, necesito más información de la academia', 'Contactar por WhatsApp')}
                ${crearBotonInstagram('Síguenos en Instagram')}
            `
        },
        'informacion_general': {
            palabrasClave: ['quisiera saber', 'me gustaría conocer', 'pueden darme', 'información', 'detalles', 'más datos', 'cuéntame', 'quienes', 'que hacen'],
            respuesta: 'Claro, te puedo dar información sobre nosotros. Somos una academia de música, enfocada en enseñar a tocar un instrumento, a cantar y adentrar a jóvenes y adultos al maravilloso mundo de la música con nuestros profesores expertos.🥳🎵👨‍🏫👩‍🏫'
        },
        'hola': {
            palabrasClave: ['hola', 'saludos', 'como', 'estas',],
            respuesta: 'Hola, ¿en qué puedo ayudarte hoy?👋'
        },
        'default': {
            respuesta: `Lo siento, no he entendido tu pregunta. Para más información, puedes contactarnos directamente por WhatsApp 
            <a href="${WA_LINK_BASE}?text=Hola,%20necesito%20más%20información%20de%20la%20academia" target="_blank" class="whatsapp-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z"/>
                </svg>
                Contactar por WhatsApp
            </a>`
        },
        'whatsapp_mal_escrito': {
            palabrasClave: ['wasa', 'wasap', 'watsap', 'wasapp', 'whatasap', 'wasat'],
            respuesta: 'Sí, puedes escribirnos a nuestro WhatsApp para cualquier consulta o para agendar una clase. ¡Estaremos felices de ayudarte! 😊' +
                crearBotonWhatsApp('Hola, te escribo desde la página web', 'Escribir por WhatsApp 📱')
        },
    };

    // --- CÓDIGO HTML Y CSS DINÁMICO ---
    const chatWidgetHTML = `
        <div class="chat_header">
            <span class="chat_header_title">Chat Asistente</span>
        </div>
        <div class="chats">
            <div id="chat-messages"></div>
        </div>
        <div class="keypad">
            <input type="text" id="chat-input" class="usrInput" placeholder="Escribe tu mensaje...">
            <div id="sendButton">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
            </div>
        </div>
    `;

    // Crear el botón flotante
    const botonFlotante = document.createElement('div');
    botonFlotante.id = 'chat-bubble';
    botonFlotante.className = 'chat-bubble';
    botonFlotante.innerHTML = `<img src="${CHAT_IMAGE_SRC}" alt="Chat" />`;
    document.body.appendChild(botonFlotante);

    // Crear el contenedor principal del chat
    const contenedorChat = document.createElement('div');
    contenedorChat.id = 'chat-widget-container';
    contenedorChat.className = 'widget';
    contenedorChat.innerHTML = chatWidgetHTML;
    document.body.appendChild(contenedorChat);

    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    const campoMensaje = document.getElementById('chat-input');
    const botonEnviar = document.getElementById('sendButton');
    const contenedorMensajes = document.getElementById('chat-messages');
    const ventanaChat = document.querySelector('.widget');

    // --- FUNCIONES UTILITARIAS ---

    function crearBotonWhatsApp(textoURL, textoBoton) {
        return `<div class="social-button whatsapp-button">
                    <a href="${WA_LINK_BASE}?text=${encodeURIComponent(textoURL)}" target="_blank">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z"/>
                        </svg>
                        ${textoBoton}
                    </a>
                </div>`;
    }

    function crearBotonInstagram(textoBoton) {
        return `<div class="social-button instagram-button">
                    <a href="${INSTAGRAM_URL}" target="_blank">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        ${textoBoton}
                    </a>
                </div>`;
    }

    function obtenerRespuesta(mensaje) {
        mensaje = mensaje.toLowerCase().trim();
        const ordenPrioridad = Object.keys(respuestasPredefinidas);

        for (const tipo of ordenPrioridad) {
            if (tipo === 'default') continue; // Ignorar el caso por defecto en el bucle

            const palabrasClave = respuestasPredefinidas[tipo].palabrasClave;
            if (palabrasClave.some(palabra => mensaje.includes(palabra))) {
                return respuestasPredefinidas[tipo].respuesta;
            }
        }
        return respuestasPredefinidas.default.respuesta;
    }

    function enviarMensajeUsuario(mensaje) {
        const elementoMensaje = document.createElement('div');
        elementoMensaje.className = 'clearfix';
        elementoMensaje.innerHTML = `
            <div class="userAvatar">
                <img src="${USER_AVATAR_SRC}" alt="Usuario" />
            </div>
            <div class="userMsg">${mensaje}</div>
        `;
        contenedorMensajes.appendChild(elementoMensaje);
        scrollToBottom();
    }
    
    function responderBot(mensaje) {
        const elementoRespuesta = document.createElement('div');
        elementoRespuesta.className = 'clearfix';
        elementoRespuesta.innerHTML = `
            <div class="botAvatar">
                <img src="${BOT_AVATAR_SRC}" alt="Bot" />
            </div>
            <div class="botMsg">
                <span class="message-icon">💬</span>
                ${mensaje}
            </div>
        `;
        contenedorMensajes.appendChild(elementoRespuesta);
        scrollToBottom();
    }

    function mostrarAnimacionCarga() {
        const elementoCarga = document.createElement('div');
        elementoCarga.className = 'clearfix';
        elementoCarga.id = 'loadingAnimation';
        elementoCarga.innerHTML = `
            <div class="botAvatar">
                <img src="${BOT_AVATAR_SRC}" alt="Bot" />
            </div>
            <div class="dots-container">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `;
        contenedorMensajes.appendChild(elementoCarga);
        scrollToBottom();
    }

    function eliminarAnimacionCarga() {
        const animacion = document.getElementById('loadingAnimation');
        if (animacion) {
            animacion.remove();
        }
    }

    function scrollToBottom() {
        const chatContainer = document.querySelector('.chats');
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function mostrarMensajeBienvenida() {
        const mensajeBienvenida = `¡Bienvenido! 👋 
¿En qué puedo ayudarte hoy? Puedes preguntarme sobre:
• 📍 Ubicación o dirección
• 📞 Información de contacto
• 🕒 Horarios de atención
• 💼 Nuestros servicios
¡Escribe tu consulta y con gusto te ayudaré!`;
        responderBot(mensajeBienvenida);
        scrollToBottom();
    }

    // --- MANEJO DE EVENTOS ---
    
    function enviarMensaje(event) {
        event.preventDefault();
        const mensaje = campoMensaje.value.trim();
        
        if (mensaje) {
            enviarMensajeUsuario(mensaje);
            campoMensaje.value = '';
            
            mostrarAnimacionCarga();
            
            setTimeout(() => {
                eliminarAnimacionCarga();
                const respuesta = obtenerRespuesta(mensaje);
                responderBot(respuesta);
            }, 1500);
        }
    }

    botonEnviar.addEventListener('click', enviarMensaje);

    campoMensaje.addEventListener('keyup', function(evento) {
        if (evento.key === 'Enter') {
            botonEnviar.click();
        }
    });

    botonFlotante.addEventListener('click', function() {
        ventanaChat.style.display = 'block';
        campoMensaje.focus();
        if (contenedorMensajes.children.length === 0) {
            mostrarMensajeBienvenida();
        }
    });

    document.addEventListener('click', function(event) {
        const widget = document.querySelector('.widget');
        const chatBubble = document.querySelector('.chat-bubble');
        
        if (!widget.contains(event.target) && !chatBubble.contains(event.target)) {
            widget.style.display = 'none';
            chatBubble.style.display = 'flex';
            contenedorMensajes.innerHTML = '';
            campoMensaje.value = '';
        }
    });

    ventanaChat.addEventListener('click', function(event) {
        event.stopPropagation();
    });
});