// Loads environment variables once and exposes friendly defaults for the application.
const dotenv = require('dotenv');

dotenv.config();

const parseOriginList = (value) => {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const defaultDevOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

module.exports = {
  port: Number(process.env.PORT) || 5050,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'development_only_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Comma-separated list of allowed origins. Used for CORS + OAuth redirects.
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  frontendOrigins: (() => {
    const fromEnv = parseOriginList(process.env.FRONTEND_URL);
    return fromEnv.length ? fromEnv : defaultDevOrigins;
  })(),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5050/api/auth/google/callback',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  googleGeocodingApiKey:
    process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
  googlePlacesApiKey:
    process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
  googleRoutesApiKey:
    process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
  googleAirQualityApiKey:
    process.env.GOOGLE_AIR_QUALITY_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
  calfireApiUrl: process.env.CALFIRE_API_URL || '',
  nasaFirmsApiUrl: process.env.NASA_FIRMS_API_URL || '',
  nasaFirmsMapKey: process.env.NASA_FIRMS_MAP_KEY || '',
  nasaFirmsSource: process.env.NASA_FIRMS_SOURCE || '',
  nasaFirmsArea: process.env.NASA_FIRMS_AREA || '',
  nasaFirmsDayRange: process.env.NASA_FIRMS_DAY_RANGE || '',
  nwsAlertsApiUrl:
    process.env.NWS_ALERTS_API_URL || 'https://api.weather.gov/alerts/active',
  defaultAlertRadiusMiles: Number(process.env.DEFAULT_ALERT_RADIUS_MILES) || 25,
};
