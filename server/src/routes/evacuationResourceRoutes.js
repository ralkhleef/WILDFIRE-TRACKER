// Evacuation/shelter resource routes.
const express = require('express');

const evacuationResourceController = require('../controllers/evacuationResourceController');
const { protect } = require('../middleware/authMiddleware');
const {
  evacuationResourceValidation,
  idParamValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/', evacuationResourceController.listResources);
router.get('/nearby', evacuationResourceController.getNearbyResources);
router.get('/:id', idParamValidation, evacuationResourceController.getResourceById);
router.post('/', protect, evacuationResourceValidation, evacuationResourceController.createResource);
router.put('/:id', protect, idParamValidation, evacuationResourceValidation, evacuationResourceController.updateResource);
router.delete('/:id', protect, idParamValidation, evacuationResourceController.deleteResource);

module.exports = router;
