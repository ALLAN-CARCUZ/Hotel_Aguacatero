const express = require('express');
const habitacionController = require('../controllers/habitacionController');
const router = express.Router();

// Ruta para crear una nueva habitación
router.post('/create', habitacionController.createHabitacion);

// Ruta para obtener todas las habitaciones
router.get('/', habitacionController.getHabitaciones);

// Ruta para actualizar una habitación
router.put('/update/:id', habitacionController.updateHabitacion);

// Ruta para eliminar una habitación
router.delete('/delete/:id', habitacionController.deleteHabitacion);

// Ruta para obtener una habitación por ID
router.get('/:id', habitacionController.getHabitacionById);

// Ruta para obtener las habitaciones más reservadas
router.get('/reservadas/habitaciones-mas-reservadas', habitacionController.getHabitacionesMasReservadas);



module.exports = router;
