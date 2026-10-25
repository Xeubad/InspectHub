const { Inspection, InspectionItem, Template, TemplateItem, User, sequelize } = require('../models');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, ImageRun, WidthType, AlignmentType, BorderStyle, VerticalAlign } = require('docx');
const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');
const { parseImagePaths, removeOrphanImages } = require('../utils/images');

// 规范化 imagePath：统一转换为 JSON 数组字符串或 null
function normalizeImagePath(imagePath) {
  if (!imagePath) return null;
  if (Array.isArray(imagePath)) {
    return imagePath.length > 0 ? JSON.stringify(imagePath) : null;
  }
  if (typeof imagePath === 'string') {
    try {
      const parsed = JSON.parse(imagePath);
      if (Array.isArray(parsed)) return parsed.length > 0 ? JSON.stringify(parsed) : null;
      return JSON.stringify([parsed]);
    } catch {
      return JSON.stringify([imagePath]);
    }
  }
  return null;
}

exports.getInspections = async (req, res) => {
  try {
    const where = {};
    if (req.user.role !== 'admin') {
      where.createdBy = req.user.id;
    }

    const include = [
      { model: Template, as: 'template', attributes: ['id', 'name'] },
      { model: User, as: 'creator', attributes: ['id', 'username'] },
      { model: User, as: 'inspector', attributes: ['id', 'username'] }
    ];

    // 传 page 参数时走分页，返回 { rows, total, page, pageSize }；不传则保持旧的全量数组格式
    const page = parseInt(req.query.page, 10);
    const pageSize = parseInt(req.query.pageSize, 10);

    if (page > 0 && pageSize > 0) {
      const { rows, count } = await Inspection.findAndCountAll({
        where,
        include,
        order: [['updatedAt', 'DESC']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        distinct: true
      });
      return res.json({ rows, total: count, page, pageSize });
    }

    const inspections = await Inspection.findAll({
      where,
      include,
      order: [['updatedAt', 'DESC']]
    });
    res.json(inspections);
  } catch (error) {
    console.error('Get inspections error:', error);
    res.status(500).json({ message: '获取巡检列表失败' });
  }
};

exports.copyInspection = async (req, res) => {
  try {
    const originalId = req.params.id;
    const original = await Inspection.findByPk(originalId, {
      include: [{ model: InspectionItem, as: 'items' }]
    });

    if (!original) {
      return res.status(404).json({ message: '原记录不存在' });
    }

    // 创建新记录
    const newInspection = await Inspection.create({
      templateId: original.templateId,
      title: `${original.title} - 副本`,
      status: 'draft',
      inspectionTime: new Date(),
      inspectorId: original.inspectorId,
      createdBy: req.user.id
    });

    let newItems = [];

    // 如果有关联模板，则从模板同步最新结构
    if (original.templateId) {
      const templateItems = await TemplateItem.findAll({
        where: { templateId: original.templateId },
        order: [['sortOrder', 'ASC']]
      });

      // 构建旧数据的层级路径映射
      // 层级路径格式：设备名称/类别名称/检查项名称（按实际层级深度拼接）
      const oldItemsByPath = new Map();
      const levelNames = ['', '', '', '']; // level 1/2/3 的当前名称

      original.items.forEach(item => {
        const level = item.level || 1;
        if (level >= 1 && level <= 3) {
          levelNames[level] = item.name;
          // 更深层级重置，避免残留上一分支的名称
          for (let l = level + 1; l <= 3; l++) levelNames[l] = '';
        }
        const pathKey = levelNames.slice(1, level + 1).filter(Boolean).join('/');
        if (pathKey) {
          oldItemsByPath.set(pathKey, item);
        }
      });

      // 遍历模板项，使用层级路径匹配旧数据
      const templateNames = ['', '', '', ''];

      newItems = templateItems.map((templateItem, index) => {
        const level = templateItem.level || 1;
        if (level >= 1 && level <= 3) {
          templateNames[level] = templateItem.name;
          for (let l = level + 1; l <= 3; l++) templateNames[l] = '';
        }
        const pathKey = templateNames.slice(1, level + 1).filter(Boolean).join('/');
        const oldItem = pathKey ? oldItemsByPath.get(pathKey) : null;

        let newImagePath = null;
        let result = null;

        // 如果旧数据中存在该项，则保留其结果和图片
        if (oldItem) {
          result = oldItem.result;
          newImagePath = oldItem.imagePath;
        }

        return {
          inspectionId: newInspection.id,
          name: templateItem.name,
          result: result,
          imagePath: newImagePath,
          sortOrder: index,
          isCustom: false,
          isGroup: templateItem.isGroup,
          isDynamic: !!templateItem.isDynamic,
          isUpdated: oldItem ? true : (!templateItem.isDynamic ? true : false),
          level: templateItem.level,
          code: templateItem.code
        };
      });
    } else {
      // 如果没有关联模板，则直接复制原有项目
      newItems = original.items.map((item, index) => {
        return {
          inspectionId: newInspection.id,
          name: item.name,
          result: item.result,
          imagePath: item.imagePath,
          sortOrder: index,
          isCustom: item.isCustom,
          isGroup: item.isGroup,
          isDynamic: !!item.isDynamic,
          isUpdated: true,
          level: item.level,
          code: item.code
        };
      });
    }

    await InspectionItem.bulkCreate(newItems);

    const result = await Inspection.findByPk(newInspection.id, {
      include: [{ model: InspectionItem, as: 'items' }]
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Copy inspection error:', error);
    res.status(500).json({ message: '复制失败' });
  }
};

exports.getInspection = async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id, {
      include: [
        { model: InspectionItem, as: 'items', order: [['sortOrder', 'ASC']] },
        { model: Template, as: 'template', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'username'] },
        { model: User, as: 'inspector', attributes: ['id', 'username'] }
      ]
    });

    if (!inspection) {
      return res.status(404).json({ message: '巡检记录不存在' });
    }

    if (req.user.role !== 'admin' && inspection.createdBy !== req.user.id) {
      return res.status(403).json({ message: '无权访问此记录' });
    }

    res.json(inspection);
  } catch (error) {
    console.error('Get inspection error:', error);
    res.status(500).json({ message: '获取巡检详情失败' });
  }
};

