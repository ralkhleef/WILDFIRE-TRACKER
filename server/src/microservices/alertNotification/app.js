const alertRoutes = require('../../routes/alertRoutes');
const createServiceApp = require('../createServiceApp');

const app = createServiceApp({
  name: 'Alert/Notification Service',
  routes: (serviceApp) => {
    serviceApp.use('/api/alerts', alertRoutes);
  },
});

module.exports = app;
