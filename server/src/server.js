// Starts the HTTP server and handles graceful shutdown for Prisma connections.
const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');

const server = app.listen(env.port, () => {
  console.log(`WildFire-Tracker backend listening on port ${env.port}`);
});

const shutdown = async (signal) => {
  console.log(`Received ${signal}. Closing backend server...`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', async (error) => {
  console.error('Unhandled promise rejection:', error);
  await prisma.$disconnect();
  process.exit(1);
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await prisma.$disconnect();
  process.exit(1);
});
