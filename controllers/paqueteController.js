// paqueteController.js
const paqueteModel = require('../models/paqueteModel');
const habitacionModel = require('../models/habitacionModel'); // Para obtener habitaciones
const servicioModel = require('../models/servicioModel');     // Para obtener servicios

// Crear un nuevo paquete
async function createPaquete(req, res) {
    const { nombre, descripcion, precio, imagen, habitacion_id, servicios, descuento } = req.body;
    if (!nombre || !precio || !habitacion_id || !servicios || servicios.length === 0) {
        return res.status(400).json({ error: 'Nombre, precio, habitación y servicios son requeridos' });
    }
    try {
        const result = await paqueteModel.createPaquete(nombre, descripcion, precio, imagen, habitacion_id, servicios, descuento);
        res.status(201).json({ message: 'Paquete creado exitosamente', result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Obtener todos los paquetes
async function getPaquetes(req, res) {
    try {
        const paquetes = await paqueteModel.getPaquetes();
        res.json(paquetes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Actualizar un paquete
async function updatePaquete(req, res) {
    const { id } = req.params;
    const { nombre, descripcion, precio, imagen, habitacion_id, servicios, descuento } = req.body;
    if (!nombre || isNaN(precio) || !habitacion_id || servicios.length === 0) {
        return res.status(400).json({ error: 'Nombre, precio válido, habitación y servicios son requeridos' });
    }
    try {
        const result = await paqueteModel.updatePaquete(id, nombre, descripcion, precio, imagen, habitacion_id, servicios, descuento);
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Paquete no encontrado' });
        }
        res.status(200).json({ message: 'Paquete actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Eliminar un paquete
async function deletePaquete(req, res) {
    const { id } = req.params;
    try {
        const result = await paqueteModel.deletePaquete(id);
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Paquete no encontrado' });
        }
        res.status(200).json({ message: 'Paquete eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Obtener habitaciones y servicios para el formulario
async function getHabitacionesYServicios(req, res) {
    try {
        const habitaciones = await habitacionModel.getHabitaciones();
        const servicios = await servicioModel.getServicios();
        res.json({ habitaciones, servicios });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Obtener un paquete por ID
async function getPaqueteById(req, res) {
    const { id } = req.params;
    try {
        const paquete = await paqueteModel.getPaqueteById(id); // Crear una nueva función en paqueteModel
        if (!paquete) {
            return res.status(404).json({ error: 'Paquete no encontrado' });
        }
        res.json(paquete);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { createPaquete, getPaquetes, getPaqueteById, updatePaquete, deletePaquete, getHabitacionesYServicios };
