const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TemplateItem = sequelize.define('TemplateItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  templateId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'template_id'
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order'
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'parent_id',
    comment: '父级ID，用于构建层级结构，null表示顶级'
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    comment: '层级深度：1=设备/系统，2=类别，3=检查项，null=不使用层级'
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '编号，如"1.1"、"1.1.1"，可选'
  },
  isGroup: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_group',
    comment: '是否为分组标题（true=分组标题，不需要填写检查结果；false=检查项，需要填写结果）'
  },
  isDynamic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_dynamic',
    comment: '是否为动态项（每次巡检需更新图片）'
  }
}, {
  tableName: 'template_items'
});

module.exports = TemplateItem;
