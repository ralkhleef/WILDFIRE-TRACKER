// Handles alert preference requests and location-based alert lookups.
const asyncHandler = require('../utils/asyncHandler');
const alertService = require('../services/alertService');

const getAlerts = asyncHandler(async (req, res) => {
  const alerts = await alertService.listAlertsForUser(req.user.id);

  res.status(200).json({
    success: true,
    data: alerts,
  });
});

const createAlert = asyncHandler(async (req, res) => {
  const alertPreference = await alertService.upsertAlertPreference(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Alert preference saved successfully.',
    data: alertPreference,
  });
});

const getLocalAlerts = asyncHandler(async (req, res) => {
  const localAlerts = await alertService.getLocalAlerts({
    userId: req.user.id,
    latitude: req.query.latitude ? Number(req.query.latitude) : undefined,
    longitude: req.query.longitude ? Number(req.query.longitude) : undefined,
    radius: req.query.radius ? Number(req.query.radius) : undefined,
  });

  res.status(200).json({
    success: true,
    data: localAlerts,
  });
});

module.exports = {
  getAlerts,
  createAlert,
  getLocalAlerts,
};
