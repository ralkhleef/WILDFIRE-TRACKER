// Declares alert preference routes and local alert lookup routes for authenticated users.
const express = require('express');

const alertController = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');
const {
  alertPreferenceValidation,
  localAlertValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/', protect, alertController.getAlerts);
router.post('/', protect, alertPreferenceValidation, alertController.createAlert);
router.get('/local', protect, localAlertValidation, alertController.getLocalAlerts);

module.exports = router;
