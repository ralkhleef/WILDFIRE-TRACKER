// Verifies JWT access tokens and attaches the authenticated user to the request object.
const jwt = require('jsonwebtoken');

const env = require('../config/env');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authorization token is missing or invalid.');
  }

  const token = authHeader.split(' ')[1];
  const decodedToken = jwt.verify(token, env.jwtSecret);

  const user = await prisma.user.findUnique({
    where: { id: decodedToken.sub },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      googleId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(401, 'The authentication token does not belong to an active user.');
  }

  req.user = user;
  next();
});

module.exports = {
  protect,
};
