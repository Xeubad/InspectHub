const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    // 优先取 Authorization 头；<img> 标签无法携带请求头，允许 ?token= 查询参数兜底
    const headerToken = req.header('Authorization')?.replace('Bearer ', '');
    const token = headerToken || req.query.token;

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
