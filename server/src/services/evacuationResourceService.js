const prisma = require('../config/prisma');
const { getDistanceInMiles } = require('../utils/geolocation');

const toResourceData = (body) => ({
  name: body.name,
  type: body.type,
  address: body.address,
  city: body.city || null,
  county: body.county || null,
  state: body.state || 'CA',
  latitude: Number(body.latitude),
  longitude: Number(body.longitude),
  phone: body.phone || null,
  website: body.website || null,
  capacity:
    typeof body.capacity === 'undefined' || body.capacity === null ? null : Number(body.capacity),
  openNow: typeof body.openNow === 'boolean' ? body.openNow : true,
  notes: body.notes || null,
});

const listResources = async ({ type } = {}) =>
  prisma.evacuationResource.findMany({
    where: type ? { type: { equals: type, mode: 'insensitive' } } : undefined,
    orderBy: [{ openNow: 'desc' }, { name: 'asc' }],
  });

const getResourceById = async (id) =>
  prisma.evacuationResource.findUniqueOrThrow({
    where: { id },
  });

const getNearbyResources = async ({ latitude, longitude, radius = 50, type } = {}) => {
  const resources = await listResources({ type });
  const lat = Number(latitude);
  const lng = Number(longitude);
  const maxMiles = Number(radius) || 50;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return resources;

  return resources
    .map((resource) => ({
      ...resource,
      distanceMiles: getDistanceInMiles(lat, lng, resource.latitude, resource.longitude),
    }))
    .filter((resource) => resource.distanceMiles <= maxMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
};

const createResource = async (body) =>
  prisma.evacuationResource.create({
    data: toResourceData(body),
  });

const updateResource = async (id, body) => {
  await getResourceById(id);
  return prisma.evacuationResource.update({
    where: { id },
    data: toResourceData(body),
  });
};

const deleteResource = async (id) => {
  await getResourceById(id);
  return prisma.evacuationResource.delete({ where: { id } });
};

module.exports = {
  listResources,
  getResourceById,
  getNearbyResources,
  createResource,
  updateResource,
  deleteResource,
};
