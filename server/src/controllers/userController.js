// Handles user profile requests and saved location management.
const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/userService');

const getProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getProfile(req.user.id);

  res.status(200).json({
    success: true,
    data: profile,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const updatedProfile = await userService.updateProfile(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'User profile updated successfully.',
    data: updatedProfile,
  });
});

const addSavedLocation = asyncHandler(async (req, res) => {
  const savedLocation = await userService.addSavedLocation(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Saved location created successfully.',
    data: savedLocation,
  });
});

const getSavedLocations = asyncHandler(async (req, res) => {
  const savedLocations = await userService.getSavedLocations(req.user.id);

  res.status(200).json({
    success: true,
    count: savedLocations.length,
    data: savedLocations,
  });
});

const deleteSavedLocation = asyncHandler(async (req, res) => {
  await userService.deleteSavedLocation(req.user.id, req.params.id);

  res.status(200).json({
    success: true,
    message: 'Saved location deleted successfully.',
  });
});

module.exports = {
  getProfile,
  updateProfile,
  addSavedLocation,
  getSavedLocations,
  deleteSavedLocation,
};
