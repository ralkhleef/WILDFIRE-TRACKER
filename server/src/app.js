// Creates and configures the Express application for the backend API.
const cors = require('cors');
const express = require('express');

const env = require('./config/env');
const apiRoutes = require('./routes');
const { passport, configurePassport } = require('./config/passport');
const errorHandler = require('./middleware/errorMiddleware');
const notFoundHandler = require('./middleware/notFoundMiddleware');

configurePassport();

const app = express();

// CORS: allow each origin in FRONTEND_URL (comma-separated) or fall back to
// common Vite dev ports for local development. Same-origin/non-browser
// requests (no Origin header) are allowed too.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.frontendOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WildFire-Tracker backend is running.',
    timestamp: new Date().toISOString(),
    env: env.nodeEnv,
  });
});

app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
