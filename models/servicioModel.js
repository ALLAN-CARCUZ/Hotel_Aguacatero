// servicioModel.js
const oracledb = require('oracledb');
const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION
};

// Crear un nuevo servicio
async function createServicio(nombre, descripcion, costo, imagen) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `INSERT INTO servicios (id, nombre, descripcion, costo, imagen) 
             VALUES (ADMIN.SEQ_SERVICIOS.NEXTVAL, :nombre, :descripcion, :costo, :imagen)`,
            { 
                nombre, 
                descripcion, 
                costo, 
                imagen: Buffer.from(imagen, 'base64')  // Convertir imagen base64 a Blob
            },  
            { autoCommit: true }
        );
        return result;
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

// Obtener todos los servicios
async function getServicios() {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT id, nombre, descripcion, costo, imagen FROM servicios`);

        return await Promise.all(result.rows.map(async row => {
            let imagenBase64 = '';
            if (row[4]) { // row[4] es el BLOB de la imagen
                const buffer = await row[4].getData(); // Obtener los datos del BLOB
                imagenBase64 = buffer.toString('base64'); // Convertir buffer a base64
            }
            return {
                id: row[0],
                nombre: row[1],
                descripcion: row[2],
                costo: row[3],
                imagen: imagenBase64 // Devolver la imagen como cadena base64
            };
        }));
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

// Actualizar un servicio
async function updateServicio(id, nombre, descripcion, costo, imagen) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `UPDATE servicios SET nombre = :nombre, descripcion = :descripcion, costo = :costo, imagen = :imagen 
             WHERE id = :id`,
            { nombre, descripcion, costo, imagen: Buffer.from(imagen, 'base64'), id },
            { autoCommit: true }
        );
        return result;
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

// Eliminar un servicio
async function deleteServicio(id) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `DELETE FROM servicios WHERE id = :id`,
            { id },
            { autoCommit: true }
        );
        return result;
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

// Buscar un servicio por ID
async function getServicioById(id) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT id, nombre, descripcion, costo, imagen FROM servicios WHERE id = :id`,
            { id }
        );

        if (result.rows.length === 0) {
            return null; // Retornar null si no se encuentra ningún servicio con ese ID
        }

        const row = result.rows[0];
        let imagenBase64 = '';
        if (row[4]) { // row[4] es el BLOB de la imagen
            const buffer = await row[4].getData(); // Obtener los datos del BLOB
            imagenBase64 = buffer.toString('base64'); // Convertir buffer a base64
        }

        // Devolver el servicio encontrado
        return {
            id: row[0],
            nombre: row[1],
            descripcion: row[2],
            costo: row[3],
            imagen: imagenBase64 // Devolver la imagen como cadena base64
        };
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

async function getServiciosMasUtilizados() {
    let connection;
    
    try {
        connection = await oracledb.getConnection(dbConfig);
        
        const result = await connection.execute(`
            SELECT S.NOMBRE, COUNT(RS.ID_RESERVACION) AS USO
            FROM SERVICIOS S
            JOIN RESERVACIONES_SERVICIOS RS ON S.ID = RS.ID_SERVICIO
            GROUP BY S.NOMBRE
            ORDER BY USO DESC
        `);

        return result.rows;

    } catch (error) {
        throw new Error('Error al obtener los servicios más utilizados: ' + error.message);
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

  


module.exports = { createServicio, getServicios, updateServicio, deleteServicio, getServicioById, getServiciosMasUtilizados };
