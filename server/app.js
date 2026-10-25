const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { sequelize, User } = require('./models');
const { jwtSecret } = require('./config');
const { auth } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const templateRoutes = require('./routes/template');
const inspectionRoutes = require('./routes/inspection');
const uploadRoutes = require('./routes/upload');
const backupRoutes = require('./routes/backup');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// 健康检查（供 Docker / 负载均衡探活）
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 巡检图片需要登录后访问（auth 中间件兼容 ?token= 查询参数）
app.use('/api/uploads', auth, express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/backup', backupRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
});

const startServer = async () => {
  if (!process.env.JWT_SECRET) {
    console.warn('====================================================');
    console.warn('警告：未设置 JWT_SECRET 环境变量，正在使用不安全的默认密钥！');
    console.warn('任何人都能伪造登录凭证，生产环境必须设置强随机密钥。');
    console.warn('====================================================');
  }

  try {
    await sequelize.sync();

    // 【关键修复】手动补齐 is_updated 字段，避免 alter: true 导致的索引冲突报错
    try {
      const [results] = await sequelize.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'inspection_items'
        AND COLUMN_NAME = 'is_updated'
        AND TABLE_SCHEMA = DATABASE();
      `);

      if (results.length === 0) {
        await sequelize.query(`
          ALTER TABLE inspection_items
          ADD COLUMN is_updated TINYINT(1) DEFAULT 1
          COMMENT '在复制模式下，动态项是否已被更新';
        `);
        console.log('已成功补齐 is_updated 字段');
      }

      // 【关键修复】手动补齐 inspector_id 字段
      const [inspectorResults] = await sequelize.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'inspections'
        AND COLUMN_NAME = 'inspector_id'
        AND TABLE_SCHEMA = DATABASE();
      `);

      if (inspectorResults.length === 0) {
        await sequelize.query(`
          ALTER TABLE inspections
          ADD COLUMN inspector_id INT NULL
          COMMENT '巡检人ID';
        `);
        console.log('已成功补齐 inspector_id 字段');
      }
    } catch (e) {
      console.error('自动补全字段失败，请手动检查数据库:', e.message);
    }

    // 确保系统至少有一个管理员（仅在无任何管理员时创建）
    await User.ensureAdminExists();

    console.log('数据库同步完成');

    const server = app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });

    // 【关键修复】延长超时时间到 10 分钟，支持大文件备份恢复
    server.timeout = 600000;
    server.keepAliveTimeout = 610000;
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
};

startServer();
