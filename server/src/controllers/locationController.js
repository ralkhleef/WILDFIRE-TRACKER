// HTTP layer for Google Maps Platform helpers (geocoding / places / AQI).
const asyncHandler = require('../utils/asyncHandler');
const locationService = require('../services/locationService');

const geocode = asyncHandler(async (req, res) => {
  const address = String(req.query.address || '').trim();
  if (!address) {
    return res.status(400).json({
      success: false,
      message: 'Query parameter "address" is required.',
    });
  }
  const result = await locationService.geocodeAddress(address);
  return res.status(200).json({
    success: true,
    data: result,
  });
});

const nearbyResources = asyncHandler(async (req, res) => {
  const latitude = Number(req.query.lat ?? req.query.latitude);
  const longitude = Number(req.query.lng ?? req.query.longitude);
  const type = String(req.query.type || 'fire_station');

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({
      success: false,
      message: 'Query parameters "lat" and "lng" are required.',
    });
  }

  const results = await locationService.findNearbyResources({ latitude, longitude, type });
  return res.status(200).json({
    success: true,
    count: results.length,
    data: results,
  });
});

const airQuality = asyncHandler(async (req, res) => {
  const latitude = Number(req.query.lat ?? req.query.latitude);
  const longitude = Number(req.query.lng ?? req.query.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({
      success: false,
      message: 'Query parameters "lat" and "lng" are required.',
    });
  }
  const data = await locationService.getAirQuality({ latitude, longitude });
  return res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  geocode,
  nearbyResources,
  airQuality,
};
