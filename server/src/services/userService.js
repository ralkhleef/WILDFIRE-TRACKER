// Handles profile reads, profile updates, and saved location persistence for users.
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const profileSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  googleId: true,
  createdAt: true,
  updatedAt: true,
  alertPreference: true,
  savedLocations: {
    orderBy: { createdAt: 'desc' },
  },
};

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: profileSelect,
  });

  if (!user) {
    throw new ApiError(404, 'User profile not found.');
  }

  return user;
};

const updateProfile = async (userId, { name, email }) => {
  const updateData = {};

  if (typeof name !== 'undefined') {
    updateData.name = name;
  }

  if (typeof email !== 'undefined') {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ApiError(409, 'Another account already uses that email address.');
    }

    updateData.email = email;
  }

  if (Object.keys(updateData).length === 0) {
    return getProfile(userId);
  }

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: profileSelect,
  });
};

const addSavedLocation = async (userId, { label, latitude, longitude }) =>
  prisma.savedLocation.create({
    data: {
      userId,
      label,
      latitude,
      longitude,
    },
  });

const getSavedLocations = async (userId) =>
  prisma.savedLocation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

const deleteSavedLocation = async (userId, savedLocationId) => {
  const savedLocation = await prisma.savedLocation.findFirst({
    where: {
      id: savedLocationId,
      userId,
    },
  });

  if (!savedLocation) {
    throw new ApiError(404, 'Saved location not found.');
  }

  return prisma.savedLocation.delete({
    where: { id: savedLocationId },
  });
};

module.exports = {
  getProfile,
  updateProfile,
  addSavedLocation,
  getSavedLocations,
  deleteSavedLocation,
};
