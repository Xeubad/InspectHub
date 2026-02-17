const { Template, TemplateItem, User } = require('../models');

exports.getTemplates = async (req, res) => {
  try {
    const templates = await Template.findAll({
      include: [
        { model: TemplateItem, as: 'items', order: [['sortOrder', 'ASC']] },
        { model: User, as: 'creator', attributes: ['id', 'username'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: '获取模板列表失败' });
  }
};

exports.getTemplate = async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id, {
      include: [
        { model: TemplateItem, as: 'items', order: [['sortOrder', 'ASC']] },
        { model: User, as: 'creator', attributes: ['id', 'username'] }
      ]
    });

    if (!template) {
      return res.status(404).json({ message: '模板不存在' });
    }

    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ message: '获取模板详情失败' });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const { name, description, items } = req.body;

    if (!name) {
      return res.status(400).json({ message: '模板名称不能为空' });
    }

    const template = await Template.create({
      name,
      description,
      createdBy: req.user.id
    });

    if (items && items.length > 0) {
const templateItems = items.map((item, index) => ({
        templateId: template.id,
        name: item.name,
        description: item.description,
        sortOrder: item.sortOrder !== undefined ? item.sortOrder : index,
        level: item.level || 1,
        code: item.code || null,
        parentId: item.parentId || null,
        isGroup: Boolean(item.isGroup),
        isDynamic: Boolean(item.isDynamic)
      }));
      await TemplateItem.bulkCreate(templateItems);
    }

    const result = await Template.findByPk(template.id, {
      include: [{ model: TemplateItem, as: 'items' }]
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ message: '创建模板失败' });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { name, description, items } = req.body;
    const template = await Template.findByPk(req.params.id);

    if (!template) {
      return res.status(404).json({ message: '模板不存在' });
    }

    await template.update({ name, description });

    if (items) {
      await TemplateItem.destroy({ where: { templateId: template.id } });
      
      if (items.length > 0) {
const templateItems = items.map((item, index) => ({
          templateId: template.id,
          name: item.name,
          description: item.description,
          sortOrder: item.sortOrder !== undefined ? item.sortOrder : index,
          level: item.level || 1,
          code: item.code || null,
          parentId: item.parentId || null,
          isGroup: Boolean(item.isGroup),
          isDynamic: Boolean(item.isDynamic)
        }));
        await TemplateItem.bulkCreate(templateItems);
      }
    }

    const result = await Template.findByPk(template.id, {
      include: [{ model: TemplateItem, as: 'items' }]
    });

    res.json(result);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ message: '更新模板失败' });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);

    if (!template) {
      return res.status(404).json({ message: '模板不存在' });
    }

    await template.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ message: '删除模板失败' });
  }
};
