// Handles wildfire API requests and delegates data work to the fire service layer.
const asyncHandler = require('../utils/asyncHandler');
const fireService = require('../services/fireService');

const getFires = asyncHandler(async (req, res) => {
  const fires = await fireService.listFires({
    includeExternal: req.query.includeExternal === 'true',
  });

  res.status(200).json({
    success: true,
    count: fires.length,
    data: fires,
  });
});

const getFireById = asyncHandler(async (req, res) => {
  const fire = await fireService.getFireById(req.params.id);

  res.status(200).json({
    success: true,
    data: fire,
  });
});

const getNearbyFires = asyncHandler(async (req, res) => {
  const fires = await fireService.getNearbyFires({
    latitude: Number(req.query.latitude),
    longitude: Number(req.query.longitude),
    radius: req.query.radius ? Number(req.query.radius) : undefined,
    includeExternal: req.query.includeExternal === 'true',
  });

  res.status(200).json({
    success: true,
    count: fires.length,
    data: fires,
  });
});

module.exports = {
  getFires,
  getFireById,
  getNearbyFires,
};
