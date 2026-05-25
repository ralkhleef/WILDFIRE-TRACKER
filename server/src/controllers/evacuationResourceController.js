const asyncHandler = require('../utils/asyncHandler');
const evacuationResourceService = require('../services/evacuationResourceService');

const listResources = asyncHandler(async (req, res) => {
  const data = await evacuationResourceService.listResources({
    type: req.query.type,
  });
  res.status(200).json({ success: true, count: data.length, data });
});

const getNearbyResources = asyncHandler(async (req, res) => {
  const data = await evacuationResourceService.getNearbyResources({
    latitude: req.query.latitude ?? req.query.lat,
    longitude: req.query.longitude ?? req.query.lng,
    radius: req.query.radius,
    type: req.query.type,
  });
  res.status(200).json({ success: true, count: data.length, data });
});

const getResourceById = asyncHandler(async (req, res) => {
  const data = await evacuationResourceService.getResourceById(req.params.id);
  res.status(200).json({ success: true, data });
});

const createResource = asyncHandler(async (req, res) => {
  const data = await evacuationResourceService.createResource(req.body);
  res.status(201).json({
    success: true,
    message: 'Evacuation resource created successfully.',
    data,
  });
});

const updateResource = asyncHandler(async (req, res) => {
  const data = await evacuationResourceService.updateResource(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Evacuation resource updated successfully.',
    data,
  });
});

const deleteResource = asyncHandler(async (req, res) => {
  await evacuationResourceService.deleteResource(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Evacuation resource deleted successfully.',
  });
});

module.exports = {
  listResources,
  getNearbyResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
};
