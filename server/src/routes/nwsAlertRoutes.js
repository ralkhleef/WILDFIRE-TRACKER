const express = require('express');
const nwsAlertController = require('../controllers/nwsAlertController');

const router = express.Router();

router.get('/', nwsAlertController.getActiveFireAlerts);
router.get('/nearby', nwsAlertController.getNearbyFireAlerts);

module.exports = router;
