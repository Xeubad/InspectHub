const { Inspection, InspectionItem, Template, TemplateItem, User } = require('../models');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, ImageRun, WidthType, AlignmentType, BorderStyle, VerticalAlign } = require('docx');
const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');

exports.getInspections = async (req, res) => {
  try {
    const where = {};
    if (req.user.role !== 'admin') {
      where.createdBy = req.user.id;
    }

    const inspections = await Inspection.findAll({
      where,
      include: [
        { model: Template, as: 'template', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'username'] },
        { model: User, as: 'inspector', attributes: ['id', 'username'] }
      ],
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
      // 层级路径格式：设备名称/检查项名称
      const oldItemsByPath = new Map();
      let currentDeviceName = '';
      
      original.items.forEach(item => {
        if (item.level === 1) {
          // 设备级别
          currentDeviceName = item.name;
          oldItemsByPath.set(item.name, item);
        } else if (item.level === 2 && currentDeviceName) {
          // 检查项级别，使用 设备名称/检查项名称 作为路径
          const path = `${currentDeviceName}/${item.name}`;
          oldItemsByPath.set(path, item);
        }
      });

      // 遍历模板项，使用层级路径匹配旧数据
      let currentTemplateDeviceName = '';
      
      newItems = templateItems.map((templateItem, index) => {
        let oldItem = null;
        
        if (templateItem.level === 1) {
          // 设备级别，直接用名称匹配
          currentTemplateDeviceName = templateItem.name;
          oldItem = oldItemsByPath.get(templateItem.name);
        } else if (templateItem.level === 2 && currentTemplateDeviceName) {
          // 检查项级别，使用层级路径匹配
          const path = `${currentTemplateDeviceName}/${templateItem.name}`;
          oldItem = oldItemsByPath.get(path);
        }

        let newImagePath = null;
        let result = null;

        // 如果旧数据中存在该项，则保留其结果和图片
        if (oldItem) {
          result = oldItem.result;
          
          if (oldItem.imagePath) {
            try {
              const parsed = JSON.parse(oldItem.imagePath);
              newImagePath = Array.isArray(parsed) ? oldItem.imagePath : JSON.stringify([oldItem.imagePath]);
            } catch {
              newImagePath = JSON.stringify([oldItem.imagePath]);
            }
          }
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
        let newImagePath = null;
        
        if (item.imagePath) {
          try {
            const parsed = JSON.parse(item.imagePath);
            newImagePath = Array.isArray(parsed) ? item.imagePath : JSON.stringify([item.imagePath]);
          } catch {
            newImagePath = JSON.stringify([item.imagePath]);
          }
        }
        
        return {
          inspectionId: newInspection.id,
          name: item.name,
          result: item.result,
          imagePath: newImagePath,
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
      inspectionItems = items.map((item, index) => {
        // 规范化 imagePath：统一转换为 JSON 数组字符串或 null
        let normalizedImagePath = null;
        if (item.imagePath) {
          if (Array.isArray(item.imagePath)) {
            normalizedImagePath = JSON.stringify(item.imagePath);
          } else if (typeof item.imagePath === 'string') {
            // 尝试解析，如果是 JSON 字符串则保留，否则包装为数组
            try {
              const parsed = JSON.parse(item.imagePath);
              normalizedImagePath = Array.isArray(parsed) ? item.imagePath : JSON.stringify([item.imagePath]);
            } catch {
              normalizedImagePath = JSON.stringify([item.imagePath]);
            }
          }
        }
        
        return {
          inspectionId: inspection.id,
          name: item.name,
          result: item.result || '',
          imagePath: normalizedImagePath,
          sortOrder: index,
          isCustom: item.isCustom || false,
          isGroup: item.isGroup || false,
          isDynamic: item.isDynamic || false,
          isUpdated: item.isUpdated !== undefined ? item.isUpdated : true,
          level: item.level || 1,
          code: item.code || null
        };
      });
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

    await inspection.update({ 
      title, 
      status, 
      inspectionTime: inspectionTime || null,
      inspectorId: inspectorId || inspection.inspectorId
    });

    if (items) {
      await InspectionItem.destroy({ where: { inspectionId: inspection.id } });
      
      if (items.length > 0) {
        const inspectionItems = items.map((item, index) => {
          // 规范化 imagePath：统一转换为 JSON 数组字符串或 null
          let normalizedImagePath = null;
          if (item.imagePath) {
            if (Array.isArray(item.imagePath)) {
              normalizedImagePath = JSON.stringify(item.imagePath);
            } else if (typeof item.imagePath === 'string') {
              try {
                const parsed = JSON.parse(item.imagePath);
                normalizedImagePath = Array.isArray(parsed) ? item.imagePath : JSON.stringify([item.imagePath]);
              } catch {
                normalizedImagePath = JSON.stringify([item.imagePath]);
              }
            }
          }
          
          return {
            inspectionId: inspection.id,
            name: item.name,
            result: item.result || '',
            imagePath: normalizedImagePath,
            sortOrder: index,
            isCustom: item.isCustom || false,
            isGroup: item.isGroup || false,
            isDynamic: item.isDynamic || false,
            isUpdated: item.isUpdated !== undefined ? item.isUpdated : true,
            level: item.level || 1,
            code: item.code || null
          };
        });
        await InspectionItem.bulkCreate(inspectionItems);
      }
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
    const inspection = await Inspection.findByPk(req.params.id);

    if (!inspection) {
      return res.status(404).json({ message: '巡检记录不存在' });
    }

    if (req.user.role !== 'admin' && inspection.createdBy !== req.user.id) {
      return res.status(403).json({ message: '无权删除此记录' });
    }

    await inspection.destroy();
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

        // 支持多图：从 imagePath 解析出图片数组
        let imagePaths = [];
        if (item.imagePath) {
          try {
            const parsed = JSON.parse(item.imagePath);
            if (Array.isArray(parsed)) {
              imagePaths = parsed;
            } else {
              imagePaths = [item.imagePath];
            }
          } catch {
            imagePaths = [item.imagePath]; // 单图字符串
          }
        }

        if (imagePaths.length > 0) {
          // 遍历所有图片，依次插入
          for (const imgPath of imagePaths) {
            const cleanPath = imgPath.replace(/\\/g, '/');
            const imagePath = path.join(__dirname, '..', cleanPath);
            
            if (fs.existsSync(imagePath)) {
              try {
                const imageBuffer = fs.readFileSync(imagePath);
                const dimensions = sizeOf(imageBuffer);
                
                // 固定宽度 280px，严格按 16:9 比例计算高度
                const fixedWidth = 280;
                const fixedHeight = Math.round(fixedWidth / 16 * 9);
                
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
