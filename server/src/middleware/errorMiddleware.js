const env = require('../config/env');

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error.';

  if (error.code === 'P2002') {
    statusCode = 409;
    message = 'A unique field already exists in the database.';
  }

  if (error.code === 'P2025') {
    statusCode = 404;
    message = 'The requested database record could not be found.';
  }

  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token is invalid or has expired.';
  }

  const responseBody = {
    success: false,
    message,
  };

  if (error.details) {
    responseBody.details = error.details;
  }

  if (env.nodeEnv !== 'production') {
    responseBody.stack = error.stack;
  }

  res.status(statusCode).json(responseBody);
};

module.exports = errorHandler;
