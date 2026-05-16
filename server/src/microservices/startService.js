const prisma = require('../config/prisma');

const startService = ({ app, name, port }) => {
  const server = app.listen(port, () => {
    console.log(`${name} listening on port ${port}`);
  });

  const shutdown = async (signal) => {
    console.log(`[${name}] Received ${signal}. Closing...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', async (error) => {
    console.error(`[${name}] Unhandled promise rejection:`, error);
    await prisma.$disconnect();
    process.exit(1);
  });

  process.on('uncaughtException', async (error) => {
    console.error(`[${name}] Uncaught exception:`, error);
    await prisma.$disconnect();
    process.exit(1);
  });

  return server;
};

module.exports = startService;
