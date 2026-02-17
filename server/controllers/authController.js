const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { jwtSecret, jwtExpiresIn } = require('../config');

const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });
};

exports.register = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    const user = await User.create({
      username,
      password,
      role: role || 'engineer'
    });

    const token = generateToken(user);

    res.status(201).json({
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: '注册失败' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = generateToken(user);

    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '登录失败' });
  }
};

exports.getMe = async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'role']
    });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: '获取用户列表失败' });
  }
};
