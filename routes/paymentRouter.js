// routes/paymentRouter.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Ruta para procesar el pago
router.post('/create', paymentController.createPayment);

module.exports = router;
