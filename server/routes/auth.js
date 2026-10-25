const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 登录/注册防暴力破解：同一 IP 15 分钟内最多 20 次
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: '尝试次数过多，请 15 分钟后再试' }
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/me', auth, authController.getMe);
router.get('/users', auth, authController.getUsers);

module.exports = router;
