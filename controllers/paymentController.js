const oracledb = require('oracledb'); // Agrega esta línea si no estaba
const stripe = require('stripe');

const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION
};

exports.crearIntentoDePago = async (req, res) => {
    const { amount } = req.body;

    try {
        const stripe = stripeLib(process.env.STRIPE_SECRET_KEY || '');
        const intent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
            payment_method_types: ['card'],
        });

        res.json({
            success: true,
            client_secret: intent.client_secret,
            payment_intent_id: intent.id
        });
    } catch (error) {
        console.error('Error al crear el intento de pago:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.createPayment = async (req, res) => {
    const { payment_method_id, costo_total, id_usuario, id_reservacion } = req.body;
    console.log("Datos recibidos en el backend:", req.body);

    let connection;
    try {
        const stripe = stripeLib(process.env.STRIPE_SECRET_KEY || '');
        if (!payment_method_id || !costo_total || !id_usuario || !id_reservacion) {
            throw new Error("Faltan datos necesarios para el pago.");
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: costo_total,
            currency: 'usd',
            payment_method: payment_method_id,
            confirm: true,
            setup_future_usage: 'off_session',
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never'
            }
        });

        connection = await oracledb.getConnection(dbConfig);
        await connection.execute(
            `UPDATE reservaciones
             SET payment_intent_id = :payment_intent_id
             WHERE id_reservacion = :id_reservacion`,
            {
                payment_intent_id: paymentIntent.id,
                id_reservacion
            },
            { autoCommit: true }
        );

        res.json({
            success: true,
            message: 'Pago procesado exitosamente',
            client_secret: paymentIntent.client_secret
        });

    } catch (error) {
        console.error('Error en el proceso de pago:', error);
        let errorMessage = 'Error al procesar el pago.';

        if (error.type === 'StripeCardError') {
            errorMessage = 'La tarjeta fue rechazada. Intenta con otra tarjeta.';
        } else if (error.type === 'StripeInvalidRequestError') {
            errorMessage = 'Error en los datos de la solicitud. Verifica la información proporcionada.';
        }

        res.status(400).json({ error: errorMessage });
    } finally {
        if (connection) await connection.close();
    }
};

exports.reembolsarPago = async (req, res) => {
    const id_reservacion = req.params.id;

    let connection;
    try {
        const stripe = stripeLib(process.env.STRIPE_SECRET_KEY || '');
        connection = await oracledb.getConnection(dbConfig);

        const result = await connection.execute(
            `SELECT payment_intent_id FROM reservaciones WHERE id_reservacion = :id`,
            [id_reservacion]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reservación no encontrada' });
        }

        const payment_intent_id = result.rows[0][0];

        if (!payment_intent_id) {
            return res.status(400).json({ error: 'Esta reservación no tiene un payment_intent registrado' });
        }

        const refund = await stripe.refunds.create({
            payment_intent: payment_intent_id
        });

        // GUARDAR el ID del reembolso en STRIPE_PAYMENT_ID
        await connection.execute(
            `UPDATE reservaciones SET stripe_payment_id = :stripe_payment_id WHERE id_reservacion = :id_reservacion`,
            {
                stripe_payment_id: refund.id,
                id_reservacion
            },
            { autoCommit: true }
        );

        res.status(200).json({ success: true, message: 'Reembolso exitoso', refund_id: refund.id });

    } catch (err) {
        console.error('Error al procesar el reembolso:', err);
        res.status(500).json({ error: 'Error al procesar el reembolso' });
    } finally {
        if (connection) await connection.close();
    }
};


exports.actualizarPaymentIntent = async (req, res) => {
    console.log('BODY RECIBIDO:', req.body);
    const { payment_method_id, costo_total, id_usuario, id_reservacion, payment_intent_id } = req.body;

    if (!payment_method_id || !costo_total || !id_usuario || !id_reservacion) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        await connection.execute(
            `UPDATE reservaciones SET payment_intent_id = :payment_intent_id WHERE id_reservacion = :id_reservacion`,
            { payment_intent_id, id_reservacion },
            { autoCommit: true }
        );
        res.status(200).json({ success: true, message: 'Intento de pago actualizado' });
    } catch (error) {
        console.error('Error al actualizar el intento de pago:', error);
        res.status(500).json({ error: 'Error al actualizar el intento de pago' });
    } finally {
        if (connection) await connection.close();
    }
};
