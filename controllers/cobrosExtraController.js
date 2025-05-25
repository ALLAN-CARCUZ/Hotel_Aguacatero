const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const oracledb = require('oracledb');
const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION
};

async function CobroDiasExtra(req, res) {
    const { id_reservacion, nueva_fecha_salida } = req.body;

    if (!id_reservacion || !nueva_fecha_salida) {
        return res.status(400).json({ error: 'Faltan datos para calcular días extra.' });
    }

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const reservacionResult = await connection.execute(
            `SELECT FECHA_SALIDA, COSTO_TOTAL, FECHA_INGRESO, ID_HABITACION FROM RESERVACIONES WHERE ID_RESERVACION = :id`,
            { id: id_reservacion }
        );

        const [fecha_salida_original, costo_total_original, fecha_ingreso, id_habitacion] = reservacionResult.rows[0];

        const dias_originales = Math.ceil((fecha_salida_original - fecha_ingreso) / (1000 * 60 * 60 * 24));
        const dias_nuevos = Math.ceil((new Date(nueva_fecha_salida) - fecha_ingreso) / (1000 * 60 * 60 * 24));
        const dias_extra = dias_nuevos - dias_originales;

        if (dias_extra <= 0) {
            return res.status(400).json({ error: 'No se han agregado días adicionales.' });
        }

        const habitacionResult = await connection.execute(
            `SELECT PRECIO FROM HABITACIONES WHERE ID = :id`,
            { id: id_habitacion }
        );
        const costo_diario = habitacionResult.rows[0][0];

        const monto_extra = dias_extra * costo_diario;

        // Registrar el nuevo pago
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(monto_extra * 100),
            currency: 'gtq',
            payment_method_types: ['card'],
            description: `Cobro por ${dias_extra} día(s) extra en reservación #${id_reservacion}`
        });

        await connection.execute(
            `INSERT INTO PAGOS_EXTRA (ID_PAGO_EXTRA, ID_RESERVACION, MONTO, PAYMENT_INTENT_ID, FECHA) 
             VALUES (SEQ_PAGOS_EXTRA.NEXTVAL, :id, :monto, :pid, SYSDATE)`,
            {
                id: id_reservacion,
                monto: monto_extra,
                pid: paymentIntent.id
            },
            { autoCommit: true }
        );

        res.status(200).json({ mensaje: 'Cobro por días extra realizado con éxito.', client_secret: paymentIntent.client_secret });

    } catch (error) {
        console.error('Error al procesar cobro por días extra:', error);
        res.status(500).json({ error: 'No se pudo procesar el cobro por días extra.' });
    } finally {
        if (connection) await connection.close();
    }
}


async function CobroExtra(req, res) {
    const { id_reservacion, servicios_agregados } = req.body;

    if (!id_reservacion || !Array.isArray(servicios_agregados) || servicios_agregados.length === 0) {
        return res.status(400).json({ error: 'Faltan datos o lista de servicios es inválida.' });
    }

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const reservacionResult = await connection.execute(
            `SELECT COSTO_TOTAL FROM RESERVACIONES WHERE ID_RESERVACION = :id_reservacion`,
            { id_reservacion }
        );
        const costoActual = reservacionResult.rows[0][0];

        const placeholders = servicios_agregados.map((_, i) => `:s${i}`).join(',');
        const servicioQuery = `SELECT COSTO FROM SERVICIOS WHERE ID IN (${placeholders})`;
        const servicioResult = await connection.execute(
            servicioQuery,
            Object.fromEntries(servicios_agregados.map((v, i) => [`s${i}`, v]))
        );
        const costoServiciosNuevos = servicioResult.rows.reduce((sum, row) => sum + row[0], 0);

        const nuevo_costo_total = costoActual + costoServiciosNuevos;

        req.body.nuevo_costo_total = nuevo_costo_total;

        await realizarCobroExtra(req, res, connection);  // Llamada a función externa

    } catch (error) {
        console.error("Error al agregar servicios y cobrar:", error);
        res.status(500).json({ error: 'No se pudo completar el cobro por los nuevos servicios.' });
    } finally {
        if (connection) await connection.close();
    }
};

async function realizarCobroExtra(req, res, connection) {
    const { id_reservacion, nuevo_costo_total } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(nuevo_costo_total * 100), // Stripe usa centavos
        currency: 'gtq', // si estás usando quetzales
        payment_method_types: ['card'],
        description: `Cobro extra para reservación #${id_reservacion}`
    });

    // Ejemplo simulado:
    await connection.execute(
        `INSERT INTO PAGOS_EXTRA (ID_PAGO_EXTRA, ID_RESERVACION, MONTO, PAYMENT_INTENT_ID, FECHA) 
         VALUES (SEQ_PAGOS_EXTRA.NEXTVAL, :id_reservacion, :monto, :pid, SYSDATE)`,
        {   
            id_reservacion,
            monto: nuevo_costo_total,
            pid: paymentIntent.id
        },
        { autoCommit: true }
    );

    res.status(200).json({ mensaje: 'Cobro extra realizado con éxito.', client_secret: paymentIntent.client_secret });
}

// En cobrosExtraController.js
async function solicitarPagoModificacionController(req, res) {
    const { id_reservacion, monto_adicional_en_centavos } = req.body; // O datos para calcularlo

    if (!id_reservacion || monto_adicional_en_centavos === undefined || monto_adicional_en_centavos <= 0) {
        return res.status(400).json({ error: 'ID de reservación y monto adicional positivo son requeridos.' });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: monto_adicional_en_centavos,
            currency: 'usd', // o 'gtq' si es la moneda correcta
            payment_method_types: ['card'],
            description: `Cobro adicional por modificación de reservación #${id_reservacion}`
            // metadata: { id_reservacion: id_reservacion } // Útil para seguimiento
        });

        // NO guardas nada en PAGOS_EXTRA aquí todavía, eso se hace DESPUÉS de que el pago se confirma.
        // Solo devuelves el client_secret.
        res.status(200).json({
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id // Devuelves el ID para guardarlo luego
        });

    } catch (error) {
        console.error('Error al crear PaymentIntent para cobro adicional:', error);
        res.status(500).json({ error: 'No se pudo crear el intento de pago para el cobro adicional.' });
    }
}

module.exports = {
    CobroExtra,
    CobroDiasExtra,
    solicitarPagoModificacionController 
};