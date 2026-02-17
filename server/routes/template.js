const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', auth, templateController.getTemplates);
router.get('/:id', auth, templateController.getTemplate);
router.post('/', auth, adminOnly, templateController.createTemplate);
router.put('/:id', auth, adminOnly, templateController.updateTemplate);
router.delete('/:id', auth, adminOnly, templateController.deleteTemplate);

module.exports = router;
