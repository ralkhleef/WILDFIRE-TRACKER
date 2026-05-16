// Manages user alert preferences and creates location-based alert responses from wildfire data.
const env = require('../config/env');
const prisma = require('../config/prisma');
const { sendWildfireAlertEmail } = require('./emailService');

const isBoolean = (value) => typeof value === 'boolean';

const shouldSendEmailAlert = (alertPreference) => {
  if (!alertPreference?.emailAlertsEnabled) return false;
  if (!alertPreference.lastAlertSentAt) return true;

  const lastSentAt = new Date(alertPreference.lastAlertSentAt).getTime();
  if (!Number.isFinite(lastSentAt)) return true;

  const cooldownMs = env.alertEmailCooldownMinutes * 60 * 1000;
  return Date.now() - lastSentAt >= cooldownMs;
};

const fetchNearbyFiresFromFireService = async ({ latitude, longitude, radius }) => {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radius: String(radius),
    includeExternal: 'true',
  });

  const response = await fetch(`${env.fireServiceUrl}/api/fires/nearby?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Fire Data Service returned ${response.status}.`);
  }

  const body = await response.json();
  return Array.isArray(body?.data) ? body.data : [];
};

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
      emailAlertsEnabled: false,
      lastAlertSentAt: null,
    },
    savedLocations,
  };
};

const upsertAlertPreference = async (userId, { radius, enabled, emailAlertsEnabled }) => {
  const data = {};

  if (typeof radius !== 'undefined') {
    data.radius = radius;
  }

  if (typeof enabled !== 'undefined') {
    data.enabled = enabled;
  }

  if (typeof emailAlertsEnabled !== 'undefined') {
    data.emailAlertsEnabled = emailAlertsEnabled;
  }

  return prisma.alertPreference.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      radius,
      enabled: isBoolean(enabled) ? enabled : true,
      emailAlertsEnabled: isBoolean(emailAlertsEnabled) ? emailAlertsEnabled : false,
    },
  });
};

const getLocalAlerts = async ({ userId, latitude, longitude, radius }) => {
  const [alertPreference, savedLocations, user] = await Promise.all([
    prisma.alertPreference.findUnique({
      where: { userId },
    }),
    prisma.savedLocation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
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

  const fires = await fetchNearbyFiresFromFireService({
    latitude: origin.latitude,
    longitude: origin.longitude,
    radius: activeRadius,
  });
  const notifications = fires.slice(0, 5).map((fire) => ({
    id: fire.id,
    title: `Wildfire reported near ${fire.location || origin.label || 'your location'}`,
    message: `Wildfire reported near ${fire.location || 'your saved location'}. Stay alert, follow evacuation guidance, and stay safe.`,
    fireName: fire.name,
    location: fire.location,
    status: fire.status,
    distanceMiles: fire.distanceMiles,
  }));
  let emailNotification = {
    sent: false,
    skipped: true,
    reason: 'Email alerts are disabled or no nearby fires were found.',
  };

  if (fires.length && shouldSendEmailAlert(alertPreference)) {
    try {
      emailNotification = await sendWildfireAlertEmail({
        to: user?.email,
        user,
        fires,
        origin,
        radius: activeRadius,
      });

      if (emailNotification.sent) {
        await prisma.alertPreference.upsert({
          where: { userId },
          update: { lastAlertSentAt: new Date() },
          create: {
            userId,
            radius: activeRadius,
            enabled: true,
            emailAlertsEnabled: true,
            lastAlertSentAt: new Date(),
          },
        });
      }
    } catch (error) {
      emailNotification = {
        sent: false,
        skipped: false,
        reason: error.message,
      };
    }
  } else if (fires.length && alertPreference?.emailAlertsEnabled) {
    emailNotification = {
      sent: false,
      skipped: true,
      reason: `Email already sent recently. Cooldown is ${env.alertEmailCooldownMinutes} minutes.`,
    };
  }

  return {
    enabled: true,
    radius: activeRadius,
    origin,
    fires,
    notifications,
    emailNotification,
    message: notifications.length
      ? `${notifications.length} location-based alert${notifications.length === 1 ? '' : 's'} found.`
      : 'No nearby fires found inside the alert radius.',
    alertsGeneratedAt: new Date().toISOString(),
  };
};

module.exports = {
  listAlertsForUser,
  upsertAlertPreference,
  getLocalAlerts,
};
