// Turns unknown routes into a clean 404 JSON error before the central error handler responds.
const ApiError = require('../utils/ApiError');

const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFoundHandler;
