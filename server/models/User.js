const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'engineer'),
    defaultValue: 'engineer'
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

/**
 * 确保系统存在至少一个管理员。
 * 优先使用环境变量 ADMIN_USERNAME / ADMIN_PASSWORD；
 * 未提供密码时生成随机密码并打印到控制台（仅此一次）。
 */
User.ensureAdminExists = async function() {
  const admin = await this.findOne({ where: { role: 'admin' } });
  if (admin) return admin;

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');

  await this.create({ username, password, role: 'admin' });

  console.log('====================================================');
  console.log('已创建初始管理员账号：');
  console.log(`  用户名：${username}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`  密码：${password}`);
    console.log('  （随机生成，请立即登录并修改）');
  }
  console.log('====================================================');
  return null;
};

module.exports = User;
