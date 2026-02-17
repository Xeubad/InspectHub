const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '请先登录' });
    }

    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: '认证失败，请重新登录' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' });
  }
  next();
};

module.exports = { auth, adminOnly };
