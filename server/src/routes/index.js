// Combines all API route groups under a single router.
const express = require('express');

const alertRoutes = require('./alertRoutes');
const authRoutes = require('./authRoutes');
const fireRoutes = require('./fireRoutes');
const userRoutes = require('./userRoutes');
const nwsAlertRoutes = require('./nwsAlertRoutes');
const locationRoutes = require('./locationRoutes');
const locationController = require('../controllers/locationController');

const router = express.Router();

// Existing route groups — unchanged.
router.use('/auth', authRoutes);
router.use('/fires', fireRoutes);
router.use('/alerts', alertRoutes);
router.use('/users', userRoutes);

// New public read-only feeds.
router.use('/nws-alerts', nwsAlertRoutes);
router.use('/locations', locationRoutes);

// Aliases that match the patterns used by the assignment spec.
router.get('/resources/nearby', locationController.nearbyResources);
router.get('/air-quality', locationController.airQuality);

module.exports = router;
