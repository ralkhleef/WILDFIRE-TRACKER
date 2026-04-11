// Encapsulates user signup, login, token creation, and Google OAuth account linking logic.
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const env = require('../config/env');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const sanitizeUser = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

const signToken = (userId) =>
  jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const createAuthResponse = (user) => ({
  token: signToken(user.id),
  user: sanitizeUser(user),
});

const signupUser = async ({ email, password, name }) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(409, 'A user with that email already exists.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  return createAuthResponse(user);
};

const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.password) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  return createAuthResponse(user);
};

const findOrCreateGoogleUser = async (profile) => {
  const email = profile.emails?.[0]?.value;

  if (!email) {
    throw new ApiError(400, 'Google account did not provide an email address.');
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      googleId: profile.id,
      name: profile.displayName || undefined,
    },
    create: {
      email,
      googleId: profile.id,
      name: profile.displayName || email.split('@')[0],
    },
  });

  return sanitizeUser(user);
};

module.exports = {
  sanitizeUser,
  signToken,
  createAuthResponse,
  signupUser,
  loginUser,
  findOrCreateGoogleUser,
};
