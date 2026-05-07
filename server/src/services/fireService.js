// Handles wildfire record lookups from the database and external API integrations.
// All public list/nearby responses are filtered to California + last 7 days so
// every page sees the same clean, current data set.
const env = require('../config/env');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const { filterNearbyFires } = require('../utils/geolocation');
const {
  filterCaliforniaRecent,
  isInCalifornia,
} = require('../utils/californiaFilter');
const calfireService = require('./calfireService');
const nasaService = require('./nasaService');

const getSourcePriority = (fire) => {
  const source = String(fire?.source || '').toLowerCase();
  if (source.includes('cal fire')) return 0;
  if (source.includes('nasa')) return 2;
  return 1;
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
    fireMap.set(fire.id, fire);
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

  // California + within last 7 days, then confirmed/source-aware ordering.
  return sortBySourcePriority(filterCaliforniaRecent(combined));
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
