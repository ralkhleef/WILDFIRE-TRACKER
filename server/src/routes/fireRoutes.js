// Declares wildfire data routes, including list, detail, and nearby fire lookups.
const express = require('express');

const fireController = require('../controllers/fireController');
const {
  fireIdValidation,
  nearbyFireValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/', fireController.getFires);
router.get('/nearby', nearbyFireValidation, fireController.getNearbyFires);
router.get('/:id', fireIdValidation, fireController.getFireById);

module.exports = router;
