const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InspectionItem = sequelize.define('InspectionItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  inspectionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'inspection_id'
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  result: {
    type: DataTypes.TEXT
  },
  imagePath: {
    type: DataTypes.TEXT,
    field: 'image_path',
    comment: '图片路径，支持单图字符串或多图JSON数组格式 ["path1", "path2"]'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order'
  },
  isCustom: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_custom'
  },
  isGroup: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_group',
    comment: '是否为分组标题'
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    comment: '层级深度：1=设备/系统，2=类别，3=检查项'
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '编号，如"1.1"、"1.1.1"'
  },
  isDynamic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_dynamic',
    comment: '是否为动态项'
  },
  isUpdated: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_updated',
    comment: '在复制模式下，动态项是否已被更新'
  }
}, {
  tableName: 'inspection_items'
});

module.exports = InspectionItem;
