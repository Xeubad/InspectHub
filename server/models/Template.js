const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Template = sequelize.define('Template', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  createdBy: {
    type: DataTypes.INTEGER,
    field: 'created_by'
  }
}, {
  tableName: 'templates'
});

module.exports = Template;
