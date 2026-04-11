// Handles wildfire record lookups from the database and placeholder external API integrations.
const env = require('../config/env');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const { filterNearbyFires } = require('../utils/geolocation');
const calfireService = require('./calfireService');
const nasaService = require('./nasaService');

const mergeFireSources = (...collections) => {
  const fireMap = new Map();

  collections.flat().forEach((fire) => {
    fireMap.set(fire.id, fire);
  });

  return Array.from(fireMap.values());
};

const listFires = async ({ includeExternal = false } = {}) => {
  const storedFires = await prisma.wildfireRecord.findMany({
    orderBy: { updatedAt: 'desc' },
  });

  if (!includeExternal) {
    return storedFires;
  }

  const [calfireResult, nasaResult] = await Promise.allSettled([
    calfireService.fetchActiveFires(),
    nasaService.fetchActiveFires(),
  ]);

  const calfireFires = calfireResult.status === 'fulfilled' ? calfireResult.value : [];
  const nasaFires = nasaResult.status === 'fulfilled' ? nasaResult.value : [];

  return mergeFireSources(storedFires, calfireFires, nasaFires);
};

const getFireById = async (fireId) => {
  const storedFire = await prisma.wildfireRecord.findUnique({
    where: { id: fireId },
  });

  if (storedFire) {
    return storedFire;
  }

  const externalFires = await listFires({ includeExternal: true });
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

  return filterNearbyFires(fires, latitude, longitude, radius);
};

module.exports = {
  listFires,
  getFireById,
  getNearbyFires,
};
