// Loads environment variables once and exposes friendly defaults for the application.
const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: Number(process.env.PORT) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'development_only_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/auth/google/callback',
  calfireApiUrl: process.env.CALFIRE_API_URL || '',
  nasaFirmsApiUrl: process.env.NASA_FIRMS_API_URL || '',
  nasaFirmsMapKey: process.env.NASA_FIRMS_MAP_KEY || '',
  nasaFirmsSource: process.env.NASA_FIRMS_SOURCE || '',
  nasaFirmsArea: process.env.NASA_FIRMS_AREA || '',
  nasaFirmsDayRange: process.env.NASA_FIRMS_DAY_RANGE || '',
  defaultAlertRadiusMiles: Number(process.env.DEFAULT_ALERT_RADIUS_MILES) || 25,
};
