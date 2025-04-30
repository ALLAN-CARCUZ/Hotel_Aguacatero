// paqueteModel.js
const oracledb = require('oracledb');
const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION
};

// Crear un nuevo paquete
async function createPaquete(nombre, descripcion, precio, imagen, habitacion_id, servicios, descuento) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        // Insertar en la tabla 'paquetes'
        const paqueteResult = await connection.execute(
            `INSERT INTO paquetes (id, nombre, descripcion, precio, imagen, habitacion_id, descuento)
             VALUES (paquetes_seq.NEXTVAL, :nombre, :descripcion, :precio, :imagen, :habitacion_id, :descuento)
             RETURNING id INTO :id`,
            {
                nombre,
                descripcion,
                precio,
                imagen: imagen ? Buffer.from(imagen, 'base64') : null,
                habitacion_id,
                descuento,  // Incluimos el descuento
                id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            },
            { autoCommit: false }
        );

        const paqueteId = paqueteResult.outBinds.id[0];

        // Insertar en la tabla 'paquetes_servicios'
        for (const servicioId of servicios) {
            await connection.execute(
                `INSERT INTO paquetes_servicios (paquete_id, servicio_id)
                 VALUES (:paquete_id, :servicio_id)`,
                { paquete_id: paqueteId, servicio_id: servicioId },
                { autoCommit: false }
            );
        }

        await connection.commit();
        return paqueteResult;
    } catch (error) {
        if (connection) await connection.rollback();
        throw error;
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}


// Función auxiliar para convertir LOB a Buffer
function lobToBuffer(lob) {
    return new Promise((resolve, reject) => {
        let chunks = [];
        lob.on('data', chunk => {
            chunks.push(chunk);
        });
        lob.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        lob.on('error', err => {
            reject(err);
        });
    });
}

// Obtener todos los paquetes
async function getPaquetes() {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        // Utilizar resultSet para manejar LOBs
        const result = await connection.execute(
            `SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen, p.habitacion_id, p.descuento,
                    h.nombre AS habitacion_nombre, h.precio AS habitacion_precio
             FROM paquetes p
             JOIN habitaciones h ON p.habitacion_id = h.id`,
            [],
            {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
                resultSet: true
            }
        );

        const paquetes = [];
        const rs = result.resultSet;
        let row;

        while ((row = await rs.getRow())) {
            // Obtener servicios para cada paquete
            const serviciosResult = await connection.execute(
                `SELECT s.id, s.nombre, s.costo
                 FROM servicios s
                 JOIN paquetes_servicios ps ON s.id = ps.servicio_id
                 WHERE ps.paquete_id = :paquete_id`,
                { paquete_id: row.ID },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            let imagenBase64 = '';
            if (row.IMAGEN) {
                // Leer el LOB y convertirlo a Buffer
                const lob = row.IMAGEN;
                const buffer = await lobToBuffer(lob);
                imagenBase64 = buffer.toString('base64');
            }

            paquetes.push({
                id: row.ID,
                nombre: row.NOMBRE,
                descripcion: row.DESCRIPCION,
                precio: parseFloat(row.PRECIO),
                descuento: parseFloat(row.DESCUENTO),  // Añadimos el descuento
                imagen: imagenBase64,
                habitacion_id: row.HABITACION_ID,
                habitacion_nombre: row.HABITACION_NOMBRE,
                habitacion_precio: parseFloat(row.HABITACION_PRECIO),
                servicios: serviciosResult.rows.map(servicio => ({
                    id: servicio.ID,
                    nombre: servicio.NOMBRE,
                    costo: parseFloat(servicio.COSTO)
                }))
            });
        }

        await rs.close();

        return paquetes;
    } catch (error) {
        throw error;
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}



// Actualizar un paquete
async function updatePaquete(id, nombre, descripcion, precio, imagen, habitacion_id, servicios, descuento) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        // Bloquear el paquete que se va a actualizar para evitar modificaciones concurrentes
        await connection.execute(
            `SELECT /*+ NO_PARALLEL */ id FROM paquetes WHERE id = :id FOR UPDATE`,
            { id }
        );

        // Actualizar la tabla 'paquetes'
        const result = await connection.execute(
            `UPDATE paquetes SET nombre = :nombre, descripcion = :descripcion,
             precio = :precio, imagen = :imagen, habitacion_id = :habitacion_id, descuento = :descuento
             WHERE id = :id`,
            {
                nombre,
                descripcion,
                precio,
                imagen: imagen ? Buffer.from(imagen, 'base64') : null,
                habitacion_id,
                descuento,
                id
            },
            { autoCommit: false }
        );

        // Eliminar servicios actuales
        await connection.execute(
            `DELETE FROM paquetes_servicios WHERE paquete_id = :paquete_id`,
            { paquete_id: id },
            { autoCommit: false }
        );

        // Insertar servicios actualizados
        for (const servicioId of servicios) {
            await connection.execute(
                `INSERT INTO paquetes_servicios (paquete_id, servicio_id)
                 VALUES (:paquete_id, :servicio_id)`,
                { paquete_id: id, servicio_id: servicioId },
                { autoCommit: false }
            );
        }

        await connection.commit();
        return result;
    } catch (error) {
        if (connection) await connection.rollback();
        throw error;
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}



// Eliminar un paquete
async function deletePaquete(id) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        // Eliminar de 'paquetes_servicios' primero por la clave foránea
        await connection.execute(
            `DELETE FROM paquetes_servicios WHERE paquete_id = :paquete_id`,
            { paquete_id: id },
            { autoCommit: false }
        );

        // Eliminar de 'paquetes'
        const result = await connection.execute(
            `DELETE FROM paquetes WHERE id = :id`,
            { id },
            { autoCommit: false }
        );

        await connection.commit();
        return result;
    } catch (error) {
        if (connection) await connection.rollback();
        throw error;
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

// Obtener un paquete por su ID
async function getPaqueteById(id) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen, p.habitacion_id, p.descuento, 
                    h.nombre AS habitacion_nombre, h.precio AS habitacion_precio
             FROM paquetes p
             JOIN habitaciones h ON p.habitacion_id = h.id
             WHERE p.id = :id`,
            { id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length === 0) {
            return null; // Si no se encuentra el paquete
        }

        const row = result.rows[0];
        let imagenBase64 = '';
        if (row.IMAGEN) {
            const lob = row.IMAGEN;
            const buffer = await lobToBuffer(lob);
            imagenBase64 = buffer.toString('base64');
        }

        return {
            id: row.ID,
            nombre: row.NOMBRE,
            descripcion: row.DESCRIPCION,
            precio: parseFloat(row.PRECIO),
            descuento: parseFloat(row.DESCUENTO),
            imagen: imagenBase64,
            habitacion_id: row.HABITACION_ID,
            habitacion_nombre: row.HABITACION_NOMBRE,
            habitacion_precio: parseFloat(row.HABITACION_PRECIO)
        };
    } catch (error) {
        throw error;
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}


module.exports = { createPaquete, getPaquetes, updatePaquete, deletePaquete, getPaqueteById };
