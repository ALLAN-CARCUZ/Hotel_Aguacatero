// servicioController.js
const servicioModel = require('../models/servicioModel');

// Crear un nuevo servicio
async function createServicio(req, res) {
    const { nombre, descripcion, costo, imagen } = req.body;
    if (!nombre || !costo || !imagen) {
        return res.status(400).json({ error: 'Nombre, costo e imagen son requeridos' });
    }
    try {
        const result = await servicioModel.createServicio(nombre, descripcion, costo, imagen);
        res.status(201).json({ message: 'Servicio creado exitosamente', result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Obtener todos los servicios
async function getServicios(req, res) {
    try {
        const servicios = await servicioModel.getServicios();
        res.json(servicios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Actualizar un servicio
async function updateServicio(req, res) {
    const { id } = req.params;
    const { nombre, descripcion, costo, imagen } = req.body;
    if (!nombre || !costo || !imagen) {
        return res.status(400).json({ error: 'Nombre, costo e imagen son requeridos' });
    }
    try {
        const result = await servicioModel.updateServicio(id, nombre, descripcion, costo, imagen);
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }
        res.status(200).json({ message: 'Servicio actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Eliminar un servicio
async function deleteServicio(req, res) {
    const { id } = req.params;
    try {
        const result = await servicioModel.deleteServicio(id);
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }
        res.status(200).json({ message: 'Servicio eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Buscar un servicio por ID
async function getServicioById(req, res) {
    const { id } = req.params;
    try {
        const servicio = await servicioModel.getServicioById(id);
        if (!servicio) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }
        res.json(servicio);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


async function getServiciosMasUtilizados(req, res) {
    try {
      const servicios = await servicioModel.getServiciosMasUtilizados();
      
      const labels = [];
      const values = [];
  
      servicios.forEach(row => {
        labels.push(row[0]);  // Nombre del servicio
        values.push(row[1]);  // Número de veces utilizado
      });
  
      res.json({ labels, values });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los servicios más utilizados' });
    }
  }


module.exports = { createServicio, getServicios, updateServicio, deleteServicio, getServicioById, getServiciosMasUtilizados };
