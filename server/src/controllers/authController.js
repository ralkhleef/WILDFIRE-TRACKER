// Handles authentication requests and response formatting for auth routes.
const passport = require('passport');

const { isGoogleStrategyReady } = require('../config/passport');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

const signup = asyncHandler(async (req, res) => {
  const authPayload = await authService.signupUser(req.body);

  res.status(201).json({
    success: true,
    message: 'User account created successfully.',
    data: authPayload,
  });
});

const login = asyncHandler(async (req, res) => {
  const authPayload = await authService.loginUser(req.body);

  res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: authPayload,
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

const startGoogleAuth = (req, res, next) => {
  if (!isGoogleStrategyReady()) {
    return next(
      new ApiError(
        501,
        'Google OAuth is not configured yet. Add Google credentials to the environment file first.'
      )
    );
  }

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
};

const handleGoogleCallback = (req, res, next) => {
  if (!isGoogleStrategyReady()) {
    return next(
      new ApiError(
        501,
        'Google OAuth callback is not configured yet. Add Google credentials to the environment file first.'
      )
    );
  }

  return passport.authenticate(
    'google',
    { session: false },
    (error, user) => {
      if (error) {
        return next(error);
      }

      if (!user) {
        return next(new ApiError(401, 'Google authentication failed.'));
      }

      return res.status(200).json({
        success: true,
        message: 'Google OAuth login successful.',
        data: authService.createAuthResponse(user),
      });
    }
  )(req, res, next);
};

module.exports = {
  signup,
  login,
  getCurrentUser,
  startGoogleAuth,
  handleGoogleCallback,
};
