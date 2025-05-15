const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { getReservacionesByUsuario, updateReservacion, deleteReservacion, obtenerReservacionPorId } = require('../controllers/reservacionController');
const reservacionController = require('../controllers/reservacionController');
const router = express.Router();

router.get('/usuario', authenticateToken, getReservacionesByUsuario);
router.post('/create', reservacionController.createReservacion);
//router.put('/update/:id_reservacion', authenticateToken, updateReservacion);
router.put('/update/:id', authenticateToken, updateReservacion);
router.delete('/cancel/:id_reservacion', authenticateToken, deleteReservacion);
router.get('/:id', obtenerReservacionPorId);
router.get('/', authenticateToken, reservacionController.getReservaciones);
router.get('/fechas-reservadas/:id_habitacion', reservacionController.getFechasReservadas);
router.get('/fechas-reservadas-paquete/:id_paquete', reservacionController.getFechasReservadasPaquete);
// Ruta para obtener el total de ingresos
router.get('/ingreso/ingresos-total', reservacionController.getTotalIngresos);
// Ruta para obtener el total de reservaciones por mes
router.get('/mensuales/reservaciones-por-mes', reservacionController.getReservacionesPorMes);
router.get('/promedio/promedio-dias', reservacionController.getPromedioDiasReservacion);





module.exports = router;

