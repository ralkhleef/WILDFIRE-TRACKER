const env = require('../../config/env');
const app = require('./app');
const startService = require('../startService');

startService({
  app,
  name: 'Evacuation Resource Service',
  port: env.evacuationServicePort,
});
