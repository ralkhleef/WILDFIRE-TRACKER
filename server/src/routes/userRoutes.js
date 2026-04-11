// Declares user profile and saved location routes for authenticated users.
const express = require('express');

const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const {
  profileValidation,
  savedLocationValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);
router.get('/profile', userController.getProfile);
router.put('/profile', profileValidation, userController.updateProfile);
router.post('/saved-locations', savedLocationValidation, userController.addSavedLocation);
router.get('/saved-locations', userController.getSavedLocations);

module.exports = router;
