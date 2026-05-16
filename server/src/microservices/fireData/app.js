const fireRoutes = require('../../routes/fireRoutes');
const locationRoutes = require('../../routes/locationRoutes');
const nwsAlertRoutes = require('../../routes/nwsAlertRoutes');
const locationController = require('../../controllers/locationController');
const createServiceApp = require('../createServiceApp');

const app = createServiceApp({
  name: 'Fire Data Service',
  routes: (serviceApp) => {
    serviceApp.use('/api/fires', fireRoutes);
    serviceApp.use('/api/nws-alerts', nwsAlertRoutes);
    serviceApp.use('/api/locations', locationRoutes);
    serviceApp.get('/api/resources/nearby', locationController.nearbyResources);
    serviceApp.get('/api/air-quality', locationController.airQuality);
  },
});

module.exports = app;
