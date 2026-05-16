const env = require('../../config/env');
const app = require('./app');
const startService = require('../startService');

startService({
  app,
  name: 'Alert/Notification Service',
  port: env.alertServicePort,
});
