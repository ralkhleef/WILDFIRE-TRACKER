const cors = require('cors');
const express = require('express');

const env = require('../config/env');
const errorHandler = require('../middleware/errorMiddleware');
const notFoundHandler = require('../middleware/notFoundMiddleware');

const createCorsOptions = () => ({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (env.frontendOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
});

const createServiceApp = ({ name, routes }) => {
  const app = express();

  app.use(cors(createCorsOptions()));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    console.log(`[${name}] ${req.method} ${req.originalUrl}`);
    next();
  });

  app.get('/api/health', (req, res) => {
    res.status(200).json({
      success: true,
      service: name,
      message: `${name} is running.`,
      timestamp: new Date().toISOString(),
      env: env.nodeEnv,
    });
  });

  routes(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

module.exports = createServiceApp;
