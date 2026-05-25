const express = require('express');

const alertRoutes = require('./alertRoutes');
const authRoutes = require('./authRoutes');
const fireRoutes = require('./fireRoutes');
const evacuationResourceRoutes = require('./evacuationResourceRoutes');
const userRoutes = require('./userRoutes');
const nwsAlertRoutes = require('./nwsAlertRoutes');
const locationRoutes = require('./locationRoutes');
const locationController = require('../controllers/locationController');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/fires', fireRoutes);
router.use('/alerts', alertRoutes);
router.use('/users', userRoutes);
router.use('/evacuation-resources', evacuationResourceRoutes);

router.use('/nws-alerts', nwsAlertRoutes);
router.use('/locations', locationRoutes);

router.get('/resources/nearby', locationController.nearbyResources);
router.get('/air-quality', locationController.airQuality);

module.exports = router;
