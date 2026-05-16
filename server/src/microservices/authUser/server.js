const env = require('../../config/env');
const app = require('./app');
const startService = require('../startService');

startService({
  app,
  name: 'Auth/User Service',
  port: env.authServicePort,
});
