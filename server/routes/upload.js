const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { auth } = require('../middleware/auth');

router.post('/', auth, uploadController.uploadImage);
router.delete('/user-images', auth, uploadController.deleteUserImages);

module.exports = router;
