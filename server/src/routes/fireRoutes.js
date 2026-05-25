const express = require('express');

const fireController = require('../controllers/fireController');
const { protect } = require('../middleware/authMiddleware');
const {
  fireIdValidation,
  nearbyFireValidation,
  wildfireRecordValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/', fireController.getFires);
router.post('/', protect, wildfireRecordValidation, fireController.createFire);
router.get('/nearby', nearbyFireValidation, fireController.getNearbyFires);
router.get('/:id', fireIdValidation, fireController.getFireById);
router.put('/:id', protect, fireIdValidation, wildfireRecordValidation, fireController.updateFire);
router.delete('/:id', protect, fireIdValidation, fireController.deleteFire);

module.exports = router;
