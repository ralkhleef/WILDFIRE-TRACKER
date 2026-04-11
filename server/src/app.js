// Creates and configures the Express application for the backend API.
const cors = require('cors');
const express = require('express');

const apiRoutes = require('./routes');
const { passport, configurePassport } = require('./config/passport');
const errorHandler = require('./middleware/errorMiddleware');
const notFoundHandler = require('./middleware/notFoundMiddleware');

configurePassport();

const app = express();

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WildFire-Tracker backend is running.',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
