const oracledb = require('oracledb');
const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION
};

async function registrarPagoExtra(id_reservacion, monto, payment_intent_id) {
    let connection;

    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `INSERT INTO PAGOS_EXTRA (ID_PAGO_EXTRA, ID_RESERVACION, MONTO, PAYMENT_INTENT_ID, FECHA)
             VALUES (SEQ_PAGOS_EXTRA.NEXTVAL, :id_reservacion, :monto, :pid, SYSDATE)`,
            { id_reservacion, monto, pid: payment_intent_id },
            { autoCommit: true }
        );
        return result;
    } catch (error) {
        throw error;
    } finally {
        if (connection) await connection.close();
    }
}

module.exports = {
    registrarPagoExtra
};
