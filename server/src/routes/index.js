// Combines all API route groups under a single router.
const express = require('express');

const alertRoutes = require('./alertRoutes');
const authRoutes = require('./authRoutes');
const fireRoutes = require('./fireRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/fires', fireRoutes);
router.use('/alerts', alertRoutes);
router.use('/users', userRoutes);

module.exports = router;
