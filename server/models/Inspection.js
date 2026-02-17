const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inspection = sequelize.define('Inspection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  templateId: {
    type: DataTypes.INTEGER,
    field: 'template_id'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'completed'),
    defaultValue: 'draft'
  },
  inspectionTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'inspection_time',
    comment: '巡检时间'
  },
  inspectorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'inspector_id',
    comment: '巡检人ID'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by'
  }
}, {
  tableName: 'inspections'
});

module.exports = Inspection;
