const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { auth } = require('../middleware/auth');

router.get('/export', auth, backupController.exportBackup);
router.post('/import', auth, backupController.importBackup);

module.exports = router;
