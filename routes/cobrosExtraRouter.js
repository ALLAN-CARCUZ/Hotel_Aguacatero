const express = require('express');
const router = express.Router();
const { CobroExtra, CobroDiasExtra, solicitarPagoModificacionController } = require('../controllers/cobrosExtraController');

router.post('/servicio-cobro-extra', CobroExtra);
router.post('/dias-cobro-extra', CobroDiasExtra);
router.post('/solicitar-pago-modificacion', solicitarPagoModificacionController);
module.exports = router;
