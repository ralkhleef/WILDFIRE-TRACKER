const env = require('../config/env');

const safeFetchJson = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      console.warn(`Upstream Google API request failed: ${response.status} ${url}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(`Upstream Google API request error: ${error.message}`);
    return null;
  }
};

const geocodeAddress = async (address) => {
  if (!address) return null;
  const key = env.googleGeocodingApiKey;
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address,
  )}&key=${encodeURIComponent(key)}`;
  const body = await safeFetchJson(url);
  const first = body?.results?.[0];
  if (!first?.geometry?.location) return null;
  return {
    address: first.formatted_address,
    latitude: first.geometry.location.lat,
    longitude: first.geometry.location.lng,
    placeId: first.place_id,
  };
};

const findNearbyResources = async ({ latitude, longitude, type = 'fire_station' }) => {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return [];
  const key = env.googlePlacesApiKey;
  if (!key) return [];
  const radius = 8000;
  const url =
    'https://maps.googleapis.com/maps/api/place/nearbysearch/json' +
    `?location=${encodeURIComponent(`${latitude},${longitude}`)}` +
    `&radius=${radius}&type=${encodeURIComponent(type)}&key=${encodeURIComponent(key)}`;
  const body = await safeFetchJson(url);
  const results = Array.isArray(body?.results) ? body.results : [];
  return results.slice(0, 20).map((place) => ({
    id: place.place_id,
    name: place.name,
    address: place.vicinity || place.formatted_address || '',
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    rating: place.rating || null,
    types: place.types || [],
  }));
};

const getAirQuality = async ({ latitude, longitude }) => {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return null;
  const key = env.googleAirQualityApiKey;
  if (!key) return null;
  const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${encodeURIComponent(
    key,
  )}`;
  const body = await safeFetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: { latitude, longitude } }),
  });
  if (!body) return null;
  const indexes = Array.isArray(body.indexes) ? body.indexes : [];
  const universal = indexes.find((idx) => idx.code === 'uaqi') || indexes[0] || null;
  return {
    dateTime: body.dateTime || null,
    aqi: universal?.aqi || null,
    aqiCategory: universal?.category || null,
    aqiDisplay: universal?.displayName || null,
    dominantPollutant: universal?.dominantPollutant || null,
    pollutants: body.pollutants || [],
  };
};

module.exports = {
  geocodeAddress,
  findNearbyResources,
  getAirQuality,
};
