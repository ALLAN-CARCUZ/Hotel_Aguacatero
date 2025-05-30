if (!process.env.ORACLE_CONNECTION || !process.env.STRIPE_SECRET_KEY) {
  console.error("❌ ERROR: Variables de entorno no cargadas correctamente.");
}

const express = require('express');
const bodyParser = require('body-parser');
const oracledb = require('oracledb');
const path = require('path');

// Evitar fallo en Railway (no usar Instant Client en producción)
try {
  if (process.env.NODE_ENV === 'development') {
    oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_23_5' });
  }
} catch (err) {
  console.warn('Saltando initOracleClient: probablemente estás en producción.');
}

// Routers
const habitacionRouter = require('./routes/habitacionRouter');
const servicioRouter = require('./routes/servicioRouter');
const paqueteRouter = require('./routes/paqueteRouter');
const usuarioRouter = require('./routes/usuarioRouter');
const reservacionRouter = require('./routes/reservacionRouter');
const paymentRouter = require('./routes/paymentRouter');
const cobrosExtraRouter = require('./routes/cobrosExtraRouter');

const app = express();
const port = process.env.PORT || 3000;

// Configuración de conexión a Oracle
const dbConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECTION,
  externalAuth: false
};

console.log("🔍 ORACLE_CONNECTION:", process.env.ORACLE_CONNECTION); // ✅ Diagnóstico
if (!process.env.ORACLE_CONNECTION) {
  console.error("❌ ERROR: ORACLE_CONNECTION está vacío o no se ha definido."); // ✅ Aviso
}

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.get('/', (req, res) => {
  res.redirect('/inicio.html');
});

app.use('/api/habitaciones', habitacionRouter);
app.use('/api/servicios', servicioRouter);
app.use('/api/paquetes', paqueteRouter);
app.use('/api/usuarios', usuarioRouter);
app.use('/api/reservaciones', reservacionRouter);
app.use('/api/pagos', paymentRouter); 
app.use('/api/cobros-extra', cobrosExtraRouter); 

app.use(express.static(path.join(__dirname, 'public')));

// Conexión de prueba a Oracle
async function connectToDatabase() {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    console.log('✅ Conexión a Oracle exitosa');
  } catch (err) {
    console.error('❌ Error al conectar a la base de datos:', err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error al cerrar la conexión:', err);
      }
    }
  }
}

connectToDatabase();

app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${port}`);
});



//ORACLE_USER=ADMIN
//ORACLE_PASSWORD=123456789Umg
//ORACLE_CONNECTION=(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.mx-queretaro-1.oraclecloud.com))(connect_data=(service_name=gc3648625d63b6c_hotel_high.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))

//ORACLE_USER=DODO3
//ORACLE_PASSWORD=1234
//ORACLE_CONNECTION=localhost/XE
