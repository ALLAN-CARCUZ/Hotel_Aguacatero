const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuarioModel');

async function loginUsuario(req, res) {
    const { email, password } = req.body;

    // Buscar usuario por email
    const user = await usuarioModel.findByEmail(email);
    if (!user) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Verificar la contraseña con bcrypt
    console.log('Contraseña proporcionada por el usuario:', password);
    console.log('Contraseña encriptada en la base de datos:', user.password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Resultado de la comparación de contraseñas:', isMatch);

    if (!isMatch) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Crear el token con el rol del usuario
    const token = jwt.sign({ id: user.id, rol: user.rol, nombre: user.nombre }, process.env.JWT_SECRET, { expiresIn: '2m' });

    // Devolver token y nombre de usuario en la respuesta
    res.json({ 
        token,
        username: user.nombre // Aquí se incluye el nombre del usuario si fuera necesario
    });
    console.log(user.nombre);  // Depuración para verificar el nombre
}

module.exports = { loginUsuario };

