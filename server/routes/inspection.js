const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspectionController');
const { auth } = require('../middleware/auth');

router.get('/', auth, inspectionController.getInspections);
router.get('/:id', auth, inspectionController.getInspection);
router.post('/', auth, inspectionController.createInspection);
router.put('/:id', auth, inspectionController.updateInspection);
router.delete('/:id', auth, inspectionController.deleteInspection);
router.post('/:id/copy', auth, inspectionController.copyInspection);
router.get('/:id/export', auth, inspectionController.exportInspection);

module.exports = router;
