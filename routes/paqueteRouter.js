// paqueteRouter.js
const express = require('express');
const paqueteController = require('../controllers/paqueteController');
const router = express.Router();

// Ruta para crear un nuevo paquete
router.post('/create', paqueteController.createPaquete);

// Ruta para obtener todos los paquetes
router.get('/', paqueteController.getPaquetes);

// Ruta para actualizar un paquete
router.put('/update/:id', paqueteController.updatePaquete);

// Ruta para eliminar un paquete
router.delete('/delete/:id', paqueteController.deletePaquete);

// Ruta para obtener habitaciones y servicios
router.get('/datos/formulario', paqueteController.getHabitacionesYServicios);

// Nueva ruta para obtener un paquete por su ID
router.get('/:id', paqueteController.getPaqueteById);


module.exports = router;
