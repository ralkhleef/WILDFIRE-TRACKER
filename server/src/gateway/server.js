const env = require('../config/env');
const app = require('./app');

const server = app.listen(env.gatewayPort, () => {
  console.log(`API Gateway listening on port ${env.gatewayPort}`);
});

const shutdown = (signal) => {
  console.log(`[API Gateway] Received ${signal}. Closing...`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (error) => {
  console.error('[API Gateway] Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('[API Gateway] Uncaught exception:', error);
  process.exit(1);
});
