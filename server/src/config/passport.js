// Configures Passport with an optional Google OAuth strategy for future auth integration.
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const env = require('./env');
const authService = require('../services/authService');

let googleStrategyReady = false;

const configurePassport = () => {
  if (
    googleStrategyReady ||
    !env.googleClientId ||
    !env.googleClientSecret ||
    !env.googleCallbackUrl
  ) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: env.googleCallbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await authService.findOrCreateGoogleUser(profile);
          done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );

  googleStrategyReady = true;
};

const isGoogleStrategyReady = () => googleStrategyReady;

module.exports = {
  passport,
  configurePassport,
  isGoogleStrategyReady,
};
