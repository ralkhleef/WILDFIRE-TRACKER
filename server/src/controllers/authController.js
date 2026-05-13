// Handles authentication requests and response formatting for auth routes.
const passport = require('passport');

const env = require('../config/env');
const { isGoogleStrategyReady } = require('../config/passport');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

const getFrontendRedirectUrl = (path = '/login') => {
  const base = String(env.frontendUrl || 'http://localhost:5173')
    .split(',')[0]
    .trim()
    .replace(/\/$/, '');
  return new URL(path, `${base}/`);
};

const redirectToLoginError = (res, message) => {
  const redirectUrl = getFrontendRedirectUrl('/login');
  redirectUrl.searchParams.set('error', message);
  return res.redirect(redirectUrl.toString());
};

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

// Stateless logout — JWTs are stored client-side. The endpoint exists so the
// frontend can call POST /api/auth/logout uniformly and so we can later swap
// to server-side session/cookie invalidation without changing the contract.
const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out.',
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
        return redirectToLoginError(res, 'Google authentication failed.');
      }

      if (!user) {
        return redirectToLoginError(res, 'Google authentication failed.');
      }

      const authPayload = authService.createAuthResponse(user);
      const redirectUrl = getFrontendRedirectUrl('/login');
      redirectUrl.searchParams.set('token', authPayload.token);
      redirectUrl.searchParams.set('auth', 'google');

      return res.redirect(redirectUrl.toString());
    }
  )(req, res, next);
};

module.exports = {
  signup,
  login,
  getCurrentUser,
  logout,
  startGoogleAuth,
  handleGoogleCallback,
};
