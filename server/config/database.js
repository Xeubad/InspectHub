const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'inspection_platform',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '000000',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    timezone: '+08:00',
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

module.exports = sequelize;
