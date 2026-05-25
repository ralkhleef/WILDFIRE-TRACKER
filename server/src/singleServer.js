const env = require('./config/env');
const prisma = require('./config/prisma');
const app = require('./app');

const server = app.listen(env.port, () => {
  console.log(`WildFire-Tracker single backend listening on port ${env.port}`);
});

const shutdown = async (signal) => {
  console.log(`[Single Backend] Received ${signal}. Closing...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', async (error) => {
  console.error('[Single Backend] Unhandled promise rejection:', error);
  await prisma.$disconnect();
  process.exit(1);
});

process.on('uncaughtException', async (error) => {
  console.error('[Single Backend] Uncaught exception:', error);
  await prisma.$disconnect();
  process.exit(1);
});
