// Manages user alert preferences and creates location-based alert responses from wildfire data.
const env = require('../config/env');
const prisma = require('../config/prisma');
const fireService = require('./fireService');

const listAlertsForUser = async (userId) => {
  const [alertPreference, savedLocations] = await Promise.all([
    prisma.alertPreference.findUnique({
      where: { userId },
    }),
    prisma.savedLocation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    alertPreference: alertPreference || {
      radius: env.defaultAlertRadiusMiles,
      enabled: true,
    },
    savedLocations,
  };
};

const upsertAlertPreference = async (userId, { radius, enabled }) => {
  const data = {};

  if (typeof radius !== 'undefined') {
    data.radius = radius;
  }

  if (typeof enabled !== 'undefined') {
    data.enabled = enabled;
  }

  return prisma.alertPreference.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      radius,
      enabled: typeof enabled === 'boolean' ? enabled : true,
    },
  });
};

const getLocalAlerts = async ({ userId, latitude, longitude, radius }) => {
  const [alertPreference, savedLocations] = await Promise.all([
    prisma.alertPreference.findUnique({
      where: { userId },
    }),
    prisma.savedLocation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const activeRadius = radius || alertPreference?.radius || env.defaultAlertRadiusMiles;
  const explicitLocation =
    typeof latitude === 'number' && typeof longitude === 'number'
      ? { label: 'request-location', latitude, longitude }
      : null;
  const origin = explicitLocation || savedLocations[0] || null;

  if (!origin) {
    return {
      enabled: alertPreference?.enabled ?? true,
      radius: activeRadius,
      origin: null,
      fires: [],
      message:
        'No location was provided. Add a saved location or pass latitude and longitude query parameters.',
    };
  }

  if (alertPreference && !alertPreference.enabled) {
    return {
      enabled: false,
      radius: activeRadius,
      origin,
      fires: [],
      message: 'Location-based alerts are currently disabled for this user.',
    };
  }

  const fires = await fireService.getNearbyFires({
    latitude: origin.latitude,
    longitude: origin.longitude,
    radius: activeRadius,
    includeExternal: true,
  });

  return {
    enabled: true,
    radius: activeRadius,
    origin,
    fires,
    alertsGeneratedAt: new Date().toISOString(),
  };
};

module.exports = {
  listAlertsForUser,
  upsertAlertPreference,
  getLocalAlerts,
};
