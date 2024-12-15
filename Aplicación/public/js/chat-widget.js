(function() {
  // Agregamos el archivo CSS al head del documento
  document.head.insertAdjacentHTML('beforeend', '<link href="public/css/chat-widget.css" rel="stylesheet">');

  // Crear el botón flotante
  const botonFlotante = document.createElement('div');
  botonFlotante.id = 'chat-bubble';
  botonFlotante.className = 'chat-bubble';
  botonFlotante.innerHTML = `
    <img src="images/5733925.png" alt="Chat" />
  `;
  document.body.appendChild(botonFlotante);

  // Crear el contenedor principal del chat
  const contenedorChat = document.createElement('div');
  contenedorChat.id = 'chat-widget-container';
  contenedorChat.className = 'widget';
  document.body.appendChild(contenedorChat);
  
  // Inyectar el HTML del chat
  contenedorChat.innerHTML = `
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

  // Obtener referencias a los elementos del DOM
  const campoMensaje = document.getElementById('chat-input');
  const botonEnviar = document.getElementById('sendButton');
  const contenedorMensajes = document.getElementById('chat-messages');
  const ventanaChat = document.querySelector('.widget');

  // Objeto con las respuestas predefinidas
  const respuestasPredefinidas = {
    'horarios': {
      palabrasClave: ['horario', 'horarios', 'atencion', 'atención', 'abierto', 'abren', 'cierran', 'dias', 'días', 'cuando'],
      respuesta: 'Nuestros horarios de atención son:\n\n' +
                '📅 Lunes a Viernes: 09:00 - 22:00\n' +
                '📅 Sábados: 09:00 - 22:00\n' +
                '📅 Domingos: Cerrado\n\n' +
                'Para agendar tu clase, contáctanos por WhatsApp:\n' +
                '<div class="social-button whatsapp-button">' +
                '<a href="https://wa.me/56956425461?text=Hola,%20quisiera%20agendar%20una%20clase" target="_blank">Agendar Clase ⏰</a></div>'
    },
    'informacion_general': {
        palabrasClave: ['quisiera saber', 'me gustaría conocer', 'pueden darme', 'información', 'detalles', 'más datos', 'cuéntame'],
        respuesta: 'Con gusto te cuento sobre nuestra academia 🎵: \n\n' +
                  '• Somos una academia especializada en formación musical\n' +
                  '• Contamos con profesores certificados y con amplia experiencia\n' +
                  '• Metodología personalizada según tus objetivos\n\n' +
                  '¿Te gustaría conocer algo específico sobre nuestros servicios o programas? 🎸'
    },
    'precios_planes': {
        palabrasClave: ['cuánto cuesta', 'precio', 'valor', 'planes', 'costos', 'mensualidad', 'pago'],
        respuesta: 'Tenemos diferentes planes adaptados a tus necesidades:\n\n' +
                  '• Clases individuales personalizadas\n' +
                  '• Clases grupales (máximo 4 estudiantes)\n' +
                  '• Planes mensuales o por clase\n\n' +
                  'Para recibir información detallada sobre precios, te invito a contactarnos por WhatsApp:' +
                  '<div class="social-button whatsapp-button">' +
                  '<a href="https://wa.me/56956425461?text=Hola,%20me%20interesa%20conocer%20los%20precios%20de%20los%20planes" target="_blank">Consultar Precios 💰</a></div>'
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
    'hola': {
      palabrasClave: ['hola', 'saludos', 'como', 'estas',],
      respuesta: 'Hola, ¿en qué puedo ayudarte hoy?👋'
    },
    'ubicacion': {
      palabrasClave: ['donde', 'ubicacion', 'ubicación', 'direccion', 'dirección', 'lugar'],
      respuesta: 'Nos encontramos en San Miguel 594, Melipilla, Región Metropolitana.🗺️'
    },
    'contacto': {
      palabrasClave: ['telefono', 'teléfono', 'contacto', 'email', 'correo', 'contactar'],
      respuesta: `Puedes contactarnos directamente por WhatsApp:
      <div class="social-button whatsapp-button">
          <a href="https://wa.me/56956425461?text=Hola,%20necesito%20más%20información%20de%20la%20academia" target="_blank">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z"/>
              </svg>
              Contactar por WhatsApp
          </a>
      </div>

      <div class="social-button instagram-button">
          <a href="https://www.instagram.com/academia_feelingmusic/" target="_blank">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Síguenos en Instagram
          </a>
      </div>`
    },
    'tipo-clases': {
      palabrasClave: ['tipo', 'clases', 'grupales', 'individuales'],
      respuesta: 'Nuestras clases pueden ser grupales o individuales, adapt��ndonos a las necesidades de cada estudiante🎒.'
    },

    'informacion': {
      palabrasClave: ['informacion', 'quienes', 'que hacen'],
      respuesta: 'Claro, te puedo dar información sobre nosotros. Somos una academia de música, ' +
                'enfocada en enseñar aprender a tocar un instrumento, a cantar y adentrar a jóvenes y adultos al maravilloso mundo de la música ' +
                'con nuestros profesores expertos.🥳🎵👨‍🏫👩‍🏫'
    },
    'profesores': {
      palabrasClave: ['profesores', 'especializados', 'guitarra', 'piano', 'bateria', 'canto', 'cello', 'bajo'],
      respuesta: 'Nuestro equipo de profesores está compuesto por especialistas en guitarra, piano, batería, canto, cello, bajo y otros instrumentos.🎶🎵'
    },
    'instrumentos_disponibles': {
        palabrasClave: ['que instrumentos', 'cuales instrumentos', 'que puedo aprender', 'enseñan', 'guitarra', 'piano', 'bateria', 'batería', 'canto', 'violin', 'violín', 'bajo', 'teclado', 'saxofon', 'saxofón', 'flauta'],
        respuesta: '¡Genial! Me alegro que estés interesado en aprender música. Ofrecemos clases de:\n\n' +
                  '🎸 Guitarra (acústica y eléctrica)\n' +
                  '🎹 Piano y teclado\n' +
                  '🥁 Batería\n' +
                  '🎤 Canto\n' +
                  '🎻 Violín\n' +
                  '🎸 Bajo eléctrico\n' +
                  '🎺 Instrumentos de viento\n\n' +
                  'Para más información sobre horarios y precios, contáctanos por WhatsApp:\n' +
                  '<div class="social-button whatsapp-button">' +
                  '<a href="https://wa.me/56956425461?text=Hola,%20me%20interesa%20tomar%20clases%20de%20música" target="_blank">Consultar Disponibilidad 📅</a></div>'
    },
    'default': {
      respuesta: `Lo siento, no he entendido tu pregunta. Para más información, puedes contactarnos directamente por WhatsApp 
      <a href="https://wa.me/56956425461?text=Hola,%20necesito%20más%20información%20de%20la%20academia" target="_blank" class="whatsapp-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#25D366">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z"/>
          </svg>
          Contactar por WhatsApp
      </a>`
    },
    'hola': {
      palabrasClave: ['hola', 'saludos', 'como', 'estas',],
      respuesta: 'Hola, ¿en qué puedo ayudarte hoy?'
    },
    'sqlInjection': {
      palabrasClave: [
        'select', 'union', 'insert', 'delete', 'update', 'drop', 
        'alter', 'create', 'truncate', 'exec', 'or', 'and', '--', 
        ';', '#', 'sleep', 'benchmark', 'load_file', 'outfile', 
         'database()', "'", '"', '%', '=', 
        '1=1', 'union select', 'drop table'
      ],
      respuesta: 'Advertencia: Se ha detectado un posible intento de inyección SQL. intentalo para la proxima saludos👋 .'
    },
    'metodos_pago': {
        palabrasClave: ['como pago', 'metodo de pago', 'método de pago', 'formas de pago', 'pagar', 'transferencia', 'efectivo', 'debito', 'débito', 'credito', 'crédito'],
        respuesta: 'Nuestros métodos de pago aceptados son:\n\n' +
                  '💵 Efectivo\n' +
                  '🏦 Transferencia bancaria\n\n' +
                  'El pago debe realizarse antes de iniciar las clases del mes.\n' +
                  'Para más detalles sobre precios y planes, contáctanos:'
                  '<div class="social-button whatsapp-button">' +
                  '<a href="https://wa.me/56956425461?text=Hola,%20quisiera%20información%20sobre%20los%20métodos%20de%20pago" target="_blank">Consultar Precios y Pagos 💰</a></div>'
    },
  };

  // Función para procesar el mensaje y obtener la respuesta adecuada
  function obtenerRespuesta(mensaje) {
    mensaje = mensaje.toLowerCase();
    
    // Buscar en todas las respuestas predefinidas
    for (const tipo in respuestasPredefinidas) {
      if (tipo !== 'default') {
        const palabrasClave = respuestasPredefinidas[tipo].palabrasClave;
        // Verificar si el mensaje contiene alguna palabra clave
        if (palabrasClave.some(palabra => mensaje.includes(palabra))) {
          return respuestasPredefinidas[tipo].respuesta;
        }
      }
    }
    
    // Si no se encuentra coincidencia, devolver respuesta por defecto
    return respuestasPredefinidas.default.respuesta;
  }

  // Modificar la función de envío de mensaje
  function enviarMensaje(event) {
    event.preventDefault();
    const mensaje = campoMensaje.value.trim();
    
    if (mensaje) {
        // Mostrar mensaje del usuario
        enviarMensajeUsuario(mensaje);
        campoMensaje.value = '';
        
        // Mostrar animación de carga
        mostrarAnimacionCarga();
        
        // Obtener y mostrar respuesta del bot después de un delay
        setTimeout(() => {
            // Eliminar la animación de carga
            eliminarAnimacionCarga();
            
            // Mostrar la respuesta
            const respuesta = obtenerRespuesta(mensaje);
            responderBot(respuesta);
        }, 1500); // Delay de 1.5 segundos
    }
  }

  // Evento para enviar mensaje al hacer clic en el botón
  botonEnviar.addEventListener('click', enviarMensaje);

  // Evento para enviar mensaje al presionar Enter
  campoMensaje.addEventListener('keyup', function(evento) {
    if (evento.key === 'Enter') {
      botonEnviar.click();
    }
  });

  // Evento para cerrar/abrir el chat
  botonFlotante.addEventListener('click', function() {
    ventanaChat.style.display = 'block';
    campoMensaje.focus();
    
    // Verificar si el contenedor de mensajes está vacío antes de mostrar el mensaje de bienvenida
    if (contenedorMensajes.children.length === 0) {
        mostrarMensajeBienvenida();
    }
  });

  // Agregar función para mostrar mensaje de bienvenida
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

  // Función para desplazar el chat hacia abajo
  function scrollToBottom() {
    const chatContainer = document.querySelector('.chats');
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Función para mostrar el mensaje del usuario
  function enviarMensajeUsuario(mensaje) {
    const elementoMensaje = document.createElement('div');
    elementoMensaje.className = 'clearfix';
    elementoMensaje.innerHTML = `
        <div class="userAvatar">
            <img src="/images/userAvatar.png" alt="Usuario" />
        </div>
        <div class="userMsg">${mensaje}</div>
    `;
    contenedorMensajes.appendChild(elementoMensaje);
    scrollToBottom();
  }
  
  // Función para mostrar la respuesta del bot
  function responderBot(mensaje) {
    const elementoRespuesta = document.createElement('div');
    elementoRespuesta.className = 'clearfix';
    elementoRespuesta.innerHTML = `
      <div class="botAvatar">
        <img src="images/chat.png" alt="Bot" />
      </div>
      <div class="botMsg">
        <span class="message-icon">💬</span>
        ${mensaje}
      </div>
    `;
    contenedorMensajes.appendChild(elementoRespuesta);
    scrollToBottom();
  }

  // Modificar el evento para cerrar al hacer clic fuera
  document.addEventListener('click', function(event) {
    const widget = document.querySelector('.widget');
    const chatBubble = document.querySelector('.chat-bubble');
    
    // Si el clic no fue dentro del widget ni en el botón de chat
    if (!widget.contains(event.target) && !chatBubble.contains(event.target)) {
        widget.style.display = 'none';
        chatBubble.style.display = 'flex';
        
        // Limpiar el contenido del chat
        const contenedorMensajes = document.getElementById('chat-messages');
        contenedorMensajes.innerHTML = ''; // Limpia todos los mensajes
        
        // Limpiar el campo de entrada
        const campoMensaje = document.getElementById('chat-input');
        if (campoMensaje) {
            campoMensaje.value = '';
        }
    }
  });

  // Modificar la función limpiarChat para mantener consistencia
  function limpiarChat() {
    const contenedorMensajes = document.getElementById('chat-messages');
    contenedorMensajes.innerHTML = '';
    
    const campoMensaje = document.getElementById('chat-input');
    if (campoMensaje) {
        campoMensaje.value = '';
    }
    
    // Mostrar nuevamente el mensaje de bienvenida después de limpiar
    mostrarMensajeBienvenida();
  }

  // Evitar que los clics dentro del widget cierren el chat
  widget.addEventListener('click', function(event) {
    event.stopPropagation();
  });

  // Función para mostrar la animación de carga
  function mostrarAnimacionCarga() {
    const elementoCarga = document.createElement('div');
    elementoCarga.className = 'clearfix';
    elementoCarga.id = 'loadingAnimation';
    elementoCarga.innerHTML = `
        <div class="botAvatar">
            <img src="/images/chat.png" alt="Bot" />
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

  // Función para eliminar la animación de carga
  function eliminarAnimacionCarga() {
    const animacion = document.getElementById('loadingAnimation');
    if (animacion) {
        animacion.remove();
    }
  }
})();
