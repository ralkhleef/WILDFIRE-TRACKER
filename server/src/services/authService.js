// Encapsulates user signup, login, token creation, and Google OAuth account linking logic.
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const env = require('../config/env');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const normalizeEmail = (email) => email.trim().toLowerCase();

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

const signupUser = async ({ email, password, name, username }) => {
  const normalizedEmail = normalizeEmail(email);

  const existingEmail = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingEmail) {
    throw new ApiError(409, 'A user with that email already exists.');
  }

  let normalizedUsername;
  if (typeof username === 'string' && username.trim()) {
    normalizedUsername = username.trim().toLowerCase();
    const existingUsername = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingUsername) {
      throw new ApiError(409, 'That username is already taken.');
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      username: normalizedUsername || null,
      password: hashedPassword,
      name: typeof name === 'string' ? name.trim() || null : null,
    },
  });

  return createAuthResponse(user);
};

const loginUser = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
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

  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      googleId: profile.id,
      name: profile.displayName || undefined,
    },
    create: {
      email: normalizedEmail,
      googleId: profile.id,
      name: profile.displayName || normalizedEmail.split('@')[0],
    },
  });

  return sanitizeUser(user);
};

module.exports = {
  normalizeEmail,
  sanitizeUser,
  signToken,
  createAuthResponse,
  signupUser,
  loginUser,
  findOrCreateGoogleUser,
};
