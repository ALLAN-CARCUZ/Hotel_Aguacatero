const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/', paymentController.createPayment);
router.post('/create-intent', paymentController.crearIntentoDePago);
router.post('/actualizar-intent', paymentController.actualizarPaymentIntent);
router.post('/realizar-pago', paymentController.createPayment);
router.post('/reembolso/:id', paymentController.reembolsarPago);


module.exports = router;
