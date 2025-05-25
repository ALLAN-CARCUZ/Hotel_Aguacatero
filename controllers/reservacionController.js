const reservacionModel = require('../models/reservacionModel');
const { getUserById } = require('../models/usuarioModel');
const { getServicioById } = require('../models/servicioModel');
const nodemailer = require('nodemailer');
console.log("Stripe key:", process.env.STRIPE_SECRET_KEY);
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const oracledb = require('oracledb');
const dbConfig = { // O importa tu configuración de dbConfig
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION
};

// Configurar el transporte para enviar correos
const transporter = nodemailer.createTransport({
    service: 'gmail',  // Puedes usar otro servicio si lo prefieres
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

async function createReservacion(req, res) {
    // Añadir payment_intent_id a la desestructuración
    const { id_usuario, id_habitacion, id_paquete, costo_total, metodo_pago, fecha_ingreso, fecha_salida, servicios = [], payment_intent_id } = req.body;

    console.log("Datos recibidos para crear reservación:", req.body);

    if (!id_usuario || (!id_paquete && !id_habitacion) || !costo_total || !metodo_pago || !fecha_ingreso || !fecha_salida) {
        return res.status(400).json({ error: 'Debes seleccionar una habitación o un paquete, y proporcionar todos los campos requeridos' });
    }

    try {
                // Verificar si el paquete está disponible
                if (id_paquete) {
                    const paqueteDisponible = await reservacionModel.checkDisponibilidadPaquete(id_paquete, fecha_ingreso, fecha_salida);
                    if (!paqueteDisponible.length === 0) {
                        return res.status(400).json({ error: 'El paquete no está disponible para las fechas seleccionadas' });
                    }
                }


        // Verificar si la habitación está disponible
        if (id_habitacion) {
            const habitacionDisponible = await isHabitacionDisponible(id_habitacion, fecha_ingreso, fecha_salida);
            if (!habitacionDisponible) {
                return res.status(400).json({ error: 'La habitación no está disponible para las fechas seleccionadas' });
            }
        }
        // Intentar crear la reservación
        const result = await reservacionModel.createReservacion(id_usuario, id_habitacion, id_paquete, costo_total, metodo_pago, fecha_ingreso, fecha_salida, servicios, payment_intent_id);
        if (!result.success) { // El modelo ahora devuelve un objeto con 'success'
            return res.status(500).json({ error: result.message || 'Error al guardar la reservación en el modelo.' });
        }
        const usuario = await getUserById(id_usuario);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const correoCliente = usuario.correo;

        // Preparar el contenido del correo
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: correoCliente,
            subject: 'Confirmación de reservación - Hotel El Aguacatero',
            text: `Estimado/a ${usuario.nombre},\n\nSu reservación ha sido creada exitosamente. Aquí están los detalles:\n\n
            ${id_paquete ? `Paquete ID: ${id_paquete}` : `Habitación: ${id_habitacion}`}\n
            Fecha de entrada: ${fecha_ingreso}\n
            Fecha de salida: ${fecha_salida}\n
            Servicios adicionales: ${servicios.length > 0 ? servicios.join(', ') : 'Ninguno'}\n
            Total: Q${costo_total.toFixed(2)}\n\n
            ¡Gracias por elegir nuestro hotel!`
        };

        // Enviar el correo
        await transporter.sendMail(mailOptions);

        // Si la reservación incluye un servicio especial (1, 2, 3, 4 o 5), enviar el correo adicional
        const serviciosEspeciales = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const servicioSolicitado = servicios.find(servicio => serviciosEspeciales.includes(servicio));

        if (servicioSolicitado) {
            // Obtener el nombre del servicio solicitado
            const servicioInfo = await getServicioById(servicioSolicitado);
            const nombreServicio = servicioInfo ? servicioInfo.nombre : 'Servicio desconocido';

            // Preparar el correo para medicappcom@gmail.com
            const mailOptionsEspecial = {
                from: process.env.EMAIL_USER,
                to: 'medicappcom@gmail.com',
                subject: 'Notificación de Servicio Especial Solicitado',
                text: `Se ha solicitado el servicio: ${nombreServicio} para la habitación con ID: ${id_habitacion}.`
            };

            // Enviar el correo a medicappcom@gmail.com
            await transporter.sendMail(mailOptionsEspecial);
        }

        // Si la reservación se crea exitosamente, responder con éxito y finalizar el flujo
        return res.status(201).json({ message: 'Reservación creada exitosamente, y correos enviados.', id_reservacion: result.id_reservacion });

    } catch (error) {
        console.error("Error al crear la reservación:", error);
        return res.status(500).json({ error: 'Error al crear la reservación: ' + error.message });
    }
}





// Función para obtener las reservaciones del usuario autenticado
async function getReservacionesByUsuario(req, res) {
    const id_usuario = req.user.id;

    try {
        const reservaciones = await reservacionModel.getReservacionesByUsuario(id_usuario);
        res.status(200).json(reservaciones);
    } catch (error) {
        console.error('Error al obtener las reservaciones del usuario:', error);
        res.status(500).json({ error: error.message });
    }
}



// Obtener todas las reservaciones (GET)
async function getReservaciones(req, res) {
    try {
        const reservaciones = await reservacionModel.getReservaciones();  // Obtener todas las reservaciones desde el modelo
        res.status(200).json(reservaciones);  // Devolver las reservaciones en formato JSON
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


// Actualizar una reservación (PUT)
async function updateReservacion(req, res) {
    const { id } = req.params;  // Aquí estamos obteniendo el ID de los parámetros de la URL
    const { id_habitacion, id_paquete, costo_total, metodo_pago, fecha_ingreso, fecha_salida, servicios } = req.body;

    console.log('ID de la reservación:', id);  // Verifica si el ID se está recibiendo correctamente
        // Agrega este log para verificar si el ID se recibe correctamente
        console.log('ID recibido en params:', req.params.id);

    if (!id || !id_habitacion || !costo_total || !metodo_pago || !fecha_ingreso || !fecha_salida) {
        return res.status(400).json({ error: 'Todos los campos son requeridos, incluyendo el ID de la reservación' });
    }

    try {
        const result = await reservacionModel.updateReservacion(id, id_habitacion, id_paquete, costo_total, metodo_pago, fecha_ingreso, fecha_salida, servicios);
        res.status(200).json({ message: 'Reservación actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


async function deleteReservacion(req, res) {
    const { id_reservacion } = req.params;
    console.log("Iniciando proceso de cancelación para reservación ID:", id_reservacion);

    if (!id_reservacion) {
        return res.status(400).json({ error: 'El ID de la reservación es requerido' });
    }

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        // No hay connection.begin() en node-oracledb, la transacción se maneja con commit/rollback

        const reservacionDataResult = await connection.execute(
            `SELECT payment_intent_id, metodo_pago, costo_total, id_usuario, fecha_ingreso
             FROM RESERVACIONES
             WHERE ID_RESERVACION = :id`,
            [id_reservacion],
            { autoCommit: false } // Para que sea parte de la transacción general
        );

        if (reservacionDataResult.rows.length === 0) {
            return res.status(404).json({ error: 'Reservación no encontrada' });
        }

        const reservacionOriginal = reservacionDataResult.rows[0];
        const payment_intent_id = reservacionOriginal[0];
        const metodo_pago = reservacionOriginal[1];
        const costo_total_reservacion = reservacionOriginal[2];
        const id_usuario_reservacion = reservacionOriginal[3];
        // const fecha_ingreso_reservacion = reservacionOriginal[4]; // Puedes usarla para políticas de cancelación

        let mensajeReembolso = "No se requirió reembolso por Stripe o la reservación no calificaba para ello.";
        let refundIdStripe = null;
        let estadoFinalReservacion = 'Cancelada'; // Estado por defecto para todas las cancelaciones

        if (metodo_pago === 'tarjeta' && payment_intent_id) {
            try {
                console.log(`Intentando reembolso para Payment Intent: ${payment_intent_id}`);
                const refund = await stripe.refunds.create({
                    payment_intent: payment_intent_id,
                    reason: 'requested_by_customer',
                });
                refundIdStripe = refund.id;
                mensajeReembolso = `Reembolso procesado exitosamente (ID Stripe: ${refundIdStripe}).`;
                estadoFinalReservacion = 'CanceladaReembolsada';
                console.log(`Reembolso ${refundIdStripe} creado para PI: ${payment_intent_id}`);

                // Actualizar con datos del reembolso
                await connection.execute(
                    `UPDATE RESERVACIONES
                     SET stripe_refund_id = :stripe_refund_id, estado_reservacion = :estado
                     WHERE ID_RESERVACION = :id_r`,
                    { stripe_refund_id: refundIdStripe, estado: estadoFinalReservacion, id_r: id_reservacion },
                    { autoCommit: false }
                );

            } catch (reembolsoError) {
                console.error(`Error al procesar reembolso para PI ${payment_intent_id}:`, reembolsoError);
                mensajeReembolso = `Error al procesar el reembolso: ${reembolsoError.message}. Contacte a soporte.`;
                estadoFinalReservacion = 'CanceladaErrorReembolso';
                await connection.execute(
                    `UPDATE RESERVACIONES
                     SET estado_reservacion = :estado, notas_admin = :notas
                     WHERE ID_RESERVACION = :id_r`,
                    { estado: estadoFinalReservacion, notas: `Error Stripe: ${reembolsoError.message}`, id_r: id_reservacion },
                    { autoCommit: false }
                );
            }
        } else {
            console.log(`Reservación ID: ${id_reservacion}. Método de pago: ${metodo_pago || 'No especificado'}. Payment Intent ID: ${payment_intent_id || 'N/A'}. Marcando como Cancelada.`);
            const updateResult = await connection.execute( // Guardar resultado
                `UPDATE RESERVACIONES SET ESTADO_RESERVACION = :estado WHERE ID_RESERVACION = :id_r`,
                { estado: estadoFinalReservacion, id_r: id_reservacion },
                { autoCommit: false }
            );
            console.log(`Resultado del UPDATE de estado para reservación ${id_reservacion}:`, updateResult); // <--- LOG NUEVO
        }

        // Opcional: Eliminar servicios asociados si esa es tu política incluso para reservaciones solo marcadas como canceladas.
        await reservacionModel.deleteReservacionServicios(id_reservacion, connection);
        console.log("Relaciones de servicios (si las hubo) eliminadas para la reservación:", id_reservacion);

        // NO ELIMINAMOS LA FILA DE LA TABLA RESERVACIONES, solo actualizamos su estado.

        const usuario = await getUserById(id_usuario_reservacion);
        if (usuario && usuario.correo) {
            const mailOptionsCancelacion = {
                from: process.env.EMAIL_USER,
                to: usuario.correo,
                subject: 'Confirmación de Cancelación de Reservación - Hotel El Aguacatero',
                text: `Estimado/a ${usuario.nombre},\n\n` +
                      `Su reservación con ID ${id_reservacion} ha sido cancelada.\n` +
                      `${(metodo_pago === 'tarjeta' && payment_intent_id && refundIdStripe) ? `Se ha procesado un reembolso a su método de pago original. Este puede tardar varios días hábiles en reflejarse en su cuenta. ID del Reembolso Stripe: ${refundIdStripe}.\n` : ''}` +
                      `Detalles adicionales: ${mensajeReembolso}\n\n` +
                      `Lamentamos cualquier inconveniente.\n\n` +
                      `Atentamente,\nEl Equipo del Hotel El Aguacatero`
            };
            transporter.sendMail(mailOptionsCancelacion, (mailError, info) => {
                if(mailError) {
                    console.error(`Error al enviar correo de cancelación a ${usuario.correo}:`, mailError);
                } else {
                    console.log(`Correo de cancelación enviado a ${usuario.correo}: ${info.response}`);
                }
            });
        }

        await connection.commit(); // Confirmar la transacción (que incluye el UPDATE del estado)

        res.status(200).json({
            message: `Proceso de cancelación para reservación ${id_reservacion} completado. ${mensajeReembolso}`,
            refund_id: refundIdStripe
        });

    } catch (error) {
        console.error("Error durante la cancelación:", error);
        if (connection) {
            try { await connection.rollback(); } catch (rollbackError) { console.error("Error al hacer rollback:", rollbackError); }
        }
        res.status(500).json({ error: 'Error interno del servidor durante la cancelación: ' + error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (closeError) { console.error("Error al cerrar la conexión:", closeError); }
        }
    }
}


const obtenerReservacionPorId = async (req, res) => {
    const { id } = req.params;
    console.log(`Buscando reservación con ID: ${id}`);
    try {
        const reservacion = await reservacionModel.findByPk(id);  // Cambiamos a `reservacionModel.findByPk`
        
        if (!reservacion) {
            return res.status(404).json({ error: 'Reservación no encontrada' });
        }
        res.json(reservacion);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la reservación' });
    }
};


async function isHabitacionDisponible(id_habitacion, fecha_ingreso, fecha_salida) {
    try {
        const result = await reservacionModel.checkDisponibilidadHabitacion(id_habitacion, fecha_ingreso, fecha_salida);
        return result.length === 0;  // Si no hay resultados, la habitación está disponible
    } catch (error) {
        throw new Error('Error al verificar la disponibilidad de la habitación: ' + error.message);
    }
}

// Obtener fechas reservadas para una habitación
async function getFechasReservadas(req, res) {
    const { id_habitacion } = req.params;

    try {
        // Obtener las fechas reservadas de la base de datos
        const fechasReservadas = await reservacionModel.getFechasReservadasByHabitacion(id_habitacion);
        res.status(200).json(fechasReservadas);
    } catch (error) {
        console.error('Error al obtener las fechas reservadas:', error);
        res.status(500).json({ error: 'Error al obtener las fechas reservadas' });
    }
}

async function getFechasReservadasPaquete(req, res) {
    const { id_paquete } = req.params;

    try {
        // Obtener las fechas reservadas de la base de datos
        const fechasReservadas = await reservacionModel.getFechasReservadasByPaquete(id_paquete);
        res.status(200).json(fechasReservadas);
    } catch (error) {
        console.error('Error al obtener las fechas reservadas del paquete:', error);
        res.status(500).json({ error: 'Error al obtener las fechas reservadas' });
    }
}


async function getTotalIngresos(req, res) {
    try {
        const totalIngresos = await reservacionModel.getTotalIngresos();
        res.json({ totalIngresos });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el total de ingresos' });
    }
}


async function getReservacionesPorMes(req, res) {
    try {
        const reservaciones = await reservacionModel.getReservacionesPorMes();
        const labels = [];
        const values = [];

        // Configurar los meses en un arreglo para ordenar de enero a diciembre
        const meses = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
        const dataPorMes = meses.map(mes => ({ mes, cantidad: 0 }));

        reservaciones.forEach(row => {
            const mesIndex = dataPorMes.findIndex(d => d.mes === row[0]);
            if (mesIndex !== -1) {
                dataPorMes[mesIndex].cantidad = row[1];
            }
        });

        dataPorMes.forEach(d => {
            labels.push(d.mes);
            values.push(d.cantidad);
        });

        res.json({ labels, values });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las reservaciones por mes' });
    }
}



async function getPromedioDiasReservacion(req, res) {
    try {
        const promedio = await reservacionModel.getPromedioDiasReservacion();
        res.json({ promedio });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el promedio de días de estadía' });
    }
}


module.exports = {
    createReservacion,
    getReservaciones,
    updateReservacion,
    deleteReservacion,
    getReservacionesByUsuario,
    obtenerReservacionPorId,
    isHabitacionDisponible,
    getFechasReservadas,
    getFechasReservadasPaquete,
    getTotalIngresos,
    getReservacionesPorMes,
    getPromedioDiasReservacion
};


