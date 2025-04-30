// controllers/paymentController.js

const Stripe = require('stripe');
const stripe = Stripe('sk_test_51Q9B1WRvmJhKXph8E7J0WFPn4YHYTWdFpC2IWQNvGjWXPrWEYm383yrBchAcnBKDE684ST9uBXAJ7Hf0dTXEpUPM00sERFPm3S');  // Asegúrate de usar la clave secreta de Stripe

exports.createPayment = async (req, res) => {
    const { payment_method_id, costo_total, id_usuario } = req.body;
    console.log("Datos recibidos en el backend:", req.body);  // Agregar este log para ver los datos
    try {
        if (!payment_method_id || !costo_total || !id_usuario) {
            throw new Error("Faltan datos necesarios para el pago.");
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: costo_total,
            currency: 'usd',
            payment_method: payment_method_id,
            confirm: true,
            setup_future_usage: 'off_session',  // Esto guardará el método de pago
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never'
            }
        });

        res.json({ success: true, message: 'Pago procesado exitosamente', client_secret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Error en el proceso de pago:', error);
        let errorMessage = 'Error al procesar el pago.';

        if (error.type === 'StripeCardError') {
            errorMessage = 'La tarjeta fue rechazada. Intenta con otra tarjeta.';
        } else if (error.type === 'StripeInvalidRequestError') {
            errorMessage = 'Error en los datos de la solicitud. Verifica la información proporcionada.';
        }

        res.status(400).json({ error: errorMessage });
    }
};
