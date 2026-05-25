const asyncHandler = require('../utils/asyncHandler');
const nwsAlertService = require('../services/nwsAlertService');

const getActiveFireAlerts = asyncHandler(async (req, res) => {
  const area = String(req.query.area || 'CA').toUpperCase();
  const alerts = await nwsAlertService.fetchActiveAlerts({ area });

  res.status(200).json({
    success: true,
    count: alerts.length,
    data: alerts,
  });
});

const getNearbyFireAlerts = asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat ?? req.query.latitude);
  const lng = Number(req.query.lng ?? req.query.longitude);
  const area = String(req.query.area || 'CA').toUpperCase();

  const alerts = await nwsAlertService.fetchActiveAlerts({ area });

  // Nearby filtering would need polygon math, so this returns the CA feed.
  res.status(200).json({
    success: true,
    count: alerts.length,
    origin: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
    data: alerts,
  });
});

module.exports = {
  getActiveFireAlerts,
  getNearbyFireAlerts,
};
