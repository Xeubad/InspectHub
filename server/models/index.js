const sequelize = require('../config/database');
const User = require('./User');
const Template = require('./Template');
const TemplateItem = require('./TemplateItem');
const Inspection = require('./Inspection');
const InspectionItem = require('./InspectionItem');

// 关联关系
User.hasMany(Template, { foreignKey: 'createdBy', as: 'templates' });
Template.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Template.hasMany(TemplateItem, { foreignKey: 'templateId', as: 'items', onDelete: 'CASCADE' });
TemplateItem.belongsTo(Template, { foreignKey: 'templateId' });

User.hasMany(Inspection, { foreignKey: 'createdBy', as: 'inspections' });
Inspection.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Inspection, { foreignKey: 'inspectorId', as: 'inspectedRecords' });
Inspection.belongsTo(User, { foreignKey: 'inspectorId', as: 'inspector' });

Template.hasMany(Inspection, { foreignKey: 'templateId', as: 'inspections' });
Inspection.belongsTo(Template, { foreignKey: 'templateId', as: 'template' });

Inspection.hasMany(InspectionItem, { foreignKey: 'inspectionId', as: 'items', onDelete: 'CASCADE' });
InspectionItem.belongsTo(Inspection, { foreignKey: 'inspectionId' });

module.exports = {
  sequelize,
  User,
  Template,
  TemplateItem,
  Inspection,
  InspectionItem
};
