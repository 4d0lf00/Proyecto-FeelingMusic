require('dotenv').config();
const db = require('./db');
const nodemailer = require('nodemailer');

// Configuración del transportador de correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ----------- NUEVAS FUNCIONES Y/O MODIFICADAS PARA HORARIOS GENERALES Y RECUPERACIONES -----------

async function obtenerHorarios(diaSemanaSeleccionadoView) {
    // diaSemanaSeleccionadoView es 'Lunes', 'Martes', etc.
    const query = `
        SELECT 
            c.id as clase_id_para_ejs, 
            c.tipo as clase_tipo,
            c.fecha as fecha_clase,
            h.id as horario_slot_id_de_tabla_horarios, 
            h.dia as dia_semana_slot,
            h.hora_inicio as hora_inicio_slot, 
            h.hora_fin as hora_fin_slot,
            s.nombre as sala_nombre, 
            p.id as profesor_id,
            p.nombre as profesor_nombre, 
            p.apellido as profesor_apellido, 
            p.color as profesor_color,
            c.banda_id,
            b.nombre as banda_nombre,
            (
                SELECT GROUP_CONCAT( DISTINCT
                    JSON_OBJECT(
                        'id', al.id, 
                        'nombre', al.nombre, 
                        'apellido', al.apellido, 
                        'modalidad_tipo', mod_al.tipo
                    )
                 SEPARATOR ', ')
                 FROM clases cl_inner_alumnos
                 JOIN alumno al ON cl_inner_alumnos.alumno_id = al.id
                 JOIN modalidades mod_al ON cl_inner_alumnos.modalidad_id = mod_al.id
                 WHERE cl_inner_alumnos.id = c.id AND cl_inner_alumnos.banda_id IS NULL
            ) as alumnos_detalles_json_array_str
        FROM clases c
        JOIN horarios h ON c.horario_id = h.id
        LEFT JOIN profesor p ON c.profesor_id = p.id
        LEFT JOIN sala_horario sh ON c.id = sh.clase_id
        LEFT JOIN salas s ON sh.sala_id = s.id
        LEFT JOIN bandas b ON c.banda_id = b.id
        WHERE 
            c.estado = 'activo' 
            AND h.dia = ?
        ORDER BY h.hora_inicio, s.nombre, c.fecha;
    `;

    try {
        const [resultados] = await db.query(query, [diaSemanaSeleccionadoView]);
        
        const eventosProcesados = resultados.map(evento => {
            let alumnosDetalles = [];
            if (evento.alumnos_detalles_json_array_str) {
                try {
                    // El GROUP_CONCAT puede devolver un solo objeto si solo hay un alumno,
                    // lo que no sería un array JSON válido directamente.
                    // Lo envolvemos en [] si no empieza con [ y termina con ]
                    let jsonStr = evento.alumnos_detalles_json_array_str;
                    if (jsonStr && !jsonStr.startsWith('[')) {
                        jsonStr = `[${jsonStr}]`;
                    }
                    alumnosDetalles = JSON.parse(jsonStr);
                    // Asegurar que siempre sea un array
                    if (!Array.isArray(alumnosDetalles) && typeof alumnosDetalles === 'object' && alumnosDetalles !== null) {
                        alumnosDetalles = [alumnosDetalles];
                    }
                } catch (e) {
                    console.error(`Error al parsear JSON para alumnos_detalles. String: ${evento.alumnos_detalles_json_array_str}`, e);
                }
            }

            return {
                horario_id: evento.clase_id_para_ejs, // Este es c.id
                dia: evento.dia_semana_slot,
                hora_inicio: evento.hora_inicio_slot,
                hora_fin: evento.hora_fin_slot,
                sala_nombre: evento.sala_nombre,
                profesor_id: evento.profesor_id,
                profesor_nombre: evento.profesor_nombre,
                profesor_apellido: evento.profesor_apellido,
                profesor_color: evento.profesor_color,
                alumnos_detalles: evento.banda_id ? [] : alumnosDetalles, // Vacío si es banda
                es_recuperacion: evento.clase_tipo === 'recuperacion',
                fecha_efectiva_recuperacion: evento.clase_tipo === 'recuperacion' && evento.fecha_clase ? evento.fecha_clase.toISOString().split('T')[0] : null,
                
                es_banda: !!evento.banda_id, // Booleano que indica si es una banda
                banda_id: evento.banda_id,
                banda_nombre: evento.banda_nombre,

                clase_id_original_db: evento.clase_id_para_ejs, 
                clase_tipo_db: evento.clase_tipo, // 'normal', 'recuperacion', 'banda'
                fecha_clase_db: evento.fecha_clase ? evento.fecha_clase.toISOString().split('T')[0] : null,
                horario_slot_id_db: evento.horario_slot_id_de_tabla_horarios,
            };
        });
        return eventosProcesados;
    } catch (error) {
        console.error('Error en obtenerHorarios (con bandas):', error);
        throw error;
    }
}


