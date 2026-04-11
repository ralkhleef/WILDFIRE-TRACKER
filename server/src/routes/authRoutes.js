// Declares authentication routes for signup, login, Google OAuth, and current user access.
const express = require('express');

const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  loginValidation,
  signupValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.post('/signup', signupValidation, authController.signup);
router.post('/login', loginValidation, authController.login);
router.get('/me', protect, authController.getCurrentUser);
router.get('/google', authController.startGoogleAuth);
router.get('/google/callback', authController.handleGoogleCallback);

module.exports = router;
