const { Template, TemplateItem, Inspection, InspectionItem, User, sequelize } = require('../models');
const archiver = require('archiver');
const unzipper = require('unzipper');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { uploadDir } = require('../config');

// 统一使用绝对路径，避免在 Windows/Linux 切换时出现找不到目录的问题
const tempDir = path.join(__dirname, '..', 'temp_backup');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const upload = multer({ 
  dest: tempDir,
  limits: { fileSize: 500 * 1024 * 1024 } // 允许上传最大 500MB 的备份包
});

exports.exportBackup = async (req, res) => {
  try {
    // 只有管理员可以备份
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '只有管理员可以导出备份' });
    }

    // 创建一个 archiver 实例
    const archive = archiver('zip', {
      zlib: { level: 9 } // 设置压缩级别
    });

    // 设置响应头，告诉浏览器这是一个文件下载
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.attachment(`backup-${timestamp}.zip`);

    // 将压缩包流式传输到响应对象
    archive.pipe(res);

    // 1. 导出数据库数据
    // 注意：包含密码 hash（bcrypt），用于完整恢复；请妥善保管备份包
    const users = await User.findAll();
    const templates = await Template.findAll({ include: [{ model: TemplateItem, as: 'items' }] });
    const inspections = await Inspection.findAll({ include: [{ model: InspectionItem, as: 'items' }] });

    const dbData = {
      users,
      templates,
      inspections,
      exportTime: new Date().toISOString(),
      version: '1.0.0'
    };

    archive.append(JSON.stringify(dbData, null, 2), { name: 'database_export.json' });

    // 2. 导出图片文件
    const uploadPath = path.join(__dirname, '..', uploadDir);
    if (fs.existsSync(uploadPath)) {
      archive.directory(uploadPath, uploadDir);
    }

    // 完成压缩并结束响应
    archive.finalize();

  } catch (error) {
    console.error('Backup export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: '生成备份失败' });
    }
  }
};

exports.importBackup = [
  upload.single('file'),
  async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '只有管理员可以导入备份' });
    }

    if (!req.file) {
      return res.status(400).json({ message: '请上传备份文件' });
    }

    const zipPath = req.file.path;
    const extractPath = path.join(__dirname, '..', 'temp_extract_' + Date.now());
    const finalUploadPath = path.join(__dirname, '..', uploadDir);

    try {
      console.log('--- [开始恢复备份] ---');
      // 1. 解压文件
      if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath, { recursive: true });
      
      try {
        await new Promise((resolve, reject) => {
          const stream = fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: extractPath }));
          
          stream.on('close', resolve);
          stream.on('error', reject);
        });
        console.log('解压完成');
      } catch (extractError) {
        console.error('解压失败:', extractError);
        throw new Error('解压备份包失败，文件可能已损坏');
      }

      // 2. 读取数据库数据
      const jsonPath = path.join(extractPath, 'database_export.json');
      if (!fs.existsSync(jsonPath)) {
        throw new Error('备份包中缺少 database_export.json');
      }
      
      let dbData;
      try {
        dbData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      } catch (parseError) {
        throw new Error('解析 database_export.json 失败');
      }

      // 3. 开启事务导入数据
      await sequelize.transaction(async (t) => {
        // A. 恢复用户（密码 hash 随备份恢复，恢复后可直接用原密码登录）
        // hooks:false 跳过 beforeCreate 钩子，避免已 hash 的密码被二次 hash
        const userMap = {};
        for (const u of dbData.users || []) {
          const [user] = await User.findOrCreate({
            where: { username: u.username },
            defaults: {
              // 备份包无密码 hash 时（旧版备份）回退为随机密码
              password: u.password || bcrypt.hashSync(require('crypto').randomBytes(24).toString('base64url'), 10),
              role: (u.role === 'admin' || u.role === 'engineer') ? u.role : 'engineer'
            },
            hooks: false,
            transaction: t
          });
          userMap[u.id] = user.id;
        }

        // B. 恢复模板
        const templateMap = {};
        for (const tmpl of dbData.templates || []) {
          const newTmpl = await Template.create({
            name: `${tmpl.name} (恢复_${new Date().toLocaleDateString()})`,
            description: tmpl.description,
            createdBy: userMap[tmpl.createdBy] || req.user.id
          }, { transaction: t });
          templateMap[tmpl.id] = newTmpl.id;

          if (tmpl.items && tmpl.items.length > 0) {
            const itemsToCreate = tmpl.items.map(item => ({
              templateId: newTmpl.id,
              name: item.name,
              description: item.description,
              sortOrder: item.sortOrder,
              level: item.level,
              code: item.code,
              isGroup: !!item.isGroup,
              isDynamic: !!item.isDynamic
            }));
            await TemplateItem.bulkCreate(itemsToCreate, { transaction: t });
          }
        }

        // C. 恢复巡检记录
        for (const ins of dbData.inspections || []) {
          const newIns = await Inspection.create({
            templateId: templateMap[ins.templateId] || null,
            title: ins.title,
            status: ins.status,
            inspectionTime: ins.inspectionTime,
            createdBy: userMap[ins.createdBy] || req.user.id
          }, { transaction: t });

          if (ins.items && ins.items.length > 0) {
            const insItemsToCreate = ins.items.map(item => {
              // 增强字段安全性处理
              let imgPath = item.imagePath;
              if (imgPath && typeof imgPath === 'object') imgPath = JSON.stringify(imgPath);

              return {
                inspectionId: newIns.id,
                name: item.name,
                result: item.result,
                imagePath: imgPath,
                sortOrder: item.sortOrder,
                isCustom: !!item.isCustom,
                isGroup: !!item.isGroup,
                isDynamic: !!item.isDynamic,
                isUpdated: item.isUpdated !== undefined ? !!item.isUpdated : true,
                level: item.level,
                code: item.code
              };
            });
            await InspectionItem.bulkCreate(insItemsToCreate, { transaction: t });
          }
        }
      });
      console.log('数据库导入完成');

      // 4. 恢复图片文件（重复文件不覆盖策略）
      const backupUploadPath = path.join(extractPath, uploadDir);
      if (fs.existsSync(backupUploadPath)) {
        // 【修复】确保目标上传目录存在，防止写入失败
        if (!fs.existsSync(finalUploadPath)) fs.mkdirSync(finalUploadPath, { recursive: true });

        const files = fs.readdirSync(backupUploadPath);
        for (const file of files) {
          const srcFile = path.join(backupUploadPath, file);
          const destFile = path.join(finalUploadPath, file);
          if (!fs.existsSync(destFile)) {
            fs.copyFileSync(srcFile, destFile);
          }
        }
      }

      res.json({ message: '数据导入成功' });

    } catch (error) {
      console.error('Import backup error:', error);
      res.status(500).json({ message: '导入失败: ' + error.message });
    } finally {
      // 清理临时文件
      try {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
      } catch (e) {}
    }
  }
];
