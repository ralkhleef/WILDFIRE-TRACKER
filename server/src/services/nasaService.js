// Placeholder service for fetching and normalizing wildfire event data from NASA EONET.
const env = require('../config/env');

const mapNasaEvent = (event) => {
  const latestGeometry = event.geometry?.[event.geometry.length - 1];
  const [longitude, latitude] = latestGeometry?.coordinates || [];

  return {
    id: `nasa-${event.id}`,
    name: event.title || 'Unnamed NASA wildfire event',
    location: event.sources?.[0]?.id || 'NASA EONET',
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    size: null,
    containment: null,
    source: 'NASA',
    status: event.closed ? 'closed' : 'open',
    reportedAt: latestGeometry?.date || null,
  };
};

const fetchActiveFires = async () => {
  if (!env.nasaApiUrl) {
    return [];
  }

  const response = await fetch(env.nasaApiUrl);

  if (!response.ok) {
    throw new Error(`NASA request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const wildfireEvents = events.filter((event) =>
    event.categories?.some((category) => category.title?.toLowerCase().includes('wildfires'))
  );

  return wildfireEvents
    .map(mapNasaEvent)
    .filter((event) => event.latitude !== null && event.longitude !== null);
};

module.exports = {
  fetchActiveFires,
};
