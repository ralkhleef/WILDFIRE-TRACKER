// Handles wildfire record lookups from the database and external API integrations.
// Public list/nearby responses are source-aware: CAL FIRE active/current
// incidents are confirmed records, while NASA FIRMS records are recent
// satellite hotspot clusters only.
const env = require('../config/env');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const { filterNearbyFires } = require('../utils/geolocation');
const {
  isInCalifornia,
  isWithinLastDays,
} = require('../utils/californiaFilter');
const calfireService = require('./calfireService');
const nasaService = require('./nasaService');

const getSourcePriority = (fire) => {
  const source = String(fire?.source || '').toLowerCase();
  if (source.includes('cal fire')) return 0;
  if (source.includes('nasa')) return 2;
  return 1;
};

const isCalFireSource = (fire) => String(fire?.source || '').toLowerCase().includes('cal fire');
const isNasaSource = (fire) => String(fire?.source || '').toLowerCase().includes('nasa');

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const getDedupeKey = (fire) => {
  if (isCalFireSource(fire)) {
    const nameLocationKey = [normalizeKey(fire.name), normalizeKey(fire.location)]
      .filter(Boolean)
      .join('|');
    return nameLocationKey || normalizeKey(fire.id);
  }

  if (isNasaSource(fire)) {
    return normalizeKey(fire.id) || [normalizeKey(fire.name), normalizeKey(fire.location)].join('|');
  }

  return normalizeKey(fire.id) || [normalizeKey(fire.name), normalizeKey(fire.location)].join('|');
};

const isSameCalFireIncident = (first, second) => {
  if (!isCalFireSource(first) || !isCalFireSource(second)) return false;
  const firstId = normalizeKey(first.id);
  const secondId = normalizeKey(second.id);
  if (firstId && secondId && firstId === secondId) return true;

  const firstName = normalizeKey(first.name);
  const secondName = normalizeKey(second.name);
  const firstLocation = normalizeKey(first.location);
  const secondLocation = normalizeKey(second.location);
  return Boolean(firstName && secondName && firstLocation && secondLocation) &&
    firstName === secondName &&
    firstLocation === secondLocation;
};

const findExistingDedupeKey = (fireMap, fire, fallbackKey) => {
  if (!isCalFireSource(fire)) return fallbackKey;
  for (const [key, existing] of fireMap.entries()) {
    if (isSameCalFireIncident(existing, fire)) return key;
  }
  return fallbackKey;
};

const isInactiveStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  return ['inactive', 'archived', 'archive', 'closed', 'final', 'contained'].some((word) =>
    normalized.includes(word),
  );
};

const shouldShowInActiveFeed = (fire) => {
  if (!isInCalifornia(Number(fire?.latitude), Number(fire?.longitude))) return false;

  if (isCalFireSource(fire)) {
    return !isInactiveStatus(fire.status);
  }

  if (isNasaSource(fire)) {
    return isWithinLastDays(fire.reportedAt, 5);
  }

  return isWithinLastDays(fire.reportedAt, 7);
};

const getReportedTime = (fire) => {
  const date = fire?.reportedAt ? new Date(fire.reportedAt) : null;
  return date && Number.isFinite(date.getTime()) ? date.getTime() : 0;
};

const sortBySourcePriority = (fires) =>
  [...fires].sort((first, second) => {
    const priorityDelta = getSourcePriority(first) - getSourcePriority(second);
    if (priorityDelta !== 0) return priorityDelta;
    return getReportedTime(second) - getReportedTime(first);
  });

const mergeFireSources = (...collections) => {
  const fireMap = new Map();

  collections.flat().forEach((fire) => {
    if (!fire || !fire.id) return;
    const key = findExistingDedupeKey(fireMap, fire, getDedupeKey(fire));
    const current = fireMap.get(key);
    if (!current || getReportedTime(fire) >= getReportedTime(current)) {
      fireMap.set(key, fire);
    }
  });

  return Array.from(fireMap.values());
};

const listFires = async ({ includeExternal = false } = {}) => {
  const storedFires = await prisma.wildfireRecord.findMany({
    orderBy: { updatedAt: 'desc' },
  });

  let combined = storedFires;

  if (includeExternal) {
    const [calfireResult, nasaResult] = await Promise.allSettled([
      calfireService.fetchActiveFires(),
      nasaService.fetchActiveFires(),
    ]);

    const calfireFires = calfireResult.status === 'fulfilled' ? calfireResult.value : [];
    const nasaFires = nasaResult.status === 'fulfilled' ? nasaResult.value : [];

    combined = mergeFireSources(storedFires, calfireFires, nasaFires);
  }

  return sortBySourcePriority(mergeFireSources(combined).filter(shouldShowInActiveFeed));
};

const getFireById = async (fireId) => {
  // For a single record we still return it even if it is older or outside CA;
  // detail pages should be able to render historical records the user navigates to.
  // We just don't surface them in main listings.
  const storedFire = await prisma.wildfireRecord.findUnique({
    where: { id: fireId },
  });

  if (storedFire) {
    return storedFire;
  }

  // Look in the unfiltered external feed too.
  const [calfireResult, nasaResult] = await Promise.allSettled([
    calfireService.fetchActiveFires(),
    nasaService.fetchActiveFires(),
  ]);
  const externalFires = [
    ...(calfireResult.status === 'fulfilled' ? calfireResult.value : []),
    ...(nasaResult.status === 'fulfilled' ? nasaResult.value : []),
  ];

  const externalMatch = externalFires.find((fire) => fire.id === fireId);

  if (!externalMatch) {
    throw new ApiError(404, 'Wildfire record not found.');
  }

  return externalMatch;
};

const getNearbyFires = async ({
  latitude,
  longitude,
  radius = env.defaultAlertRadiusMiles,
  includeExternal = false,
}) => {
  const fires = await listFires({ includeExternal });
  // listFires has already restricted to CA + last 7 days; do a defensive coord check too.
  const cleaned = fires.filter((f) => isInCalifornia(Number(f.latitude), Number(f.longitude)));
  return filterNearbyFires(cleaned, latitude, longitude, radius).sort((first, second) => {
    const priorityDelta = getSourcePriority(first) - getSourcePriority(second);
    if (priorityDelta !== 0) return priorityDelta;
    return first.distanceMiles - second.distanceMiles;
  });
};

module.exports = {
  listFires,
  getFireById,
  getNearbyFires,
};
