// habitacionController.js
const habitacionModel = require('../models/habitacionModel');

// Crear una nueva habitación
async function createHabitacion(req, res) {
    const { nombre, descripcion, precio, imagen } = req.body;
    if (!nombre || !precio || !imagen) {
        return res.status(400).json({ error: 'Nombre, precio e imagen son requeridos' });
    }
    try {
        const result = await habitacionModel.createHabitacion(nombre, descripcion, precio, imagen);
        res.status(201).json({ message: 'Habitación creada exitosamente', result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Obtener todas las habitaciones
async function getHabitaciones(req, res) {
    try {
        const habitaciones = await habitacionModel.getHabitaciones();
        res.json(habitaciones);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Actualizar una habitación
async function updateHabitacion(req, res) {
    const { id } = req.params;
    const { nombre, descripcion, precio, imagen } = req.body;
    if (!nombre || !precio || !imagen) {
        return res.status(400).json({ error: 'Nombre, precio e imagen son requeridos' });
    }
    try {
        const result = await habitacionModel.updateHabitacion(id, nombre, descripcion, precio, imagen);
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Habitación no encontrada' });
        }
        res.status(200).json({ message: 'Habitación actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Eliminar una habitación
async function deleteHabitacion(req, res) {
    const { id } = req.params;
    try {
        const result = await habitacionModel.deleteHabitacion(id);
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Habitación no encontrada' });
        }
        res.status(200).json({ message: 'Habitación eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


// Obtener una habitación por ID
async function getHabitacionById(req, res) {
    const { id } = req.params;
    try {
        const habitacion = await habitacionModel.getHabitacionById(id);
        if (!habitacion) {
            return res.status(404).json({ error: 'Habitación no encontrada' });
        }
        res.json(habitacion);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


async function getHabitacionesMasReservadas(req, res) {
    try {
        const habitaciones = await habitacionModel.getHabitacionesMasReservadas();
        const labels = [];
        const values = [];

        habitaciones.forEach(row => {
            labels.push(row[0]);  // Nombres de las habitaciones
            values.push(row[1]);  // Número de reservaciones
        });

        res.json({ labels, values });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las habitaciones más reservadas' });
    }
}

module.exports = { 
    createHabitacion, 
    getHabitaciones, 
    updateHabitacion, 
    deleteHabitacion, 
    getHabitacionById,
    getHabitacionesMasReservadas  // Añadir este método a las exportaciones
};

