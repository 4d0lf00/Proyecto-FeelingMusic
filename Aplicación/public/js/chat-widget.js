(function() {
  // Agregamos el archivo CSS al head del documento
  document.head.insertAdjacentHTML('beforeend', '<link href="public/css/chat-widget.css" rel="stylesheet">');

  // Crear el botón flotante
  const botonFlotante = document.createElement('div');
  botonFlotante.id = 'chat-bubble';
  botonFlotante.className = 'chat-bubble';
  botonFlotante.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
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
      palabrasClave: ['horario', 'horarios', 'atencion', 'atención', 'abierto', 'abren', 'cierran'],
      respuesta: 'Nuestro horario de atención es de 08:00 a 19:00 horas, de lunes a viernes.'
    },
    'ubicacion': {
      palabrasClave: ['donde', 'ubicacion', 'ubicación', 'direccion', 'dirección', 'lugar'],
      respuesta: 'Nos encontramos en [Tu dirección aquí].'
    },
    'contacto': {
      palabrasClave: ['telefono', 'teléfono', 'contacto', 'email', 'correo', 'contactar'],
      respuesta: `puedes contactarnos directamente por WhatsApp al:  
      <a href="https://wa.me/56934884214?text=Hola,%20necesito%20más%20información" target="_blank" class="whatsapp-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#25D366">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z"/>
          </svg>
          Contactar por WhatsApp
      </a>
      o a nuestro correo: [tu correo aquí]` 
    },
    'servicios': {
      palabrasClave: ['servicios', 'ofrecen', 'tienen', 'productos'],
      respuesta: 'Ofrecemos los siguientes servicios: [Lista de tus servicios]'
    },
    'default': {
      respuesta: `Lo siento, no he entendido tu pregunta. Para más información, puedes contactarnos directamente por WhatsApp 
      <a href="https://wa.me/56934884214?text=Hola,%20necesito%20más%20información" target="_blank" class="whatsapp-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#25D366">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z"/>
          </svg>
          Contactar por WhatsApp
      </a>`
    }
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

  // Modificar la función de envío de mensaje para usar las respuestas predefinidas
  function enviarMensaje(event) {
    event.preventDefault();
    const mensaje = campoMensaje.value.trim();
    
    if (mensaje) {
      // Mostrar mensaje del usuario
      enviarMensajeUsuario(mensaje);
      campoMensaje.value = '';
      
      // Obtener y mostrar respuesta del bot
      setTimeout(() => {
        const respuesta = obtenerRespuesta(mensaje);
        responderBot(respuesta);
      }, 500); // Pequeño delay para simular procesamiento
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
  });

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
    contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
  }
  
  // Función para mostrar la respuesta del bot
  function responderBot(mensaje) {
    const elementoRespuesta = document.createElement('div');
    elementoRespuesta.className = 'clearfix';
    elementoRespuesta.innerHTML = `
      <div class="botAvatar">
        <img src="/images/botAvatar.png" alt="Bot" />
      </div>
      <div class="botMsg">
        <span class="message-icon">💬</span>
        ${mensaje}
      </div>
    `;
    contenedorMensajes.appendChild(elementoRespuesta);
    contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
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

  // También podemos agregar la misma funcionalidad cuando se cierra con el botón de WhatsApp
  function limpiarChat() {
    const contenedorMensajes = document.getElementById('chat-messages');
    contenedorMensajes.innerHTML = '';
    
    const campoMensaje = document.getElementById('chat-input');
    if (campoMensaje) {
        campoMensaje.value = '';
    }
  }

  // Evitar que los clics dentro del widget cierren el chat
  widget.addEventListener('click', function(event) {
    event.stopPropagation();
  });
})();
