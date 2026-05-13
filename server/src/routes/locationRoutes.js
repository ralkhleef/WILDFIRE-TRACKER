// Geocoding / nearby resources / air-quality helpers backed by Google Maps Platform.
const express = require('express');
const locationController = require('../controllers/locationController');

const router = express.Router();

router.get('/geocode', locationController.geocode);
router.get('/nearby', locationController.nearbyResources);

module.exports = router;