exports.createInspection = async (req, res) => {
  try {
    const { templateId, title, items, status, inspectionTime, inspectorId } = req.body;

    if (!title) {
      return res.status(400).json({ message: '巡检标题不能为空' });
    }

    const inspection = await Inspection.create({
      templateId,
      title,
      status: status || 'draft',
      inspectionTime: inspectionTime || new Date(),
      inspectorId: inspectorId || req.user.id,
      createdBy: req.user.id
    });

    let inspectionItems = [];
    if (items && items.length > 0) {
      inspectionItems = items.map((item, index) => ({
        inspectionId: inspection.id,
        name: item.name,
        result: item.result || '',
        imagePath: normalizeImagePath(item.imagePath),
        sortOrder: index,
        isCustom: item.isCustom || false,
        isGroup: item.isGroup || false,
        isDynamic: item.isDynamic || false,
        isUpdated: item.isUpdated !== undefined ? item.isUpdated : true,
        level: item.level || 1,
        code: item.code || null
      }));
      await InspectionItem.bulkCreate(inspectionItems);
    }

    const result = await Inspection.findByPk(inspection.id, {
      include: [{ model: InspectionItem, as: 'items' }]
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create inspection error:', error);
    res.status(500).json({ message: '创建巡检记录失败' });
  }
};

exports.updateInspection = async (req, res) => {
  try {
    const { title, status, items, inspectionTime, inspectorId } = req.body;
    const inspection = await Inspection.findByPk(req.params.id);

    if (!inspection) {
      return res.status(404).json({ message: '巡检记录不存在' });
    }

    if (req.user.role !== 'admin' && inspection.createdBy !== req.user.id) {
      return res.status(403).json({ message: '无权修改此记录' });
    }

    // 记录替换前的图片，事务提交后统一清理孤儿文件
    let oldImagePaths = [];
    if (items) {
      const oldItems = await InspectionItem.findAll({
        where: { inspectionId: inspection.id },
        attributes: ['imagePath']
      });
      oldImagePaths = oldItems.flatMap(i => parseImagePaths(i.imagePath));
    }

    await sequelize.transaction(async (t) => {
      await inspection.update({
        title,
        status,
        inspectionTime: inspectionTime || null,
        inspectorId: inspectorId || inspection.inspectorId
      }, { transaction: t });

      if (items) {
        await InspectionItem.destroy({ where: { inspectionId: inspection.id } }, { transaction: t });

        if (items.length > 0) {
          const inspectionItems = items.map((item, index) => ({
            inspectionId: inspection.id,
            name: item.name,
            result: item.result || '',
            imagePath: normalizeImagePath(item.imagePath),
            sortOrder: index,
            isCustom: item.isCustom || false,
            isGroup: item.isGroup || false,
            isDynamic: item.isDynamic || false,
            isUpdated: item.isUpdated !== undefined ? item.isUpdated : true,
            level: item.level || 1,
            code: item.code || null
          }));
          await InspectionItem.bulkCreate(inspectionItems, { transaction: t });
        }
      }
    });

    if (items && oldImagePaths.length > 0) {
      const newImageSet = new Set(items.flatMap(i => parseImagePaths(normalizeImagePath(i.imagePath))));
      const removed = oldImagePaths.filter(p => !newImageSet.has(p));
      if (removed.length > 0) await removeOrphanImages(removed);
    }

    const result = await Inspection.findByPk(inspection.id, {
      include: [{ model: InspectionItem, as: 'items' }]
    });

    res.json(result);
  } catch (error) {
    console.error('Update inspection error:', error);
    res.status(500).json({ message: '更新巡检记录失败' });
  }
};

exports.deleteInspection = async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id, {
      include: [{ model: InspectionItem, as: 'items', attributes: ['imagePath'] }]
    });

    if (!inspection) {
      return res.status(404).json({ message: '巡检记录不存在' });
    }

    if (req.user.role !== 'admin' && inspection.createdBy !== req.user.id) {
      return res.status(403).json({ message: '无权删除此记录' });
    }

    const candidateImages = inspection.items.flatMap(i => parseImagePaths(i.imagePath));

    await inspection.destroy();

    // 记录删除后，检查这些图片是否仍被其他记录引用（复制会共享图片）
    if (candidateImages.length > 0) await removeOrphanImages(candidateImages);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete inspection error:', error);
    res.status(500).json({ message: '删除巡检记录失败' });
  }
};