async function crearClase(datosClase) {
    console.log('[QUERIES DEBUG crearClase] Entrando a crearClase con datosClase:', JSON.stringify(datosClase, null, 2));

    const {
        tipo, // 'normal', 'recuperacion', 'banda'
        fechaClase, 
        diaOriginalSlot, 
        horaInicioOriginalSlot, 
        salaNombreOriginalSlot,
        profesorId,
        instrumentoId, // Usualmente null para bandas
        alumnosData, // Array de {id, modalidad}, solo si tipo no es 'banda'
        bandaId, // Solo si tipo es 'banda'
    } = datosClase;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [salaRows] = await connection.query('SELECT id FROM salas WHERE nombre = ? LIMIT 1', [salaNombreOriginalSlot]);
        if (salaRows.length === 0) {
            throw new Error(`Sala '${salaNombreOriginalSlot}' no encontrada.`);
        }
        const salaIdParaEstaClase = salaRows[0].id;

        const [h, m] = horaInicioOriginalSlot.split(':').map(Number);
        const finDate = new Date(); 
        finDate.setHours(h + 1, m, 0); 
        const horaFinCalculada = `${String(finDate.getHours()).padStart(2, '0')}:${String(finDate.getMinutes()).padStart(2, '0')}:00`;

        let horarioSlotId;
        const [existingHorarioSlotRows] = await connection.query(
            // Un slot en 'horarios' es por profesor, día y hora. La sala se vincula en sala_horario.
            'SELECT id FROM horarios WHERE dia = ? AND hora_inicio = ? AND profesor_id = ? LIMIT 1',
            [diaOriginalSlot, horaInicioOriginalSlot, profesorId]
        );

        if (existingHorarioSlotRows.length > 0) {
            horarioSlotId = existingHorarioSlotRows[0].id;
        } else {
            const [resultadoHorario] = await connection.query(
                // Un slot en 'horarios' es por profesor, día y hora. La sala se vincula en sala_horario.
                'INSERT INTO horarios (dia, mes, annio, hora_inicio, hora_fin, estado, profesor_id) VALUES (?, MONTH(CURDATE()), YEAR(CURDATE()), ?, ?, \'Ocupado\', ?)',
                [diaOriginalSlot, horaInicioOriginalSlot, horaFinCalculada, profesorId]
            );
            horarioSlotId = resultadoHorario.insertId;
            await connection.query('INSERT INTO profesor_horario (profesor_id, horario_id) VALUES (?, ?)', [profesorId, horarioSlotId]);
        }
        
        const idsClasesCreadas = [];

        if (tipo === 'banda') {
            if (!bandaId) throw new Error('Se requiere bandaId para el tipo "banda".');
            const [bandaInfoRows] = await connection.query('SELECT nombre FROM bandas WHERE id = ?', [bandaId]);
            if (bandaInfoRows.length === 0) throw new Error(`Banda con ID ${bandaId} no encontrada.`);
            const nombreClaseCompleto = `Ensayo Banda: ${bandaInfoRows[0].nombre}`;

            const [resultClase] = await connection.query(
                `INSERT INTO clases (nombre, tipo, fecha, horario_id, profesor_id, instrumento_id, alumno_id, modalidad_id, banda_id, estado)
                 VALUES (?, 'banda', ?, ?, ?, NULL, NULL, NULL, ?, 'activo')`,
                [nombreClaseCompleto, (fechaClase || new Date().toISOString().split('T')[0]), horarioSlotId, profesorId, bandaId]
            );
            const nuevaClaseId = resultClase.insertId;
            idsClasesCreadas.push(nuevaClaseId);
            await connection.query(
                'INSERT INTO sala_horario (sala_id, horario_id, profesor_id, clase_id) VALUES (?, ?, ?, ?)',
                [salaIdParaEstaClase, horarioSlotId, profesorId, nuevaClaseId]
            );

        } else { // 'normal' o 'recuperacion'
            if (!alumnosData || alumnosData.length === 0) {
                throw new Error('Se requieren datos de alumnos para clases normales o de recuperación.');
            }
        const nombreClaseBase = tipo === 'recuperacion' ? 'Recuperación' : 'Clase';
        const queryInsertClase = `
                INSERT INTO clases (nombre, tipo, fecha, horario_id, profesor_id, instrumento_id, alumno_id, modalidad_id, banda_id, estado)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'activo')`; 
        
        for (const alumno of alumnosData) {
            let modalidadId;
            const alumnoIdParaModalidad = (alumno.modalidad === 'individual') ? alumno.id : null;
            const [existingModalidad] = await connection.query(
                'SELECT id FROM modalidades WHERE profesor_id = ? AND tipo = ? AND (alumno_id = ? OR (? IS NULL AND alumno_id IS NULL)) LIMIT 1',
                [profesorId, alumno.modalidad, alumnoIdParaModalidad, alumnoIdParaModalidad]
            );

            if (existingModalidad.length > 0) {
                modalidadId = existingModalidad[0].id;
            } else {
                const [newModalidadResult] = await connection.query(
                    'INSERT INTO modalidades (profesor_id, alumno_id, tipo) VALUES (?, ?, ?)',
                    [profesorId, alumnoIdParaModalidad, alumno.modalidad]
                );
                modalidadId = newModalidadResult.insertId;
            }

            const [infoAlumno] = await connection.query('SELECT nombre, apellido FROM alumno WHERE id = ?', [alumno.id]);
            const nombreClaseCompleto = `${nombreClaseBase} - ${infoAlumno[0].nombre} ${infoAlumno[0].apellido}`;
                const fechaParaClase = (tipo === 'recuperacion') ? fechaClase : (fechaClase || new Date().toISOString().split('T')[0]);


            const [resultClase] = await connection.query(queryInsertClase, [
                    nombreClaseCompleto, tipo, fechaParaClase, horarioSlotId, profesorId, instrumentoId, alumno.id, modalidadId
            ]);
            const nuevaClaseId = resultClase.insertId;
            idsClasesCreadas.push(nuevaClaseId);

            await connection.query(
                'INSERT INTO sala_horario (sala_id, horario_id, profesor_id, clase_id) VALUES (?, ?, ?, ?)',
                [salaIdParaEstaClase, horarioSlotId, profesorId, nuevaClaseId]
            );
            }
        }

        await connection.commit();
        
        const primeraClaseIdCreada = idsClasesCreadas[0];
        // La función obtenerDetallesClase se usa para devolver el estado completo del slot actualizado.
        // Necesitamos el ID de una de las clases en el slot, la primera creada servirá.
        const detallesPostCreacion = await obtenerDetallesClase(primeraClaseIdCreada, connection);

        return { success: true, message: `Clase programada exitosamente.`, detalles: detallesPostCreacion };

    } catch (error) {
        await connection.rollback();
        console.error('Error en crearClase (con bandas):', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function obtenerDetallesClase(claseIdReferencia, existingConnection = null) {
    const conn = existingConnection || await db.getConnection();
    try {
        // Obtener el horario_id y sala_id a partir de la claseIdReferencia
        // Esto define el "slot"
        const [referenciaRows] = await conn.query(
            `SELECT c.horario_id, sh.sala_id
             FROM clases c
             JOIN sala_horario sh ON c.id = sh.clase_id
             WHERE c.id = ? AND c.estado = 'activo'`, // Asegurarse que la clase de referencia esté activa
            [claseIdReferencia]
        );

        if (referenciaRows.length === 0) {
            console.log(`[obtenerDetallesClase] No se encontró clase activa de referencia con ID ${claseIdReferencia}.`);
            return null; 
        }
        const slotContext = referenciaRows[0];
        const horarioIdDelSlot = slotContext.horario_id;
        const salaIdDelSlot = slotContext.sala_id;

        // Ahora obtener todas las clases activas en ese slot (horario_id, sala_id)
    const query = `
        SELECT 
                c.id as clase_id_db,
                c.tipo as clase_tipo_db,
                c.fecha as fecha_clase_db,
                c.instrumento_id,
                c.banda_id,      -- Añadido para banda
                b.nombre as banda_nombre, -- Añadido para banda
                h.id as horario_slot_id_db, -- ID de la tabla 'horarios'
                h.dia as dia_semana_slot,
            h.hora_inicio as hora_inicio_slot, 
            h.hora_fin as hora_fin_slot,
            s.nombre as sala_nombre,
            p.id as profesor_id_db,
            p.nombre as profesor_nombre, 
            p.apellido as profesor_apellido,
            p.color as profesor_color,
                a.id as alumno_id_db,
            a.nombre as alumno_nombre,
            a.apellido as alumno_apellido,
                m.id as modalidad_id_db,
                m.tipo as modalidad_tipo_alumno_db
        FROM clases c
        JOIN horarios h ON c.horario_id = h.id
            LEFT JOIN alumno a ON c.alumno_id = a.id AND c.banda_id IS NULL
            LEFT JOIN modalidades m ON c.modalidad_id = m.id AND c.banda_id IS NULL
            LEFT JOIN sala_horario sh ON c.id = sh.clase_id
        LEFT JOIN salas s ON sh.sala_id = s.id
        LEFT JOIN profesor p ON c.profesor_id = p.id
            LEFT JOIN bandas b ON c.banda_id = b.id -- Añadido para banda
            WHERE c.horario_id = ? AND sh.sala_id = ? AND c.estado = 'activo';`;
            
        const [results] = await conn.query(query, [horarioIdDelSlot, salaIdDelSlot]);

        if (results.length === 0) {
            console.log(`[obtenerDetallesClase] No se encontraron clases activas en slot horario_id ${horarioIdDelSlot}, sala_id ${salaIdDelSlot}.`);
            // Intentar obtener info básica del slot si está vacío pero el horario/sala existe
            const [slotInfoSoloRows] = await conn.query(
                `SELECT h.dia as dia_semana_slot, h.hora_inicio as hora_inicio_slot, s.nombre as sala_nombre, p.id as profesor_id_db
                 FROM horarios h 
                 JOIN sala_horario sh_empty ON h.id = sh_empty.horario_id AND sh_empty.horario_id = ?
                 JOIN salas s ON sh_empty.sala_id = s.id AND sh_empty.sala_id = ?
                 JOIN profesor p ON h.profesor_id = p.id
                 LIMIT 1`,
                [horarioIdDelSlot, salaIdDelSlot]
            );
            if (slotInfoSoloRows.length > 0) {
                const slotInfoSolo = slotInfoSoloRows[0];
                 return {
                    claseIdOriginalDeReferencia: claseIdReferencia, // ID de c.id que se usó para encontrar el slot
                    horarioIdTablaHorarios: horarioIdDelSlot, // ID de h.id
                    salaIdTablaSalas: salaIdDelSlot, // ID de s.id
                    dia: slotInfoSolo.dia_semana_slot,
                    horaInicio: slotInfoSolo.hora_inicio_slot,
                    salaNombre: slotInfoSolo.sala_nombre,
                    profesorId: slotInfoSolo.profesor_id_db,
                    es_banda_slot: false, // Asumir normal si no hay clases para determinarlo
                    banda_id_slot: null,
                    banda_nombre_slot: null,
                    es_recuperacion_slot: false, 
                    fecha_efectiva_recuperacion_slot: null,
                    instrumento_id_slot: null, 
                    alumnos: [], // Slot vacío
                    _rawClasesDelSlot: []
                };
            } else {
                 console.warn("[obtenerDetallesClase] No se pudo obtener ni la información básica del slot vacío.");
                return null; 
            }
        }

        // Si hay resultados, procesarlos.
        // Un slot puede tener una banda (una sola entrada en 'clases' para ese slot)
        // o múltiples alumnos (múltiples entradas en 'clases' para ese slot, una por alumno).
        const primeraClaseDelSlot = results[0];
        
        const esBandaSlot = !!primeraClaseDelSlot.banda_id;
        const alumnosDelSlot = [];

        if (!esBandaSlot) {
            results.forEach(raw => {
                if (raw.alumno_id_db) { // Solo si hay alumno
                    alumnosDelSlot.push({
                id: raw.alumno_id_db,
                nombre: raw.alumno_nombre,
                apellido: raw.alumno_apellido,
                        modalidad: raw.modalidad_tipo_alumno_db,
                        _claseIdOriginalAlumno: raw.clase_id_db, // c.id de este alumno en el slot
                        _esRecuperacionClaseAlumno: raw.clase_tipo_db === 'recuperacion',
                        _fechaRecuperacionClaseAlumno: raw.clase_tipo_db === 'recuperacion' && raw.fecha_clase_db 
                                                    ? raw.fecha_clase_db.toISOString().split('T')[0] 
                                                    : null,
                    });
                }
            });
        }

        const detallesComunesDelSlot = {
            claseIdOriginalDeReferencia: claseIdReferencia, // c.id que se usó para encontrar el slot
            horarioIdTablaHorarios: horarioIdDelSlot, // h.id
            salaIdTablaSalas: salaIdDelSlot,     // s.id
            dia: primeraClaseDelSlot.dia_semana_slot,
            horaInicio: primeraClaseDelSlot.hora_inicio_slot, // Formato HH:MM:SS
            salaNombre: primeraClaseDelSlot.sala_nombre,
            profesorId: primeraClaseDelSlot.profesor_id_db,
            
            es_banda_slot: esBandaSlot,
            banda_id_slot: esBandaSlot ? primeraClaseDelSlot.banda_id : null,
            banda_nombre_slot: esBandaSlot ? primeraClaseDelSlot.banda_nombre : null,
            
            // Si es banda, es_recuperacion_slot es false. Recuperación solo aplica a alumnos.
            es_recuperacion_slot: !esBandaSlot && primeraClaseDelSlot.clase_tipo_db === 'recuperacion',
            fecha_efectiva_recuperacion_slot: !esBandaSlot && primeraClaseDelSlot.clase_tipo_db === 'recuperacion' && primeraClaseDelSlot.fecha_clase_db 
                                        ? primeraClaseDelSlot.fecha_clase_db.toISOString().split('T')[0] 
                                        : null,
            instrumento_id_slot: primeraClaseDelSlot.instrumento_id, // Podría ser de la clase (si aplica) o del horario
             _rawClasesDelSlot: results // Devolver todas las filas crudas del slot para referencia si es necesario
        };

        return {
            ...detallesComunesDelSlot,
            alumnos: alumnosDelSlot // Lista de alumnos si no es banda, vacía si es banda
        };

    } catch (error) {
        console.error(`[obtenerDetallesClase] Error cargando detalles para slot (ref c.id ${claseIdReferencia}):`, error);
        throw error;
    } finally {
        if (!existingConnection && conn) {
            conn.release();
        }
    }
}

async function actualizarDatosClase(claseId, datosActualizar, profesorIdDesdeToken) {
    const {
        alumnosData, // Array [{id, modalidad}] que vienen del modal
        nuevoTipo, 
        fechaNuevaSiRecuperacion
    } = datosActualizar;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [claseExistenteRows] = await connection.query(
            'SELECT tipo, profesor_id, alumno_id, modalidad_id, fecha, horario_id FROM clases WHERE id = ?',
            [claseId] // claseId es el ID de la clase que se está "editando" directamente
        );
        if (claseExistenteRows.length === 0) {
            throw new Error('Clase no encontrada para actualizar.');
        }
        const claseOriginal = claseExistenteRows[0];
        const profesorOriginalId = claseOriginal.profesor_id;

        const updateFields = [];
        const updateValues = [];

        // Actualizar tipo si es diferente
        if (nuevoTipo !== claseOriginal.tipo) {
            updateFields.push('tipo = ?');
            updateValues.push(nuevoTipo);
        }

        // Actualizar fecha
        if (nuevoTipo === 'recuperacion') {
            if (!fechaNuevaSiRecuperacion) { 
                throw new Error('Una recuperación debe tener una fecha efectiva.');
            }
            const fechaOriginalDB = claseOriginal.fecha ? claseOriginal.fecha.toISOString().split('T')[0] : null;
            if (fechaNuevaSiRecuperacion !== fechaOriginalDB || nuevoTipo !== claseOriginal.tipo) {
                updateFields.push('fecha = ?');
                updateValues.push(fechaNuevaSiRecuperacion);
            }
        } else { // nuevoTipo es 'normal'
            if (claseOriginal.tipo === 'recuperacion' && nuevoTipo === 'normal') {
                 updateFields.push('fecha = NULL'); 
            }
        }

        // MODIFICACIÓN AQUÍ PARA ACTUALIZAR EL ALUMNO Y MODALIDAD CORRECTOS:
        let alumnoParaActualizarDirecta = null;
        if (alumnosData && alumnosData.length > 0) {
            // Encontramos el alumno de `alumnosData` cuyo ID coincida con `claseOriginal.alumno_id`
            // Esto asume que el `claseId` de la URL corresponde a un `alumno_id` específico.
            alumnoParaActualizarDirecta = alumnosData.find(a => String(a.id) === String(claseOriginal.alumno_id));
            
            // Si no se encontró una coincidencia directa con claseOriginal.alumno_id,
            // y si el modal solo está diseñado para pasar UN alumno cuando se actualiza (por ejemplo, si es una recuperación),
            // podríamos tomar alumnosData[0]. Sin embargo, esto es ambiguo si alumnosData tiene múltiples alumnos
            // y ninguno coincide con claseOriginal.alumno_id.
            // Para una lógica de grupo más robusta, esta parte necesitaría saber qué alumno específico del modal se quiere actualizar
            // si la intención no es actualizar TODOS los alumnos del modal.
            // Por ahora, si alumnoParaActualizarDirecta es null después del find, significa que el alumno original
            // de la clase `claseId` no está en la lista `alumnosData` enviada (quizás fue eliminado del modal),
            // o `alumnosData` representa una nueva composición del grupo.
            // Esta función, tal como está, se enfoca en actualizar la *clase con claseId*.
            // Si el alumno original ya no está y se quiere reemplazar, es más complejo.

            // Si el objetivo es actualizar la modalidad DEL alumno original de esta clase (claseOriginal.alumno_id),
            // necesitamos asegurarnos que `alumnoParaActualizarDirecta` tenga sus datos.
        }


        if (alumnoParaActualizarDirecta) { 
            const alumnoInfo = alumnoParaActualizarDirecta; // Este es el alumno de la lista del modal que coincide con el de la BD

            if (nuevoTipo === 'recuperacion' && alumnoInfo.modalidad !== 'individual') {
                throw new Error('El alumno para recuperación debe estar en modalidad Personalizada.');
            }

            // No actualizamos alumno_id aquí, porque estamos actualizando la clase `claseId`
            // que ya tiene un `alumno_id` (claseOriginal.alumno_id). Cambiarlo aquí sería reasignar esta fila de `clases`.
            // Si `alumnoInfo.id` es diferente de `claseOriginal.alumno_id`, hay una discrepancia.

            // Obtener o crear la nueva modalidad_id para este alumnoInfo (que es el alumnoOriginal de la clase)
            let modalidadIdTemp;
            const alumnoIdParaModalidadDB = (alumnoInfo.modalidad === 'individual') ? alumnoInfo.id : null; // Usar el ID del alumno que estamos actualizando
            
            const [existingM] = await connection.query(
                'SELECT id FROM modalidades WHERE profesor_id = ? AND tipo = ? AND (alumno_id = ? OR (? IS NULL AND alumno_id IS NULL)) LIMIT 1',
                [profesorOriginalId, alumnoInfo.modalidad, alumnoIdParaModalidadDB, alumnoIdParaModalidadDB]
            );

            if (existingM.length > 0) {
                modalidadIdTemp = existingM[0].id;
            } else {
                const [newMResult] = await connection.query(
                    'INSERT INTO modalidades (profesor_id, alumno_id, tipo) VALUES (?, ?, ?)',
                    [profesorOriginalId, alumnoIdParaModalidadDB, alumnoInfo.modalidad]
                );
                modalidadIdTemp = newMResult.insertId;
            }

            if (String(modalidadIdTemp) !== String(claseOriginal.modalidad_id)) {
                updateFields.push('modalidad_id = ?');
                updateValues.push(modalidadIdTemp);
                console.log(`[actualizarDatosClase] Actualizando modalidad_id para clase ${claseId} (alumno ${claseOriginal.alumno_id}) a ${modalidadIdTemp} (nueva modalidad tipo ${alumnoInfo.modalidad})`);
            }
        } else if (alumnosData && alumnosData.length > 0) {
            // Esto se alcanzaría si el alumno original de `claseId` no está en `alumnosData`.
            // Podría significar que el usuario lo eliminó del modal.
            // En ese caso, esta instancia de `claseId` debería marcarse como cancelada si ya no está en la lista deseada.
            // La lógica completa de sincronización de grupo manejaría esto.
            // Por ahora, si no encontramos al alumno original en la lista del modal, no hacemos cambios de modalidad/alumno para ESTA claseId.
             console.log(`[actualizarDatosClase] El alumno original ${claseOriginal.alumno_id} de la clase ${claseId} no se encontró en los datos del modal. No se actualizará su modalidad. La sincronización completa del grupo es necesaria para añadir/eliminar alumnos del slot.`);
        }


        if (updateFields.length > 0) {
            const queryUpdate = `UPDATE clases SET ${updateFields.join(', ')} WHERE id = ?`;
            updateValues.push(claseId);
            console.log(`[actualizarDatosClase] Ejecutando actualización para clase ${claseId}: QUERY: ${queryUpdate} VALUES: ${JSON.stringify(updateValues)}`);
            await connection.query(queryUpdate, updateValues);
        } else {
            console.log(`[actualizarDatosClase] No se detectaron cambios necesarios en los campos para la clase ${claseId}.`);
            
        }

        await connection.commit();
        const detallesClaseActualizada = await obtenerDetallesClase(claseId, connection); 
        return { success: true, message: 'Operación de actualización procesada.', detalles: detallesClaseActualizada };

    } catch (error) {
        await connection.rollback();
        console.error('Error en actualizarDatosClase:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function eliminarClasesDelSlot(claseIdReferencia) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Obtener el horario_id y sala_id de la clase de referencia
        const [referenciaRows] = await connection.query(
            `SELECT c.horario_id, sh.sala_id
             FROM clases c
             JOIN sala_horario sh ON c.id = sh.clase_id
             WHERE c.id = ?`,
            [claseIdReferencia]
        );

        if (referenciaRows.length === 0) {
            await connection.rollback(); // No se encontró la clase de referencia
            console.warn(`[eliminarClasesDelSlot] Clase de referencia ID ${claseIdReferencia} no encontrada.`);
            return { success: false, message: 'Clase de referencia no encontrada para eliminar el slot.' };
        }
        const { horario_id, sala_id } = referenciaRows[0];
        console.log(`[eliminarClasesDelSlot] Obtenido horario_id: ${horario_id}, sala_id: ${sala_id} para clase_ref: ${claseIdReferencia}`);

        // 2. Encontrar todas las clases.id que pertenecen a este slot (horario_id y sala_id)
        const [clasesEnSlotRows] = await connection.query(
            `SELECT c.id
             FROM clases c
             JOIN sala_horario sh ON c.id = sh.clase_id
             WHERE c.horario_id = ? AND sh.sala_id = ? AND c.estado = 'activo'`, // Asegurarse que solo se tomen las activas si es relevante
            [horario_id, sala_id]
        );

        if (clasesEnSlotRows.length === 0) {
        await connection.commit();
            console.log(`[eliminarClasesDelSlot] No se encontraron clases activas en el slot (horario_id: ${horario_id}, sala_id: ${sala_id}) para eliminar.`);
            return { success: true, message: 'No se encontraron clases en el slot para eliminar (o ya estaba vacío).' };
        }

        const claseIdsParaEliminar = clasesEnSlotRows.map(row => row.id);
        console.log(`[eliminarClasesDelSlot] IDs de clases a eliminar del slot: ${claseIdsParaEliminar.join(', ')}`);

        let totalSalaHorarioEliminado = 0;
        let totalClasesEliminadas = 0;

        // 3. Eliminar de sala_horario y clases
        for (const idClase of claseIdsParaEliminar) {
            const [shResult] = await connection.query("DELETE FROM sala_horario WHERE clase_id = ?", [idClase]);
            totalSalaHorarioEliminado += shResult.affectedRows;
            const [cResult] = await connection.query("DELETE FROM clases WHERE id = ?", [idClase]);
            totalClasesEliminadas += cResult.affectedRows;
        }

        await connection.commit();
        console.log(`[eliminarClasesDelSlot] Slot (horario_id: ${horario_id}, sala_id: ${sala_id}) eliminado. Clases eliminadas: ${totalClasesEliminadas}. Entradas sala_horario eliminadas: ${totalSalaHorarioEliminado}.`);
        return { success: true, message: 'La clase ha sido eliminada exitosamente.' };

    } catch (error) {
        await connection.rollback();
        console.error('[eliminarClasesDelSlot] Error durante el borrado del slot:', error);
        throw error; 
    } finally {
        if (connection) connection.release();
    }
}

// ----------- FIN NUEVAS FUNCIONES ----------


// Función para obtener usuario y profesor por ID
async function obtenerUsuarioProfesorPorId(id) {
    const query = `
        SELECT email_personal, contrasena, tipo 
        FROM usuarios 
        WHERE id = ?`;
    
    try {
        const [results] = await db.query(query, [id]);
        if (results.length === 0) {
            return null; // Devuelve null si no se encuentra el usuario
        }
        return results[0]; // Devuelve el primer resultado (el usuario)
    } catch (err) {
        console.error(`Error al obtener usuario por ID ${id}:`, err);
        throw err; // Relanza el error para que sea manejado por la función que llama
    }
}



// Función para actualizar usuario profesor
async function actualizarUsuarioProfesor(id, email, contrasena) {
    const query = 'UPDATE usuarios SET email_personal = ?, contrasena = ? WHERE id = ?';
    try {
        const [result] = await db.query(query, [email, contrasena, id]);
        if (result.affectedRows === 0) {
            // Considera si deberías lanzar un error si el usuario no se encuentra o no se actualiza
            console.warn(`Usuario con ID ${id} no encontrado o no se realizaron cambios al actualizar.`);
            // throw new Error('Usuario no encontrado para actualizar o datos idénticos.');
        }
        return result; // Devuelve el objeto de resultado de la consulta (incluye affectedRows)
    } catch (err) {
        console.error(`Error al actualizar usuario profesor con ID ${id}:`, err);
        // Manejar errores específicos como entradas duplicadas si es necesario
        if (err.code === 'ER_DUP_ENTRY' && err.message.includes('email_personal')) {
            throw new Error(`El email '${email}' ya está en uso por otro usuario.`);
        }
        throw err; // Relanza otros errores
    }
}

// Función para generar contraseña
const generarContrasena = (nombre, email) => {
    const prefijo = nombre.substring(0, 3).toLowerCase();
    const emailParts = email.split('@');
    const sufijo = emailParts[0].length > 4 ? emailParts[0].slice(-4) : emailParts[0];
    return `${prefijo}${sufijo}`;
};

// Función para buscar alumnos
const buscarAlumnos = async (busqueda) => {
    let query;
    const params = [];

    if (busqueda && busqueda.trim() !== '') {
        query = `
            SELECT id, nombre, apellido, instrumento_alumno, modalidad_alumno,  monto, dia_pago, IFNULL(comentarios, 'no registrado') AS comentarios, numero_telefono, rut, IFNULL(DATE_FORMAT(fecha_registro, '%d/%m/%y'), 'no registrada') AS fecha_registro, email, profesor_id
            FROM alumno 
            WHERE (nombre LIKE ? OR apellido LIKE ?) AND estado = 'activo'
            ORDER BY nombre ASC, apellido ASC; 
        `;
        const likeBusqueda = `%${busqueda}%`;
        params.push(likeBusqueda, likeBusqueda);
    } else {
        // Si la búsqueda está vacía, obtener todos los alumnos activos ordenados por nombre
        query = `
            SELECT id, nombre, apellido, instrumento_alumno, modalidad_alumno,  monto, dia_pago, IFNULL(comentarios, 'no registrado') AS comentarios, numero_telefono, rut, IFNULL(DATE_FORMAT(fecha_registro, '%d/%m/%y'), 'no registrada') AS fecha_registro, email, profesor_id
            FROM alumno 
            WHERE estado = 'activo'
            ORDER BY nombre ASC, apellido ASC;
        `;
    }

    try {
        const [results] = await db.query(query, params);
        return results;
    } catch (error) {
        console.error('Error al buscar alumnos:', error);
        throw error;
    }
};



/*
// Función para buscar profesores para la barra de búsqueda
const buscarProfesores = async (nombre) => {
    const query = `
        SELECT id, nombre, apellido, email, especialidad
        FROM profesor 
        WHERE nombre LIKE ? OR apellido LIKE ? OR email LIKE ? OR especialidad LIKE ?;
    `;
    const likeBusqueda = `%${nombre}%`;
    try {
        const [results] = await db.query(query, [likeBusqueda, likeBusqueda, likeBusqueda, likeBusqueda]);
        return results;
    } catch (error) {
        console.error('Error al buscar profesores:', error);
        throw error;
    }
};*/

//función para buscar profesores
const buscarProfesores = async (nombre) => {
    let query;
    const params = [];

    if (nombre && nombre.trim() !== '') {
        query = `
            SELECT id, nombre, apellido, email, especialidad
            FROM profesor
            WHERE (nombre LIKE ? OR apellido LIKE ?) 
            order by nombre asc, apellido asc;
        `;
        const likeBusqueda = `%${nombre}%`;
        params.push(likeBusqueda, likeBusqueda);
    } else {
        // Si la búsqueda está vacía, obtener todos los profesores activos ordenados por nombre
        query = `
            SELECT id, nombre, apellido, email, especialidad
            FROM profesor
        `;
    }
    try {
        const [results] = await db.query(query, params);
        return results;
    } catch (error) {
        console.error('Error al buscar profesores:', error);
        throw error;
    }
};


// Función para insertar un nuevo alumno en la base de datos (Refactorizada a async/await)
const insertarAlumno = async (nombre, apellido, email, numero_telefono, profesorId) => {
    if (!nombre || !apellido || !email) { // profesorId se valida internamente, numero_telefono es opcional
        throw new Error('Nombre, apellido y correo electrónico son requeridos.'); 
    }

    // Validación de profesorId (aunque se obtiene del token, una verificación extra no está de más si se pasara explícitamente)
    if (!profesorId) {
        throw new Error('El profesor asociado es requerido y no fue provisto.');
    }

    try {
    // Ya no se verifica el RUT

        // Verificar si el correo ya está registrado en usuarios
        const queryVerificarEmail = 'SELECT id FROM usuarios WHERE email_personal = ?';
        const [resultsEmail] = await db.query(queryVerificarEmail, [email]);
        if (resultsEmail.length > 0) {
            throw new Error('El correo ya está registrado');
        }

            // Verificar si el profesor existe
        const queryVerificarProfesor = 'SELECT id FROM profesor WHERE id = ?';
        const [resultsProf] = await db.query(queryVerificarProfesor, [profesorId]);
        if (resultsProf.length === 0) {
            throw new Error('El profesor especificado no existe');
        }

                // Insertar alumno (sin RUT, y numero_telefono puede ser null si no se provee)
                const queryInsertar = `
                    INSERT INTO alumno (nombre, apellido, email, numero_telefono, profesor_id)
                    VALUES (?, ?, ?, ?, ?);
                `;
        // Usamos [resultado] para obtener el objeto de resultado de la inserción
        const [resultado] = await db.query(queryInsertar, [nombre, apellido, email, numero_telefono, profesorId]);
        
        // Devolver el resultado de la inserción (incluye insertId)
        return resultado; 

    } catch (error) {
        console.error('Error en insertarAlumno:', error);
        // Si es un error específico que queremos manejar, lo relanzamos
        if (error.message.includes('registrado') || error.message.includes('requeridos') || error.message.includes('no existe')) {
            throw error;
        }
        // Para otros errores (ej. de conexión), lanzar un error genérico
        throw new Error('Error interno al intentar registrar el alumno.'); 
    }
};


// Función para obtener el ID del profesor correspondiente al ID de la tabla usuarios
const obtenerProfesorId = async (usuarioId) => {
    const query = 'SELECT profesor_id FROM usuarios WHERE id = ?';
    try {
        const [results] = await db.query(query, [usuarioId]);
        return results;
    } catch (error) {
        console.error('Error al obtener profesor ID para usuario:', usuarioId, error);
        throw error;
    }
};

// Función para crear usuario y enviar correo (Refactorizada a async/await)
const crearUsuarioAlumno = async (alumnoId, email, nombre, profesorId) => { // Se quita rut de los parámetros
    const contrasena = generarContrasena(nombre, email); // Se pasa email en lugar de rut
    const tipoAlumno = 3;
    
    const query = `
        INSERT INTO usuarios (email_personal, contrasena, tipo, alumno_id, profesor_id)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    console.log('Insertando usuario:', { email, contrasena, tipoAlumno, alumnoId, profesorId });
    
    try {
        // Insertar usuario
        const [resultadosInsert] = await db.query(query, [email, contrasena, tipoAlumno, alumnoId, profesorId]);
        
        // Enviar correo electrónico (envolver sendMail en una promesa)
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Bienvenido - Datos de acceso',
            html: `
                <h1>¡Bienvenido a Feeling Music!</h1>
                <p>Tus datos de acceso son:</p>
                <p><strong>Usuario:</strong> ${email}</p>
                <p><strong>Contraseña:</strong> ${contrasena}</p>
            `
        };

        // Envolver en promesa
        await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (errorMail, info) => {
            if (errorMail) {
                console.error('Error al enviar correo:', errorMail);
                    // No rechazamos la promesa principal por error de correo,
                    // solo lo logueamos, pero podrías cambiar esto si el correo es crítico.
                    resolve(); // Resolver incluso si el correo falla
                } else {
                    console.log('Correo enviado:', info.response);
                    resolve(); // Resolver si el correo se envía
                }
        });
    });
        
        // Devolver el resultado de la inserción del usuario
        return resultadosInsert;

    } catch (error) {
        console.error('Error en crearUsuarioAlumno:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error('Ya existe un usuario con este email');
        }
        throw new Error('Error interno al crear el usuario.'); // Lanzar error genérico
    }
};

// Función para obtener todos los profesores
const obtenerProfesores = async () => {
    const query = 'SELECT * FROM profesor';
    try {
        const [resultados] = await db.query(query);
        return resultados;
    } catch (error) {
            console.error('Error al obtener profesores:', error);
        throw error;
        }
};

// Función para obtener salas
const obtenerSalas = async () => {
    const query = 'SELECT * FROM salas';
    try {
        const [resultados] = await db.query(query);
        console.log('Salas obtenidas:', resultados);
        return resultados || [];
    } catch (error) {
            console.error('Error al obtener salas:', error);
        throw error;
    }
};

// Función para insertar un nuevo horario en la base de datos (Refactorizada a async/await)
// ESTA FUNCIÓN ORIGINAL `insertarHorario` PROBABLEMENTE YA NO SEA NECESARIA
// SI `crearClase` MANEJA LA CREACIÓN DEL SLOT EN `horarios`
// O SE DEBE REVISAR SU USO.
const insertarHorario = async (dia, horaInicio, horaFin, profesorId, salaNombre, alumnoId = null) => {
            if (!profesorId) {
                throw new Error('El ID del profesor es requerido');
            }
            if (!dia || !horaInicio || !horaFin || !salaNombre) {
                throw new Error('Todos los campos son requeridos');
            }

    console.log('Insertando horario (async) con datos:', { dia, horaInicio, horaFin, profesorId, salaNombre, alumnoId });

    const connection = await db.getConnection(); 

    try {
            const queryHorario = `
            INSERT INTO horarios (dia, mes, annio, hora_inicio, hora_fin, profesor_id, estado)
            VALUES (?, MONTH(CURDATE()), YEAR(CURDATE()), ?, ?, ?, 'Disponible');
        `;
        const [resultadoHorario] = await connection.query(queryHorario, [dia, horaInicio, horaFin, profesorId]);
        const horarioId = resultadoHorario.insertId;
        console.log('Horario insertado con ID:', horarioId);

        const queryProfesorHorario = `INSERT INTO profesor_horario (profesor_id, horario_id) VALUES (?, ?);`;
        await connection.query(queryProfesorHorario, [profesorId, horarioId]);
        console.log('Relación profesor-horario insertada.');

                                const querySalaHorario = `
                                    INSERT INTO sala_horario (sala_id, horario_id, profesor_id)
                                    VALUES ((SELECT id FROM salas WHERE nombre = ? LIMIT 1), ?, ?);
                                `;
        await connection.query(querySalaHorario, [salaNombre, horarioId, profesorId]);
        console.log('Relación sala-horario insertada.');

                                        if (alumnoId) {
            console.log(`Creando clase para alumno ID: ${alumnoId}`);
                                            const queryClase = `
                INSERT INTO clases (nombre, horario_id, profesor_id, alumno_id, estado, fecha, modalidad_id)
                VALUES ('Clase programada', ?, ?, ?, 'activo', CURDATE(), 
                        (SELECT id FROM modalidades WHERE alumno_id = ? AND profesor_id = ? LIMIT 1));
            `;
            try {
                 await connection.query(queryClase, [horarioId, profesorId, alumnoId, alumnoId, profesorId]);
                 console.log('Clase creada para alumno.');
                 return { mensaje: 'Horario y clase creados con éxito', horarioId, profesorId };
            } catch(errorClase) {
                 console.error('Error al crear la clase (puede ser modalidad inexistente):', errorClase);
                  return { mensaje: 'Horario creado, pero hubo un error al crear la clase asociada.', horarioId, profesorId, errorClase: errorClase.message };
            }
                                        } else {
            return { mensaje: 'Horario creado con éxito', horarioId, profesorId };
        }
                                    } catch (error) {
        console.error('Error en insertarHorario (async):', error);
        throw new Error('Error interno al intentar guardar el horario.'); 
    } finally {
        if (connection) connection.release();
    }
};

// Verificar si ya existe un horario en la misma sala a la misma hora
const queryVerificar = `
    SELECT COUNT(*) AS count FROM horarios h
    JOIN sala_horario sh ON h.id = sh.horario_id
    JOIN salas s ON sh.sala_id = s.id
    WHERE h.dia = ? AND h.mes = ? AND h.annio = ? AND h.hora_inicio = ? AND s.nombre = ?;
`;


// Actualizar el estado de la sala en la tabla horarios
const queryActualizarEstado = `
    UPDATE horarios h
    JOIN sala_horario sh ON h.id = sh.horario_id
    JOIN salas s ON sh.sala_id = s.id
    SET h.estado = IF((SELECT COUNT(*) FROM alumno_horario ah WHERE ah.horario_id = h.id) >= s.capacidad, 'Ocupado', 'Desocupado')
    WHERE h.id = ?;
`;

// Función para obtener el horario disponible del profesor (Refactorizada a async/await)
const obtenerHorarioDisponible = async (profesorId) => {
    const query = `
        SELECT h.id, h.dia, h.hora_inicio, h.hora_fin, h.estado
        FROM horarios h
        WHERE h.profesor_id = ? AND h.estado = 'Disponible'; 
    `;
    try {
        const [resultados] = await db.query(query, [profesorId]);
        return resultados;
    } catch (error) {
        console.error('Error al obtener horario disponible:', error);
        throw error; 
    }
};

const actualizarEstadoHorario = async (horarioId, connection = null) => { 
    // Permitir pasar una conexión existente (para transacciones)
    const conn = connection || await db.getConnection();
    const queryActualizarEstado = `
        UPDATE horarios h
        SET h.estado = IF((SELECT COUNT(*) FROM clases c WHERE c.horario_id = h.id AND c.estado = 'activo') > 0, 'Ocupado', 'Disponible')
        WHERE h.id = ?;
    `;
    try {
        const [resultado] = await conn.query(queryActualizarEstado, [horarioId]);
        console.log(`Estado actualizado para horario ${horarioId}, filas afectadas: ${resultado.affectedRows}`);
        return resultado; 
    } catch (error) {
        console.error(`Error al actualizar estado para horario ${horarioId}:`, error);
        throw error; 
    } finally {
        if (!connection && conn) conn.release(); // Solo liberar si no se pasó como argumento
    }
}

async function obtenerUsuarioLogin(email) {
    const sql = `
        SELECT u.*, 
               a.id as alumno_id 
        FROM usuarios u 
        LEFT JOIN alumno a ON u.alumno_id = a.id 
        WHERE u.email_personal = ?
    `;
    try {
        const [results] = await db.query(sql, [email]); 
        return results; 
    } catch (err) {
            console.error('Error en obtenerUsuarioLogin:', err);
        throw err; 
    }
}

async function insertarUsuario(email, contrasena, nombre, apellido, especialidad) {
    const connection = await db.getConnection(); 
    try {
        await connection.beginTransaction(); 

        const especialidadString = Array.isArray(especialidad) ? especialidad.join(', ') : especialidad;
        const queryProfesor = `
            INSERT INTO profesor (nombre, apellido, email, tipo, especialidad)
            VALUES (?, ?, ?, 2, ?)
        `;
        console.log('Insertando profesor (transacción):', { nombre, apellido, email, especialidad: especialidadString });
        const [profesorResult] = await connection.query(queryProfesor, [nombre, apellido, email, especialidadString]);
            const profesorId = profesorResult.insertId;
            console.log('Profesor insertado con ID:', profesorId);

            const queryUsuario = `
            INSERT INTO usuarios (email_personal, contrasena, tipo, profesor_id, alumno_id, profesor_id_profesor)
            VALUES (?, ?, 2, ?, NULL, NULL)
        `; // Asumiendo que profesor_id_profesor es para otra lógica, o es un typo de profesor_id
        console.log('Insertando usuario (transacción):', { email_personal: email, tipo: 2, profesor_id: profesorId });
        await connection.query(queryUsuario, [email, contrasena, profesorId]);
                console.log('Usuario insertado correctamente');

                const especialidades = Array.isArray(especialidad) ? especialidad : [especialidad];
        console.log('Insertando especialidades en instrumentos (transacción):', especialidades);
        const instrumentoPromises = especialidades.map(esp => {
                    const queryInstrumento = `
                        INSERT INTO instrumentos (nombre, profesor_id, estado)
                        VALUES (?, ?, 'activo')
                    `;
            return connection.query(queryInstrumento, [esp.trim(), profesorId]); 
        });
        await Promise.all(instrumentoPromises);
        console.log('Instrumentos insertados correctamente');
        await connection.commit();
        console.log('Transacción completada con éxito');
        return { success: true, message: 'Registro exitoso', profesorId: profesorId };
    } catch (error) {
        console.error('Error durante la transacción de inserción de usuario:', error);
        await connection.rollback();
        console.log('Transacción revertida.');
        if (error.code === 'ER_DUP_ENTRY') throw new Error('El email ya está registrado.');
        throw new Error('Error interno al registrar el profesor.'); 
    } finally {
        if (connection) connection.release();
        console.log('Conexión liberada.');
    }
}

const obtenerHorariosPorProfesor = async (profesorId) => {
    const query = `
        SELECT h.id, h.dia, h.mes, h.annio, h.hora_inicio, h.hora_fin, s.nombre AS sala_nombre
        FROM horarios h
        JOIN profesor_horario ph ON h.id = ph.horario_id
        JOIN sala_horario sh ON h.id = sh.horario_id
        JOIN salas s ON sh.sala_id = s.id
        WHERE ph.profesor_id = ?;
    `;
    try {
        const [resultados] = await db.query(query, [profesorId]);
        return resultados;
    } catch (error) {
        console.error(`Error al obtener horarios para profesor ${profesorId}:`, error);
        throw error;
    }
};

const actualizarHorario = async (horarioId, fecha, horaInicio, horaFin, salaNombre) => {
    // ESTA FUNCIÓN PROBABLEMENTE DEBA SER REVISADA O ELIMINADA
    // SI `actualizarDatosClase` MANEJA LOS CAMBIOS DE HORARIO DE FORMA MÁS INTEGRAL
    // O SI LOS HORARIOS SON FIJOS Y SOLO SE ACTUALIZAN CLASES DENTRO DE ELLOS.
    const [annio, mes, dia] = fecha.split('-');
    let salaId;
    try {
        const [salas] = await db.query('SELECT id FROM salas WHERE nombre = ? LIMIT 1', [salaNombre]);
        if (salas.length === 0) throw new Error(`Sala no encontrada: ${salaNombre}`);
        salaId = salas[0].id;
    } catch (error) { console.error('Error al buscar sala para actualizar horario:', error); throw error; }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const queryHorario = `UPDATE horarios SET dia = ?, mes = ?, annio = ?, hora_inicio = ?, hora_fin = ? WHERE id = ?;`;
        const [resultHorario] = await connection.query(queryHorario, [dia, mes, annio, horaInicio, horaFin, horarioId]);
        console.log(`Horario ${horarioId} actualizado:`, resultHorario.info);

        const querySala = `UPDATE sala_horario SET sala_id = ? WHERE horario_id = ?;`;
        const [resultSala] = await connection.query(querySala, [salaId, horarioId]);
        console.log(`Relación sala-horario para ${horarioId} actualizada con sala ${salaId}:`, resultSala.info);
        if (resultSala.affectedRows === 0) {
             console.warn(`No se encontró relación sala_horario para ${horarioId}, insertando nueva...`);
             const queryInsertSala = `INSERT INTO sala_horario (sala_id, horario_id, profesor_id) VALUES (?, ?, (SELECT profesor_id FROM horarios WHERE id = ?))`;
             await connection.query(queryInsertSala, [salaId, horarioId, horarioId]);
             console.log(`Nueva relación sala-horario insertada para ${horarioId} y sala ${salaId}`);
        }
        await connection.commit();
        console.log(`Horario ${horarioId} y su sala asociados actualizados correctamente.`);
        return { affectedRowsHorario: resultHorario.affectedRows, affectedRowsSala: resultSala.affectedRows };
    } catch (error) { await connection.rollback(); console.error(`Error al actualizar horario ${horarioId}:`, error); throw error;
    } finally { if (connection) connection.release(); }
};

const buscarAlumnosPorNombre = async (nombre) => {
    const query = `SELECT id, nombre, apellido FROM alumno WHERE (nombre LIKE ? OR apellido LIKE ?) AND estado = 'activo';`;
    const likeNombre = `%${nombre}%`;
    try { const [resultados] = await db.query(query, [likeNombre, likeNombre]); return resultados; }
    catch (error) { console.error('Error al buscar alumnos por nombre:', error); throw error; }
};

const obtenerInstrumentoIdPorNombre = async (nombre) => {
    const query = 'SELECT id FROM instrumentos WHERE nombre = ? AND estado = \'activo\' LIMIT 1';
    try { const [results] = await db.query(query, [nombre]); return results.length > 0 ? results[0].id : null; }
    catch (error) { console.error('Error al obtener ID de instrumento por nombre:', error); throw error; }
};

const guardarClase = async (horarioId, instrumentoId, profesorId, alumnoId, modalidadId) => {
    // ESTA FUNCIÓN ES REDUNDANTE SI `crearClase` ES LA PRINCIPAL FORMA DE CREAR CLASES. REVISAR.
    const query = `INSERT INTO clases (nombre, horario_id, instrumento_id, profesor_id, alumno_id, modalidad_id, estado, fecha) VALUES (?, ?, ?, ?, ?, ?, 'activo', CURDATE())`;
     let nombreClase = 'Clase programada';
     try {
         const [instrumentoData] = await db.query('SELECT nombre FROM instrumentos WHERE id = ?', [instrumentoId]);
         if (instrumentoData.length > 0) nombreClase = `Clase de ${instrumentoData[0].nombre}`;
     } catch (err) { console.warn("No se pudo obtener nombre de instrumento para el nombre de la clase:", err.message); }
    try {
        const [resultado] = await db.query(query, [nombreClase, horarioId, instrumentoId, profesorId, alumnoId, modalidadId]);
        console.log(`Clase guardada con ID: ${resultado.insertId} para Horario ID: ${horarioId}, Alumno ID: ${alumnoId}`);
        return resultado;
    } catch (error) {
        console.error('Error al guardar la clase:', error);
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             if (error.message.includes('fk_clases_modalidades')) throw new Error(`Error al guardar clase: La modalidad con ID ${modalidadId} no existe o no es válida.`);
             else if (error.message.includes('fk_clases_instrumentos')) throw new Error(`Error al guardar clase: El instrumento con ID ${instrumentoId} no existe.`);
             else if (error.message.includes('fk_clases_alumno')) throw new Error(`Error al guardar clase: El alumno con ID ${alumnoId} no existe o está inactivo.`);
             else if (error.message.includes('fk_clases_horarios')) throw new Error(`Error al guardar clase: El horario con ID ${horarioId} no existe.`);
             else if (error.message.includes('fk_clases_profesor')) throw new Error(`Error al guardar clase: El profesor con ID ${profesorId} no existe.`);
        } throw error;
    }
};

const insertarPago = async (monto, fecha_pago, metodo_de_pago, notas, alumno_id, profesorId) => {
    const query = `INSERT INTO pagos (monto, fecha_pago, metodo_de_pago, notas, alumno_id, profesor_id) VALUES (?, ?, ?, ?, ?, ?);`;
    try {
        const [resultado] = await db.query(query, [monto, fecha_pago, metodo_de_pago, notas, alumno_id, profesorId]);
        console.log(`Pago insertado con ID: ${resultado.insertId} para Alumno ID: ${alumno_id}`);
        return resultado;
    } catch (error) {
        console.error('Error al insertar pago:', error);
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             if (error.message.includes('pagos_ibfk_1')) throw new Error(`Error al insertar pago: El alumno con ID ${alumno_id} no existe o está inactivo.`);
             else if (error.message.includes('pagos_ibfk_2')) throw new Error(`Error al insertar pago: El profesor con ID ${profesorId} no existe.`);
        } throw error;
    }
};

const buscarPagos = async (busqueda) => {
    const query = `
        SELECT p.id as pago_id, a.id as alumno_id, a.rut, a.nombre as alumno_nombre, a.apellido as alumno_apellido, p.monto,
            DATE_FORMAT(p.fecha_pago, '%Y-%m-%d') as fecha_pago, p.metodo_de_pago, p.notas,
            pr.id as profesor_id, CONCAT(pr.nombre, ' ', pr.apellido) as profesor_nombre
        FROM pagos p JOIN alumno a ON p.alumno_id = a.id JOIN profesor pr ON p.profesor_id = pr.id
        WHERE a.rut LIKE ? OR a.nombre LIKE ? OR a.apellido LIKE ? OR DATE_FORMAT(p.fecha_pago, '%d/%m/%Y') LIKE ? OR 
            p.metodo_de_pago LIKE ? OR CONCAT(pr.nombre, ' ', pr.apellido) LIKE ?
        ORDER BY p.fecha_pago DESC, p.id DESC;`;
    const likeBusqueda = `%${busqueda || ''}%`;
    console.log('Ejecutando consulta de pagos (async) con búsqueda:', busqueda);
    try { const [resultados] = await db.query(query, [likeBusqueda, likeBusqueda, likeBusqueda, likeBusqueda, likeBusqueda, likeBusqueda]);
        console.log('Resultados encontrados:', resultados.length); return resultados;
    } catch (error) { console.error('Error en la consulta de pagos (async):', error); throw error; }
};

const obtenerUsuarioPorId = async (id) => {
    const query = `SELECT id, email_personal, contrasena, tipo, alumno_id, profesor_id FROM usuarios WHERE id = ?`;
    try { const [results] = await db.query(query, [id]); if (results.length === 0) return null; return results[0]; }
    catch (error) { console.error(`Error al obtener usuario por ID ${id}:`, error); throw error; }
}

const actualizarCredencialesUsuario = async (id, email, contrasena) => {
    const query = 'UPDATE usuarios SET email_personal = ?, contrasena = ? WHERE id = ?';
    try {
        const [resultado] = await db.query(query, [email, contrasena, id]);
        console.log(`Credenciales actualizadas para usuario ID ${id}, filas afectadas: ${resultado.affectedRows}`);
        if (resultado.affectedRows === 0) console.warn(`No se encontró usuario con ID ${id} para actualizar credenciales.`);
        return resultado;
    } catch (error) {
        console.error(`Error al actualizar credenciales para usuario ID ${id}:`, error);
        if (error.code === 'ER_DUP_ENTRY' && error.message.includes('email_personal')) throw new Error(`El email '${email}' ya está registrado por otro usuario.`);
        throw error;
    }
}

const obtenerHorariosPorSalaYHora = async (salaId, hora) => {
    // REVISAR SI AÚN ES NECESARIA O ÚTIL CON LA NUEVA LÓGICA DE CLASES
     const horaComparable = `${hora}:00`;
    const query = `
        SELECT h.*, s.nombre AS sala_nombre FROM horarios h
        JOIN sala_horario sh ON h.id = sh.horario_id JOIN salas s ON sh.sala_id = s.id
        WHERE s.id = ? AND ? >= h.hora_inicio AND ? < h.hora_fin;`;
    try { const [resultados] = await db.query(query, [salaId, horaComparable, horaComparable]); return resultados; }
    catch (error) { console.error(`Error al obtener horarios por sala ${salaId} y hora ${hora}:`, error); throw error; }
};

const obtenerInstrumentosPorProfesor = async (profesorId) => {
    const query = `SELECT id, nombre FROM instrumentos WHERE profesor_id = ? AND estado = 'activo' ORDER BY nombre;`;
    try { const [resultados] = await db.query(query, [profesorId]); return resultados; }
    catch (error) { console.error('Error al obtener instrumentos por profesor:', error); throw error; }
};


const obtenerInstrumentos = async () => {
    const query = `SELECT DISTINCT i.id, i.nombre FROM instrumentos i WHERE i.estado = 'activo' ORDER BY i.nombre`;
    try { const [resultados] = await db.query(query); /*console.log('Instrumentos obtenidos:', resultados);*/ return resultados; }
    catch (error) { console.error('Error al obtener instrumentos:', error); throw error; }
};


const actualizarAlumnoConDatosClase = async (alumnoId, datosClase) => {
    const { instrumentoId, modalidad, monto, diaPago, comentarios } = datosClase;
    let instrumentoNombre;
    try {
        const [instrumentoData] = await db.query('SELECT nombre FROM instrumentos WHERE id = ?', [instrumentoId]);
        if (instrumentoData.length === 0) throw new Error('Instrumento no encontrado con el ID proporcionado.');
        instrumentoNombre = instrumentoData[0].nombre;
    } catch (error) { console.error(`Error al obtener nombre del instrumento para ID ${instrumentoId}:`, error); throw error; }
    const query = `UPDATE alumno SET instrumento_alumno = ?, modalidad_alumno = ?, monto = ?, dia_pago = ?, comentarios = ? WHERE id = ?;`;
    try {
        const [resultado] = await db.query(query, [instrumentoNombre, modalidad, monto, diaPago, comentarios, alumnoId]);
        if (resultado.affectedRows === 0) throw new Error('No se encontró el alumno para actualizar o no se realizaron cambios.');
        console.log(`Datos de clase actualizados para alumno ID: ${alumnoId}`); return resultado;
    } catch (error) { console.error(`Error al actualizar datos de clase para alumno ID ${alumnoId}:`, error); throw error; }
};

// Función auxiliar para obtener/crear modalidad_id
async function obtenerOCrearModalidadId(connection, profesorId, alumnoIdParaModalidad, tipoModalidad) {
    const alumnoIdReal = (tipoModalidad === 'individual') ? alumnoIdParaModalidad : null;
    const [existingModalidad] = await connection.query(
        'SELECT id FROM modalidades WHERE profesor_id = ? AND tipo = ? AND (alumno_id = ? OR (? IS NULL AND alumno_id IS NULL)) LIMIT 1',
        [profesorId, tipoModalidad, alumnoIdReal, alumnoIdReal]
    );
    if (existingModalidad.length > 0) {
        return existingModalidad[0].id;
    } else {
        const [newModalidadResult] = await connection.query(
            'INSERT INTO modalidades (profesor_id, alumno_id, tipo) VALUES (?, ?, ?)',
            [profesorId, alumnoIdReal, tipoModalidad]
        );
        return newModalidadResult.insertId;
    }
}

async function sincronizarClasesDelSlot(claseIdReferenciaSlot, datosNuevosDelSlot, profesorIdAutenticado) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Obtener detalles del slot (horario_id, sala_id, profesor_id original)
        //    usando claseIdReferenciaSlot (que es un c.id de una clase DENTRO del slot que se está editando)
        const [referenciaRows] = await connection.query(
            `SELECT c.horario_id, c.profesor_id as profesor_id_slot_original, sh.sala_id
             FROM clases c
             JOIN sala_horario sh ON c.id = sh.clase_id 
             WHERE c.id = ?`, 
            [claseIdReferenciaSlot]
        );
        
        let horarioIdDelSlot, profesorIdDelSlotOriginal, salaIdDelSlot;

        if (referenciaRows.length > 0) {
            horarioIdDelSlot = referenciaRows[0].horario_id;
            profesorIdDelSlotOriginal = referenciaRows[0].profesor_id_slot_original;
            salaIdDelSlot = referenciaRows[0].sala_id;
            console.log(`[sincronizar] Slot existente identificado por c.id ${claseIdReferenciaSlot}: h.id=${horarioIdDelSlot}, s.id=${salaIdDelSlot}, p.id_orig=${profesorIdDelSlotOriginal}`);
        } else {
            throw new Error(`No se encontró la clase de referencia con ID ${claseIdReferenciaSlot} para sincronizar el slot.`);
        }
        
        const profesorIdParaNuevasClases = profesorIdAutenticado;

        const { 
            tipoEvento, // 'alumnos' o 'banda'
            alumnosData, // [{id, modalidad}] si tipoEvento es 'alumnos'
            bandaId,     // ID de la banda si tipoEvento es 'banda'
            esRecuperacion, // boolean, solo aplica si tipoEvento es 'alumnos'
            fechaRecuperacion // string YYYY-MM-DD, solo si esRecuperacion y tipoEvento 'alumnos'
        } = datosNuevosDelSlot;

        console.log(`[sincronizar] Datos nuevos: tipoEvento=${tipoEvento}, bandaId=${bandaId}, esRecuperacion=${esRecuperacion}, alumnosData:`, alumnosData ? alumnosData.length : 'N/A');

        // VALIDACIONES
        if (tipoEvento === 'banda' && !bandaId) {
            throw new Error('Se requiere bandaId si tipoEvento es "banda".');
        }
        if (tipoEvento === 'alumnos') {
            if (!alumnosData || alumnosData.length === 0) {
                 // Permitir que alumnosData esté vacío si la intención es DEJAR EL SLOT VACÍO.
                 // Si tipoEvento es 'alumnos' pero alumnosData está vacío, se interpreta como querer borrar todo del slot.
                 console.log('[sincronizar] tipoEvento es alumnos pero alumnosData está vacío. El slot quedará disponible.');
            } else {
                // Si hay alumnosData, validar cada uno
                if (esRecuperacion) {
                    if (!fechaRecuperacion) throw new Error('Fecha es requerida para recuperación de alumnos.');
                    if (alumnosData.length !== 1) throw new Error('Recuperación de alumnos solo permite un alumno.');
                    if (alumnosData[0].modalidad !== 'individual') throw new Error('Alumno en recuperación debe ser modalidad individual.');
                }
                for (const al of alumnosData) {
                    if(!al.modalidad && !esRecuperacion) throw new Error(`Alumno ID ${al.id} no tiene modalidad definida.`);
                }
            }
        }

        // 2. Borrar TODAS las clases existentes en este slot (horario_id, sala_id)
        const [clasesABorrarRows] = await connection.query(
            `SELECT id FROM clases WHERE horario_id = ? AND id IN (SELECT clase_id FROM sala_horario WHERE sala_id = ?)`,
            [horarioIdDelSlot, salaIdDelSlot]
        );
        for (const clase of clasesABorrarRows) {
            await connection.query("DELETE FROM sala_horario WHERE clase_id = ?", [clase.id]);
            await connection.query("DELETE FROM clases WHERE id = ?", [clase.id]);
            console.log(`[sincronizar] Clase ID ${clase.id} eliminada del slot.`);
        }

        // 3. Crear las nuevas clases según tipoEvento
        let idDeReferenciaParaDetallesFinales = null;

        if (tipoEvento === 'banda') {
            const [bandaInfoRows] = await connection.query('SELECT nombre FROM bandas WHERE id = ?', [bandaId]);
            if (bandaInfoRows.length === 0) throw new Error(`Banda con ID ${bandaId} no encontrada.`);
            const nombreClaseBanda = `Ensayo Banda: ${bandaInfoRows[0].nombre}`;
            
            const [resultClaseBanda] = await connection.query(
                `INSERT INTO clases (nombre, tipo, fecha, horario_id, profesor_id, instrumento_id, alumno_id, modalidad_id, banda_id, estado)
                 VALUES (?, 'banda', CURDATE(), ?, ?, NULL, NULL, NULL, ?, 'activo')`,
                [nombreClaseBanda, horarioIdDelSlot, profesorIdParaNuevasClases, bandaId]
            );
            idDeReferenciaParaDetallesFinales = resultClaseBanda.insertId;
            await connection.query(
                'INSERT INTO sala_horario (sala_id, horario_id, profesor_id, clase_id) VALUES (?, ?, ?, ?)',
                [salaIdDelSlot, horarioIdDelSlot, profesorIdParaNuevasClases, idDeReferenciaParaDetallesFinales]
            );
            console.log(`[sincronizar] Clase para banda ID ${bandaId} creada con c.id ${idDeReferenciaParaDetallesFinales}.`);

        } else if (tipoEvento === 'alumnos' && alumnosData && alumnosData.length > 0) { // Solo crear si hay alumnosData
            const tipoClaseAlumnos = esRecuperacion ? 'recuperacion' : 'normal';
            const fechaParaClasesAlumnos = esRecuperacion ? fechaRecuperacion : new Date().toISOString().split('T')[0];

            for (const alumno of alumnosData) {
                const modalidadId = await obtenerOCrearModalidadId(connection, profesorIdParaNuevasClases, alumno.id, alumno.modalidad);
                const [infoAlumnoResult] = await connection.query('SELECT nombre, apellido FROM alumno WHERE id = ?', [alumno.id]);
                if(infoAlumnoResult.length === 0) throw new Error(`No se encontró alumno con ID ${alumno.id} para crear clase.`);
                const infoAlumno = infoAlumnoResult[0];
                const nombreClaseCompleto = `${tipoClaseAlumnos === 'recuperacion' ? 'Recuperación' : 'Clase'} - ${infoAlumno.nombre} ${infoAlumno.apellido}`;
                
                const [resultClaseAlumno] = await connection.query(
                    `INSERT INTO clases (nombre, tipo, fecha, horario_id, profesor_id, instrumento_id, alumno_id, modalidad_id, banda_id, estado)
                     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL, 'activo')`,
                    [nombreClaseCompleto, tipoClaseAlumnos, fechaParaClasesAlumnos,
                     horarioIdDelSlot, profesorIdParaNuevasClases, alumno.id, modalidadId]
                );
                const nuevaClaseIdAlumno = resultClaseAlumno.insertId;
                if (!idDeReferenciaParaDetallesFinales) idDeReferenciaParaDetallesFinales = nuevaClaseIdAlumno;

                await connection.query(
                    'INSERT INTO sala_horario (sala_id, horario_id, profesor_id, clase_id) VALUES (?, ?, ?, ?)',
                    [salaIdDelSlot, horarioIdDelSlot, profesorIdParaNuevasClases, nuevaClaseIdAlumno]
                );
                console.log(`[sincronizar] Clase para alumno ID ${alumno.id} creada con c.id ${nuevaClaseIdAlumno}.`);
            }
        } else {
             console.log(`[sincronizar] El slot quedará vacío o no se especificó un tipo de evento válido para crear clases.`);
             // Si el slot queda vacío, necesitamos un ID de referencia válido para obtenerDetallesClase.
             // Usaremos el claseIdReferenciaSlot original, ya que obtenerDetallesClase puede manejar un slot vacío.
             idDeReferenciaParaDetallesFinales = claseIdReferenciaSlot; 
        }

        await connection.commit();
        console.log(`[sincronizar] Sincronización completada para slot (h.id=${horarioIdDelSlot}, s.id=${salaIdDelSlot})`);
        
        const detallesSlotActualizado = await obtenerDetallesClase(idDeReferenciaParaDetallesFinales, connection);

        return { success: true, message: 'Actualizado exitosamente.', detalles: detallesSlotActualizado };

    } catch (error) {
        await connection.rollback();
        console.error('[sincronizarClasesDelSlot] Error:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function actualizarAlumno(alumnoId, datosAlumno) {
    if (!alumnoId || !datosAlumno || Object.keys(datosAlumno).length === 0) {
        throw new Error('ID de alumno y datos para actualizar son requeridos.');
    }
    console.log(`[actualizarAlumno] ID: ${alumnoId}, datosAlumno recibidos:`, JSON.stringify(datosAlumno)); // LOG 3

    const camposEditables = {
        nombre: 'nombre',
        apellido: 'apellido',
        email: 'email',
        numero_telefono: 'numero_telefono',
        comentarios: 'comentarios'
    };

    const setClauses = [];
    const values = [];

    for (const key in datosAlumno) {
        if (camposEditables[key]) {
            setClauses.push(`${camposEditables[key]} = ?`);
            values.push(datosAlumno[key]);
        } else {
            console.warn(`[actualizarAlumno] Intento de actualizar campo no permitido o no reconocido: ${key}`);
        }
    }
    console.log(`[actualizarAlumno] setClauses generadas:`, setClauses.join(', ')); // LOG 4
    console.log(`[actualizarAlumno] values generados:`, JSON.stringify(values)); // LOG 5

    if (setClauses.length === 0) {
        throw new Error('No hay campos válidos para actualizar.');
    }

    values.push(alumnoId);
    const queryUpdateAlumno = `UPDATE alumno SET ${setClauses.join(', ')} WHERE id = ?`;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const [resultado] = await connection.query(queryUpdateAlumno, values);
        if (resultado.affectedRows === 0) {
             await connection.rollback();
            throw new Error('Alumno no encontrado o los datos son idénticos.');
        }

        // Si el email se está actualizando, también actualizarlo en la tabla usuarios
        if (datosAlumno.hasOwnProperty('email')) {
            const nuevoEmail = datosAlumno.email;
            // Verificar si el nuevo email ya existe para OTRO usuario (no el alumno actual)
            const [otrosUsuariosConEmail] = await connection.query(
                'SELECT id FROM usuarios WHERE email_personal = ? AND (alumno_id IS NULL OR alumno_id != ?)',
                [nuevoEmail, alumnoId]
            );
            if (otrosUsuariosConEmail.length > 0) {
                await connection.rollback();
                throw new Error('El email proporcionado ya está en uso por otro usuario.');
            }
            // Actualizar el email en la tabla usuarios para este alumno
            const [updateUserResult] = await connection.query('UPDATE usuarios SET email_personal = ? WHERE alumno_id = ?', [nuevoEmail, alumnoId]);
            if (updateUserResult.affectedRows === 0) {
                console.warn(`[actualizarAlumno] No se encontró un usuario en la tabla 'usuarios' para el alumno ID ${alumnoId} para actualizar el email, o el email ya era el mismo.`);
                // No consideramos esto un error fatal que revierta la transacción, pero es bueno registrarlo.
            }
        }
        
        await connection.commit();
        return { success: true, message: 'Alumno actualizado con éxito.' };
    } catch (error) {
        await connection.rollback();
        console.error('Error en actualizarAlumno:', error);
        // Evitar exponer códigos de error de SQL directamente si no son 'ER_DUP_ENTRY' manejados explícitamente
        if (error.message.startsWith('El email proporcionado ya está en uso')) {
            throw error; // Re-lanzar error ya manejado
        }
        throw new Error('Error interno del servidor al actualizar el alumno.'); // Error genérico
    } finally {
        if (connection) connection.release();
    }
}

async function eliminarAlumnoPermanentemente(alumnoId) {
    if (!alumnoId) {
        throw new Error('ID de alumno es requerido para eliminar.');
    }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Eliminar clases asociadas al alumno
        const queryClases = "DELETE FROM clases WHERE alumno_id = ?";
        const [resultadoClases] = await connection.query(queryClases, [alumnoId]);
        console.log(`[eliminarAlumnoPermanentemente] Clases eliminadas para alumno ID ${alumnoId}: ${resultadoClases.affectedRows} filas.`);

        // 2. Eliminar pagos asociados al alumno
        const queryPagos = "DELETE FROM pagos WHERE alumno_id = ?";
        const [resultadoPagos] = await connection.query(queryPagos, [alumnoId]);
        console.log(`[eliminarAlumnoPermanentemente] Pagos eliminados para alumno ID ${alumnoId}: ${resultadoPagos.affectedRows} filas.`);

        // 3. Eliminar el usuario asociado de la tabla 'usuarios'
        const queryUsuario = "DELETE FROM usuarios WHERE alumno_id = ?";
        const [resultadoUsuario] = await connection.query(queryUsuario, [alumnoId]);
        // No es un error fatal si no hay un usuario asociado, pero se puede loguear
        if (resultadoUsuario.affectedRows === 0) {
            console.warn(`[eliminarAlumnoPermanentemente] No se encontró un usuario en la tabla 'usuarios' para el alumno ID ${alumnoId}, o ya fue eliminado.`);
        }
        console.log(`[eliminarAlumnoPermanentemente] Usuario eliminado para alumno ID ${alumnoId}: ${resultadoUsuario.affectedRows} filas.`);

        // 4. Finalmente, eliminar al alumno de la tabla 'alumno'
        const queryAlumno = "DELETE FROM alumno WHERE id = ?";
        const [resultadoAlumno] = await connection.query(queryAlumno, [alumnoId]);
        
        if (resultadoAlumno.affectedRows === 0) {
            await connection.rollback();
            // Podría ser que el alumno ya fue eliminado o el ID no existía después de eliminar dependencias
            throw new Error('Alumno no encontrado para eliminar de la tabla principal o ya fue eliminado.');
        }
        console.log(`[eliminarAlumnoPermanentemente] Alumno principal eliminado ID ${alumnoId}: ${resultadoAlumno.affectedRows} filas.`);
        
        await connection.commit();
        return { success: true, message: 'Alumno y todos sus datos asociados eliminados permanentemente.' };
    } catch (error) {
        await connection.rollback();
        console.error('[eliminarAlumnoPermanentemente] Error:', error);
          // Si el error es una violación de clave foránea específica
        if (error.code === 'ER_ROW_IS_REFERENCED_2' && error.sqlMessage.includes('`sala_horario`')) {
            throw new Error('No se puede eliminar el alumno porque tiene un horario registrado. Elimine el horario asociado al alumno primero.');
        }
        // Si es un error de referencia por FK que no hemos cubierto explícitamente:
        if (error.code && error.code.startsWith('ER_ROW_IS_REFERENCED')) {
            throw new Error('No se puede eliminar el alumno porque aún tiene otros registros asociados no contemplados. Revise la consola del servidor para más detalles.');
        }
        throw new Error('Error interno del servidor al eliminar el alumno permanentemente.');
    } finally {
        if (connection) connection.release();
    }
}

async function eliminarProfesorPermanentemente(profesorId) {
    if (!profesorId) {
        throw new Error('ID de profesor es requerido para eliminar.');
    }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Eliminar clases asociadas al profesor (dependencia de profesor)
        const queryClases = "DELETE FROM clases WHERE profesor_id = ?";
        const [resultadoClases] = await connection.query(queryClases, [profesorId]);
        console.log(`[eliminarProfesorPermanentemente] Clases eliminadas para profesor ID ${profesorId}: ${resultadoClases.affectedRows} filas.`);

        // 2. Eliminar pagos asociados al profesor (dependencia de profesor)
        const queryPagos = "DELETE FROM pagos WHERE profesor_id = ?";
        const [resultadoPagos] = await connection.query(queryPagos, [profesorId]);
        console.log(`[eliminarProfesorPermanentemente] Pagos eliminados para profesor ID ${profesorId}: ${resultadoPagos.affectedRows} filas.`);

        // 3. Eliminar instrumentos asociados al profesor (dependencia de profesor)
         const queryInstrumentos = "DELETE FROM instrumentos WHERE profesor_id = ?";
         const [resultadoInstrumentos] = await connection.query(queryInstrumentos, [profesorId]);
         console.log(`[eliminarProfesorPermanentemente] Instrumentos eliminados para profesor ID ${profesorId}: ${resultadoInstrumentos.affectedRows} filas.`);

        // 4. Eliminar entradas en profesor_horario (dependencia de profesor)
        const queryProfesorHorario = "DELETE FROM profesor_horario WHERE profesor_id = ?";
        const [resultadoProfesorHorario] = await connection.query(queryProfesorHorario, [profesorId]);
        console.log(`[eliminarProfesorPermanentemente] Profesor_horario eliminado para profesor ID ${profesorId}: ${resultadoProfesorHorario.affectedRows} filas.`);

        // 5. Eliminar entradas en sala_instrumento (dependencia de profesor a través de sala)
        // Primero obtener las IDs de las salas asociadas a este profesor
        const [salasDelProfesorRows] = await connection.query("SELECT id FROM salas WHERE profesor_id = ?", [profesorId]);
        const salaIdsDelProfesor = salasDelProfesorRows.map(row => row.id);

        if (salaIdsDelProfesor.length > 0) {
             const placeholders = salaIdsDelProfesor.map(() => '?').join(',');
             const querySalaInstrumento = `DELETE FROM sala_instrumento WHERE sala_id IN (${placeholders})`;
             const [resultadoSalaInstrumento] = await connection.query(querySalaInstrumento, salaIdsDelProfesor);
             console.log(`[eliminarProfesorPermanentemente] Sala_instrumento eliminado para salas de profesor ${profesorId}: ${resultadoSalaInstrumento.affectedRows} filas.`);
        } else {
            console.log(`[eliminarProfesorPermanentemente] No hay salas asociadas al profesor ${profesorId}, no se eliminó sala_instrumento.`);
        }

        // 6. Eliminar entradas en sala_horario. Esto debe hacerse ANTES de eliminar las salas.
        // Se eliminan entradas donde el profesor_id coincide O donde el sala_id corresponde a una sala del profesor.
        let resultadoSalaHorario;
        if (salaIdsDelProfesor.length > 0) {
            const placeholders = salaIdsDelProfesor.map(() => '?').join(',');
             const querySalaHorario = `DELETE FROM sala_horario WHERE profesor_id = ? OR sala_id IN (${placeholders})`;
             [resultadoSalaHorario] = await connection.query(querySalaHorario, [profesorId, ...salaIdsDelProfesor]);
        } else {
             // Si no hay salas asociadas, solo eliminamos por profesor_id en sala_horario
             const querySalaHorario = `DELETE FROM sala_horario WHERE profesor_id = ?`;
             [resultadoSalaHorario] = await connection.query(querySalaHorario, [profesorId]);
        }
        console.log(`[eliminarProfesorPermanentemente] Sala_horario eliminado para profesor ID ${profesorId} y sus salas: ${resultadoSalaHorario.affectedRows} filas.`);

        // 7. Eliminar salas asociadas al profesor (dependencia de profesor), esto ya no debería fallar si se eliminó sala_horario antes.
        const querySalas = "DELETE FROM salas WHERE profesor_id = ?";
        const [resultadoSalas] = await connection.query(querySalas, [profesorId]);
        console.log(`[eliminarProfesorPermanentemente] Salas eliminadas para profesor ID ${profesorId}: ${resultadoSalas.affectedRows} filas.`);

        // 8. Eliminar el usuario asociado de la tabla 'usuarios' (dependencia de profesor)
        const queryUsuario = "DELETE FROM usuarios WHERE profesor_id = ?";
        const [resultadoUsuario] = await connection.query(queryUsuario, [profesorId]);
        // No es un error fatal si no hay un usuario asociado, pero se puede loguear
        if (resultadoUsuario.affectedRows === 0) {
            console.warn(`[eliminarProfesorPermanentemente] No se encontró un usuario en la tabla 'usuarios' para el profesor ID ${profesorId}, o ya fue eliminado.`);
        }
        console.log(`[eliminarProfesorPermanentemente] Usuario eliminado para profesor ID ${profesorId}: ${resultadoUsuario.affectedRows} filas.`);

        // 9. Finalmente, eliminar al profesor de la tabla 'profesor'
        const queryProfesor = "DELETE FROM profesor WHERE id = ?";
        const [resultadoProfesor] = await connection.query(queryProfesor, [profesorId]);
        
        if (resultadoProfesor.affectedRows === 0) {
            await connection.rollback();
            // Podría ser que el profesor ya fue eliminado o el ID no existía después de eliminar dependencias
            throw new Error('Profesor no encontrado para eliminar de la tabla principal o ya fue eliminado.');
        }
        console.log(`[eliminarProfesorPermanentemente] Profesor principal eliminado ID ${profesorId}: ${resultadoProfesor.affectedRows} filas.`);
        
        await connection.commit();
        return { success: true, message: 'Profesor y todos sus datos asociados eliminados permanentemente.' };
    } catch (error) {
        await connection.rollback();
        console.error('[eliminarProfesorPermanentemente] Error:', error);
        // Si es un error de referencia por FK que no hemos cubierto explícitamente:
        if (error.code && error.code.startsWith('ER_ROW_IS_REFERENCED')) {
             // Intentar ser más específico si es posible
             let specificError = 'No se puede eliminar el profesor debido a registros asociados.';
             if (error.sqlMessage && error.sqlMessage.includes('sala_horario')) {
                 specificError += ' (Dependencia en sala_horario)';
             } else if (error.sqlMessage && error.sqlMessage.includes('salas')) {
                  specificError += ' (Dependencia en salas)'; // Aunque esto debería resolverse ahora
             }
             throw new Error(`${specificError} Revise la consola del servidor para más detalles.`);
        }
        throw new Error('Error interno del servidor al eliminar el profesor permanentemente.');
    } finally {
        if (connection) connection.release();
    }
}



async function actualizarProfesor(profesorId, datosProfesor) {
    if (!profesorId || !datosProfesor || Object.keys(datosProfesor).length === 0) {
        throw new Error('ID de profesor y datos para actualizar son requeridos.');
    }
    console.log(`[actualizarProfesor] ID: ${profesorId}, datosProfesor recibidos:`, JSON.stringify(datosProfesor)); // LOG 3

    const camposEditables = {
        nombre: 'nombre',
        apellido: 'apellido',
        email: 'email',
        especialidad: 'especialidad'
        
    };

    const setClauses = [];
    const values = [];

    for (const key in datosProfesor) {
        console.log(`[actualizarProfesor DEBUG] Iterando con key: "${key}". Tipo de camposEditables[key]: ${typeof camposEditables[key]}. Valor de camposEditables[key]:`, camposEditables[key]); // LOG ADICIONAL
        if (camposEditables[key]) {
            setClauses.push(`${camposEditables[key]} = ?`);
            values.push(datosProfesor[key]);
        } else {
            console.warn(`[actualizarProfesor] Intento de actualizar campo no permitido o no reconocido: ${key}`);
        }
    }
    console.log(`[actualizarProfesor] setClauses generadas:`, setClauses.join(', ')); // LOG 4
    console.log(`[actualizarProfesor] values generados:`, JSON.stringify(values)); // LOG 5

    if (setClauses.length === 0) {
        throw new Error('No hay campos válidos para actualizar.');
    }

    values.push(profesorId);
    const queryUpdateProfesor = `UPDATE profesor SET ${setClauses.join(', ')} WHERE id = ?`;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const [resultado] = await connection.query(queryUpdateProfesor, values);
        if (resultado.affectedRows === 0) {
             await connection.rollback();
            throw new Error('Profesor no encontrado o los datos son idénticos.');
        }

        // Si el email se está actualizando, también actualizarlo en la tabla usuarios
        if (datosProfesor.hasOwnProperty('email')) {
            const nuevoEmail = datosProfesor.email;
            // Verificar si el nuevo email ya existe para OTRO usuario (no el alumno actual)
            const [otrosUsuariosConEmail] = await connection.query(
                'SELECT id FROM usuarios WHERE email_personal = ? AND (profesor_id IS NULL OR profesor_id != ?)',
                [nuevoEmail, profesorId]
            );
            if (otrosUsuariosConEmail.length > 0) {
                await connection.rollback();
                throw new Error('El email proporcionado ya está en uso por otro usuario.');
            }
            // Actualizar el email en la tabla usuarios para este alumno
            const [updateUserResult] = await connection.query('UPDATE usuarios SET email_personal = ? WHERE profesor_id = ?', [nuevoEmail, profesorId]);
            if (updateUserResult.affectedRows === 0) {
                console.warn(`[actualizarProfesor] No se encontró un usuario en la tabla 'usuarios' para el profesor ID ${profesorId} para actualizar el email, o el email ya era el mismo.`);
                // No consideramos esto un error fatal que revierta la transacción, pero es bueno registrarlo.
            }
        }
        
        await connection.commit();
        return { success: true, message: 'Profesor actualizado con éxito.' };
    } catch (error) {
        await connection.rollback();
        console.error('Error en actualizarProfesor:', error);
        // Evitar exponer códigos de error de SQL directamente si no son 'ER_DUP_ENTRY' manejados explícitamente
        if (error.message.startsWith('El email proporcionado ya está en uso')) {
            throw error; // Re-lanzar error ya manejado
        }
        throw new Error('Error interno del servidor al actualizar el profesor.'); // Error genérico
    } finally {
        if (connection) connection.release();
    }
}




// Exportar las funciones
module.exports = {
    obtenerHorarios,
    crearClase,
    obtenerDetallesClase,
    actualizarDatosClase,
    eliminarClasesDelSlot,
    obtenerUsuarioProfesorPorId,
    actualizarUsuarioProfesor,
    generarContrasena,
    buscarAlumnos,
    buscarProfesores,
    insertarAlumno,
    obtenerProfesorId,
    crearUsuarioAlumno,
    obtenerProfesores,
    obtenerSalas, 
    insertarHorario, 
    obtenerHorarioDisponible,
    actualizarEstadoHorario,
    obtenerUsuarioLogin,
    insertarUsuario, 
    obtenerHorariosPorProfesor,
    actualizarHorario, 
    buscarAlumnosPorNombre,
    obtenerInstrumentoIdPorNombre, 
    guardarClase, 
    insertarPago,
    buscarPagos,
    obtenerUsuarioPorId,
    actualizarCredencialesUsuario,
    obtenerHorariosPorSalaYHora, 
    obtenerInstrumentosPorProfesor,
    obtenerInstrumentos, 
    actualizarAlumnoConDatosClase,
    obtenerOCrearModalidadId,
    sincronizarClasesDelSlot,
    actualizarAlumno, 
    eliminarAlumnoPermanentemente,
    eliminarProfesorPermanentemente,
    actualizarProfesor,
    // Funciones para Bandas
    crearBanda,
    obtenerTodasLasBandas,
    obtenerBandaPorId,
    actualizarBanda,
    eliminarBanda,
    buscarBandasPorNombre,
    
    // Funciones CRUD para Salas
    crearSala,
    obtenerTodasLasSalasDetalladas, 
    obtenerSalaPorId,
    actualizarSala,
    eliminarSalaConDependencias,
    
    // Funciones añadidas para el dashboard del profesor y color
    actualizarColorProfesor,
    contarMisAlumnos,
    contarTodosLosAlumnos,
    obtenerDistribucionInstrumentosProfesor,
    obtenerDetallesProfesor
};

// ----------- FUNCIONES PARA BANDAS ----------- //
async function crearBanda(nombre) {
    if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre de la banda es requerido.');
    }
    const query = 'INSERT INTO bandas (nombre) VALUES (?)';
    try {
        const [resultado] = await db.query(query, [nombre.trim()]);
        return { success: true, id: resultado.insertId, nombre: nombre.trim() };
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error(`La banda "${nombre.trim()}" ya existe.`);
        }
        console.error('Error en crearBanda:', error);
        throw error;
    }
}

async function obtenerTodasLasBandas() {
    const query = 'SELECT id, nombre, DATE_FORMAT(fecha_registro, "%Y-%m-%d %H:%i:%s") as fecha_registro FROM bandas ORDER BY nombre ASC';
    try {
        const [bandas] = await db.query(query);
        return bandas;
    } catch (error) {
        console.error('Error en obtenerTodasLasBandas:', error);
        throw error;
    }
}

async function obtenerBandaPorId(id) {
    const query = 'SELECT id, nombre, DATE_FORMAT(fecha_registro, "%Y-%m-%d %H:%i:%s") as fecha_registro FROM bandas WHERE id = ?';
    try {
        const [bandas] = await db.query(query, [id]);
        return bandas.length > 0 ? bandas[0] : null;
    } catch (error) {
        console.error('Error en obtenerBandaPorId:', error);
        throw error;
    }
}

async function actualizarBanda(id, nombre) {
    if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre de la banda es requerido para actualizar.');
    }
    const query = 'UPDATE bandas SET nombre = ? WHERE id = ?';
    try {
        const [resultado] = await db.query(query, [nombre.trim(), id]);
        if (resultado.affectedRows === 0) {
            throw new Error(`Banda con ID ${id} no encontrada para actualizar.`);
        }
        return { success: true, message: 'Banda actualizada correctamente.' };
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error(`El nombre de banda "${nombre.trim()}" ya está en uso.`);
        }
        console.error('Error en actualizarBanda:', error);
        throw error;
    }
}

async function eliminarBanda(id) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        // Primero, desvincular de clases (marcar banda_id como NULL)
        // Opcionalmente, podrías decidir eliminar las clases asociadas, pero desvincular es más seguro.
        await connection.query("UPDATE clases SET banda_id = NULL WHERE banda_id = ?", [id]);
        
        // Luego eliminar la banda
        const [resultado] = await connection.query('DELETE FROM bandas WHERE id = ?', [id]);
        if (resultado.affectedRows === 0) {
            await connection.rollback();
            throw new Error(`Banda con ID ${id} no encontrada para eliminar.`);
        }
        await connection.commit();
        return { success: true, message: 'Banda eliminada correctamente.' };
    } catch (error) {
        await connection.rollback();
        console.error('Error en eliminarBanda:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function buscarBandasPorNombre(nombre) {
    const query = `SELECT id, nombre FROM bandas WHERE nombre LIKE ? ORDER BY nombre ASC;`;
    const likeNombre = `%${nombre}%`;
    try {
        const [resultados] = await db.query(query, [likeNombre]);
        return resultados;
    } catch (error) {
        console.error('Error al buscar bandas por nombre:', error);
        throw error;
    }
}

// NUEVA FUNCIÓN PARA ACTUALIZAR COLOR DEL PROFESOR
async function actualizarColorProfesor(profesorId, color) {
    if (!profesorId || !color) {
        throw new Error('ID de profesor y color son requeridos.');
    }
    // Simple validación de formato hex
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
        throw new Error('Formato de color inválido. Debe ser hexadecimal (ej: #FF0000).');
    }
    const query = 'UPDATE profesor SET color = ? WHERE id = ?';
    try {
        const [resultado] = await db.query(query, [color, profesorId]);
        if (resultado.affectedRows === 0) {
            throw new Error(`Profesor con ID ${profesorId} no encontrado para actualizar color.`);
        }
        return { success: true, message: 'Color del profesor actualizado.' };
    } catch (error) {
        console.error(`Error en actualizarColorProfesor (ID: ${profesorId}):`, error);
        throw error;
    }
}

// NUEVA FUNCIÓN PARA CONTAR ALUMNOS DE UN PROFESOR
async function contarMisAlumnos(profesorId) {
    if (!profesorId) {
        throw new Error('ID de profesor es requerido.');
    }
    const query = "SELECT COUNT(*) as total FROM alumno WHERE profesor_id = ? AND estado = 'activo'";
    try {
        const [results] = await db.query(query, [profesorId]);
        return results[0].total;
    } catch (error) {
        console.error(`Error en contarMisAlumnos (Profesor ID: ${profesorId}):`, error);
        throw error;
    }
}

// NUEVA FUNCIÓN PARA CONTAR TODOS LOS ALUMNOS (PARA ADMIN)
async function contarTodosLosAlumnos() {
    const query = "SELECT COUNT(*) as total FROM alumno WHERE estado = 'activo'";
    try {
        const [results] = await db.query(query);
        return results[0].total;
    } catch (error) {
        console.error('Error en contarTodosLosAlumnos:', error);
        throw error;
    }
}

// NUEVA FUNCIÓN PARA OBTENER DISTRIBUCIÓN DE INSTRUMENTOS PARA UN PROFESOR
async function obtenerDistribucionInstrumentosProfesor(profesorId) {
    // Asumiendo que 'instrumento_alumno' en la tabla 'alumno' contiene el nombre del instrumento.
    const query = `
        SELECT a.instrumento_alumno as instrumento_nombre, COUNT(a.id) as numero_alumnos
        FROM alumno a
        WHERE a.profesor_id = ? AND a.estado = 'activo' AND a.instrumento_alumno IS NOT NULL AND a.instrumento_alumno <> ''
        GROUP BY a.instrumento_alumno
        ORDER BY numero_alumnos DESC, instrumento_nombre ASC;
    `;
    try {
        const [results] = await db.query(query, [profesorId]);
        const labels = results.map(r => r.instrumento_nombre);
        const values = results.map(r => r.numero_alumnos);
        return { labels, values };
    } catch (error) {
        console.error(`Error en obtenerDistribucionInstrumentosProfesor para profesor ID ${profesorId}:`, error);
        throw error;
    }
}

// NUEVA FUNCIÓN PARA OBTENER DETALLES DEL PROFESOR
async function obtenerDetallesProfesor(profesorId) {
    const queryProfesor = "SELECT id, nombre, apellido, email, color, especialidad FROM profesor WHERE id = ?";
    try {
        const [profesorResults] = await db.query(queryProfesor, [profesorId]);
        if (profesorResults.length === 0) {
            return null;
        }
        const profesorData = profesorResults[0];

        // Opcionalmente, obtener el email de login de la tabla usuarios
        const queryUsuario = "SELECT email_personal FROM usuarios WHERE profesor_id = ? AND tipo = 2 LIMIT 1";
        const [usuarioResults] = await db.query(queryUsuario, [profesorId]);
        if (usuarioResults.length > 0) {
            profesorData.email_login = usuarioResults[0].email_personal;
        } else {
            profesorData.email_login = profesorData.email; // Fallback
        }
        return profesorData;
    } catch (error) {
        console.error(`Error en obtenerDetallesProfesor para ID ${profesorId}:`, error);
        throw error;
    }
}

// ----------- FUNCIONES CRUD PARA SALAS ----------- //
async function crearSala(nombreBase, nombrePersonalizado) {
    if (!nombreBase || !nombreBase.trim().match(/^Sala \d+$/)) {
        throw new Error('El nombre base de la sala debe tener el formato "Sala X" (ej. "Sala 1").');
    }
    const capacidadPorDefecto = 10; 
    const query = 'INSERT INTO salas (nombre, capacidad, nombre_personalizado) VALUES (?, ?, ?)';
    try {
        const [resultado] = await db.query(query, [nombreBase.trim(), capacidadPorDefecto, nombrePersonalizado ? nombrePersonalizado.trim() : null]);
        return { success: true, id: resultado.insertId, nombre: nombreBase.trim(), capacidad: capacidadPorDefecto, nombre_personalizado: nombrePersonalizado ? nombrePersonalizado.trim() : null };
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes("'nombre'")) {
            throw new Error(`La sala con nombre base "${nombreBase.trim()}" ya existe.`);
        }
        console.error('Error en crearSala:', error);
        throw error;
    }
}

async function obtenerTodasLasSalasDetalladas() {
    const query = `
        SELECT s.id, s.nombre, s.capacidad, s.profesor_id, s.nombre_personalizado, p.nombre as profesor_nombre, p.apellido as profesor_apellido
        FROM salas s
        LEFT JOIN profesor p ON s.profesor_id = p.id
        ORDER BY CAST(SUBSTRING_INDEX(s.nombre, 'Sala ', -1) AS UNSIGNED) ASC, s.nombre ASC`;
    try {
        const [salas] = await db.query(query);
        return salas;
    } catch (error) {
        console.error('Error en obtenerTodasLasSalasDetalladas:', error);
        throw error;
    }
}

async function obtenerSalaPorId(id) {
    const query = `
        SELECT s.id, s.nombre, s.capacidad, s.profesor_id, s.nombre_personalizado 
        FROM salas s
        WHERE s.id = ?`;
    try {
        const [salas] = await db.query(query, [id]);
        return salas.length > 0 ? salas[0] : null;
    } catch (error) {
        console.error('Error en obtenerSalaPorId:', error);
        throw error;
    }
}

async function actualizarSala(id, nombrePersonalizado) { 
    const query = 'UPDATE salas SET nombre_personalizado = ? WHERE id = ?';
    try {
        const [resultado] = await db.query(query, [nombrePersonalizado ? nombrePersonalizado.trim() : null, id]);
        if (resultado.affectedRows === 0) {
            throw new Error(`Sala con ID ${id} no encontrada para actualizar.`);
        }
        return { success: true, message: 'Sala actualizada correctamente.' };
    } catch (error) {
        console.error('Error en actualizarSala:', error);
        throw error;
    }
}

async function eliminarSalaConDependencias(id) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [clasesEnSalaRows] = await connection.query(
            `SELECT DISTINCT sh.clase_id 
             FROM sala_horario sh
             WHERE sh.sala_id = ?`,
            [id]
        );
        const claseIdsAfectadas = clasesEnSalaRows.map(row => row.clase_id);
        await connection.query("DELETE FROM sala_horario WHERE sala_id = ?", [id]);
        if (claseIdsAfectadas.length > 0) {
            const placeholders = claseIdsAfectadas.map(() => '?').join(',');
            const sqlDeleteClases = `DELETE FROM clases WHERE id IN (${placeholders})`;
            await connection.query(sqlDeleteClases, claseIdsAfectadas);
        }
        const [resultadoSala] = await connection.query('DELETE FROM salas WHERE id = ?', [id]);
        if (resultadoSala.affectedRows === 0) {
            await connection.rollback();
            throw new Error(`Sala con ID ${id} no encontrada para eliminar de la tabla 'salas'.`);
        }
        await connection.commit();
        return { success: true, message: 'Sala y todas sus clases/ensayos asociados eliminados correctamente.' };
    } catch (error) {
        await connection.rollback();
        console.error('Error en eliminarSalaConDependencias:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
             throw new Error(`No se puede eliminar la sala ID ${id}. Aunque se intentó borrar dependencias, alguna restricción persiste.`);
        }
        throw error;
    } finally {
        if (connection) connection.release();
    }
}