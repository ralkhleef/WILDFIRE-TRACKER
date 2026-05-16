// Declares user profile and saved location routes for authenticated users.
const express = require('express');

const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const {
  profileValidation,
  savedLocationIdValidation,
  savedLocationValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);
router.get('/profile', userController.getProfile);
router.put('/profile', profileValidation, userController.updateProfile);
router.delete('/profile', userController.deleteProfile);
router.post('/saved-locations', savedLocationValidation, userController.addSavedLocation);
router.get('/saved-locations', userController.getSavedLocations);
router.put('/saved-locations/:id', savedLocationIdValidation, userController.updateSavedLocation);
router.delete('/saved-locations/:id', savedLocationIdValidation, userController.deleteSavedLocation);

module.exports = router;
