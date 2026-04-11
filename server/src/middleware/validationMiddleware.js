// Collects reusable validation rules for request bodies, path params, and query params.
const { body, param, query, validationResult } = require('express-validator');

const ApiError = require('../utils/ApiError');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new ApiError(400, 'Validation failed.', errors.array()));
  }

  return next();
};

const signupValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .bail()
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Name must be between 1 and 80 characters long.'),
  handleValidationErrors,
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .bail()
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
  handleValidationErrors,
];

const fireIdValidation = [
  param('id').trim().notEmpty().withMessage('A wildfire id is required.'),
  handleValidationErrors,
];

const nearbyFireValidation = [
  query('latitude')
    .exists()
    .withMessage('The latitude query parameter is required.')
    .bail()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid coordinate.'),
  query('longitude')
    .exists()
    .withMessage('The longitude query parameter is required.')
    .bail()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid coordinate.'),
  query('radius')
    .optional()
    .isFloat({ gt: 0, lte: 500 })
    .withMessage('Radius must be between 1 and 500 miles.'),
  handleValidationErrors,
];

const alertPreferenceValidation = [
  body('radius')
    .isInt({ gt: 0, lte: 500 })
    .withMessage('Alert radius must be between 1 and 500 miles.'),
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean value.'),
  handleValidationErrors,
];

const localAlertValidation = [
  query('latitude').custom((value, { req }) => {
    const hasLatitude = typeof req.query.latitude !== 'undefined';
    const hasLongitude = typeof req.query.longitude !== 'undefined';

    if (hasLatitude !== hasLongitude) {
      throw new Error('Provide both latitude and longitude together for local alerts.');
    }

    return true;
  }),
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid coordinate.'),
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid coordinate.'),
  query('radius')
    .optional()
    .isFloat({ gt: 0, lte: 500 })
    .withMessage('Radius must be between 1 and 500 miles.'),
  handleValidationErrors,
];

const profileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Name must be between 1 and 80 characters long.'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Email must be a valid email address.'),
  handleValidationErrors,
];

const savedLocationValidation = [
  body('label')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Label must be between 1 and 100 characters long.'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid coordinate.'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid coordinate.'),
  handleValidationErrors,
];

module.exports = {
  signupValidation,
  loginValidation,
  fireIdValidation,
  nearbyFireValidation,
  alertPreferenceValidation,
  localAlertValidation,
  profileValidation,
  savedLocationValidation,
};