exports.exportInspection = async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id, {
      include: [
        { model: InspectionItem, as: 'items', order: [['sortOrder', 'ASC']] },
        { model: User, as: 'creator', attributes: ['id', 'username'] },
        { model: User, as: 'inspector', attributes: ['id', 'username'] }
      ]
    });

    if (!inspection) {
      return res.status(404).json({ message: '巡检记录不存在' });
    }

    if (req.user.role !== 'admin' && inspection.createdBy !== req.user.id) {
      return res.status(403).json({ message: '无权导出此记录' });
    }

    // 构建文档内容
    const docChildren = [
      // 标题
      new Paragraph({
        children: [new TextRun({ text: inspection.title, bold: true, size: 32 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      // 巡检信息
      new Paragraph({
        children: [
          new TextRun({ text: `巡检人：${inspection.inspector?.username || inspection.creator?.username}`, size: 24 }),
          new TextRun({ text: `    巡检时间：${inspection.inspectionTime ? new Date(inspection.inspectionTime).toLocaleString('zh-CN') : inspection.createdAt.toLocaleString('zh-CN')}`, size: 24 }),
          new TextRun({ text: `    状态：${inspection.status === 'completed' ? '已完成' : '草稿'}`, size: 24 })
        ],
        spacing: { after: 400 }
      })
    ];

    // 创建表头（只创建一次）
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: '序号', bold: true })], alignment: AlignmentType.CENTER })],
            width: { size: 800, type: WidthType.DXA }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: '巡检项', bold: true })], alignment: AlignmentType.CENTER })],
            width: { size: 3000, type: WidthType.DXA }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: '检查结果', bold: true })], alignment: AlignmentType.CENTER })],
            width: { size: 3000, type: WidthType.DXA }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: '截图', bold: true })], alignment: AlignmentType.CENTER })],
            width: { size: 3000, type: WidthType.DXA }
          })
        ]
      })
    ];

    let itemIndex = 0; // 检查项的序号计数器

    // 遍历所有项，添加到表格中
    for (let i = 0; i < inspection.items.length; i++) {
      const item = inspection.items[i];

      // 如果是分组标题，作为表格行插入（合并单元格）
      if (item.isGroup) {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: item.code ? `${item.code} ${item.name}` : item.name,
                        bold: true,
                        size: 26,
                        color: '4472C4'
                      })
                    ]
                  })
                ],
                columnSpan: 4, // 合并四个列
                shading: {
                  fill: 'E7E6E6',
                  type: 'clear'
                }
              })
            ]
          })
        );
      }
      // 如果是检查项
      else {
        itemIndex++;
        const cellChildren = [];

        const imagePaths = parseImagePaths(item.imagePath);

        if (imagePaths.length > 0) {
          // 遍历所有图片，依次插入
          for (const imgPath of imagePaths) {
            const cleanPath = imgPath.replace(/\\/g, '/');
            const imagePath = path.join(__dirname, '..', cleanPath);

            if (fs.existsSync(imagePath)) {
              try {
                const imageBuffer = fs.readFileSync(imagePath);
                const dimensions = sizeOf(imageBuffer);

                // 固定宽度 280px，高度按原图比例缩放，避免拉伸变形
                const fixedWidth = 280;
                const fixedHeight = Math.round(fixedWidth * dimensions.height / dimensions.width) || 157;

                cellChildren.push(
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: imageBuffer,
                        transformation: {
                          width: fixedWidth,
                          height: fixedHeight
                        }
                      })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 100, after: 100 }
                  })
                );
              } catch (err) {
                console.error(`Failed to load image at ${imagePath}:`, err);
                cellChildren.push(new Paragraph({ text: '图片文件读取失败' }));
              }
            } else {
              cellChildren.push(new Paragraph({ text: '图片文件不存在' }));
            }
          }
        } else {
          cellChildren.push(new Paragraph({ text: '无图片' }));
        }

        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: item.code || String(itemIndex), alignment: AlignmentType.CENTER })],
                verticalAlign: VerticalAlign.CENTER
              }),
              new TableCell({
                children: [new Paragraph({ text: item.name, alignment: AlignmentType.CENTER })],
                verticalAlign: VerticalAlign.CENTER
              }),
              new TableCell({
                children: [new Paragraph({ text: item.result || '', alignment: AlignmentType.CENTER })],
                verticalAlign: VerticalAlign.CENTER
              }),
              new TableCell({
                children: cellChildren,
                verticalAlign: VerticalAlign.CENTER
              })
            ]
          })
        );
      }
    }

    // 添加表格到文档
    docChildren.push(
      new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      })
    );

    const doc = new Document({
      sections: [{
        children: docChildren
      }]
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(inspection.title)}.docx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Export inspection error:', error);
    res.status(500).json({ message: '导出失败' });
  }
};
