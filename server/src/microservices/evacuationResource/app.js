const evacuationResourceRoutes = require('../../routes/evacuationResourceRoutes');
const createServiceApp = require('../createServiceApp');

const app = createServiceApp({
  name: 'Evacuation Resource Service',
  routes: (serviceApp) => {
    serviceApp.use('/api/evacuation-resources', evacuationResourceRoutes);
  },
});

module.exports = app;
