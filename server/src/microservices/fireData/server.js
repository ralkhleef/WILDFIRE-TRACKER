const env = require('../../config/env');
const app = require('./app');
const startService = require('../startService');

startService({
  app,
  name: 'Fire Data Service',
  port: env.fireServicePort,
});
