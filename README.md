# InspectHub - 设备巡检信息统计平台

一个基于 Vue 3 + Express + MySQL 的全栈巡检管理系统，支持模板管理、巡检记录、图片上传、Word 导出等功能。

## 功能特性

### 核心功能
- 🔐 **用户认证** - JWT 身份验证，支持管理员和普通用户角色
- 📋 **模板管理** - 创建、编辑、复制、删除巡检模板
- 📝 **巡检记录** - 基于模板创建巡检记录，支持多图上传
- 📤 **Word 导出** - 将巡检记录导出为格式化的 Word 文档
- 💾 **备份恢复** - 支持数据库和图片的完整备份与恢复

### 模板管理特性
- ✅ **设备分组** - 按设备组织检查项
- ✅ **拖拽排序** - 支持拖拽调整设备顺序
- ✅ **设备复制** - 快速复制设备及其所有检查项
- ✅ **检查项管理** - 支持分组标题和必更项标记
- ✅ **实时预览** - 编辑时实时显示设备和检查项

### 巡检记录特性
- ✅ **模板同步** - 复制记录时自动同步最新模板结构
- ✅ **智能匹配** - 基于层级路径匹配，支持设备顺序调整
- ✅ **多图上传** - 支持粘贴、拖拽、选择文件上传
- ✅ **必更标识** - 动态项标记"必更"，提醒用户更新
- ✅ **状态管理** - 草稿和完成状态管理

## 技术栈

### 前端
- **框架**: Vue 3 (Composition API)
- **构建工具**: Vite 5
- **UI 组件**: Element Plus 2.4
- **状态管理**: Pinia 2.1
- **路由**: Vue Router 4.2
- **HTTP 客户端**: Axios 1.6
- **拖拽排序**: SortableJS 1.15

### 后端
- **框架**: Express 4.18
- **数据库**: MySQL 8.0
- **ORM**: Sequelize 6.35
- **身份验证**: JWT (jsonwebtoken 9.0)
- **密码加密**: bcryptjs 2.4
- **文件上传**: Multer 1.4
- **Word 生成**: docx 8.2
- **备份压缩**: archiver 7.0

### 部署
- **容器化**: Docker + Docker Compose
- **Web 服务器**: Nginx (客户端)
- **数据库**: MySQL 8.0 (官方镜像)

## 项目结构

```
InspectHub/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── api/           # API 接口
│   │   ├── components/    # 公共组件
│   │   ├── router/        # 路由配置
│   │   ├── stores/        # Pinia 状态管理
│   │   ├── views/         # 页面组件
│   │   │   ├── Dashboard.vue
│   │   │   ├── Login.vue
│   │   │   ├── TemplateList.vue
│   │   │   ├── TemplateEditTwoColumn.vue
│   │   │   ├── InspectionList.vue
│   │   │   └── InspectionEdit.vue
│   │   ├── App.vue
│   │   └── main.js
│   ├── package.json
│   └── vite.config.js
│
├── server/                 # 后端项目
│   ├── config/            # 配置文件
│   │   └── database.js    # 数据库配置
│   ├── controllers/       # 控制器
│   │   ├── authController.js
│   │   ├── templateController.js
│   │   ├── inspectionController.js
│   │   └── backupController.js
│   ├── middleware/        # 中间件
│   │   └── auth.js        # JWT 认证中间件
│   ├── models/            # 数据模型
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Template.js
│   │   ├── TemplateItem.js
│   │   ├── Inspection.js
│   │   └── InspectionItem.js
│   ├── routes/            # 路由
│   │   ├── auth.js
│   │   ├── template.js
│   │   ├── inspection.js
│   │   ├── upload.js
│   │   └── backup.js
│   ├── uploads/           # 上传文件目录
│   ├── app.js             # 应用入口
│   └── package.json
│
├── docker-compose.yml      # Docker Compose 配置
├── README.md              # 项目文档
└── .gitignore             # Git 忽略文件
```

## 快速开始

### 前置要求
- Node.js >= 16.0.0
- MySQL >= 8.0
- Docker & Docker Compose (可选)

### 方式一：本地开发

#### 1. 克隆项目
```bash
git clone https://github.com/Xeubad/InspectHub.git
cd InspectHub
```

#### 2. 安装依赖

**后端：**
```bash
cd server
npm install
```

**前端：**
```bash
cd client
npm install
```

#### 3. 配置数据库

后端通过环境变量读取数据库配置（见下方「环境变量」），默认连接 `localhost:3306` 的 `inspection_platform` 库。也可以创建数据库后按需覆盖：

```bash
export DB_NAME=inspecthub_db DB_USER=root DB_PASS=your_password
```

#### 4. 启动服务

**后端（开发模式）：**
```bash
cd server
npm run dev
# 服务运行在 http://localhost:3000
```

**前端（开发模式）：**
```bash
cd client
npm run dev
# 服务运行在 http://localhost:5173
```

#### 5. 访问应用
打开浏览器访问 `http://localhost:5173`

**初始管理员账号：**

首次启动时如果系统中没有任何管理员，会自动创建初始管理员（用户名默认 `admin`）：
- 设置了 `ADMIN_PASSWORD` 环境变量时使用该密码
- 未设置时生成随机密码并打印在服务日志里，请立即登录修改

> 注册页面只能创建「工程师」账号，管理员账号只能通过初始 seed 或备份恢复产生。

### 方式二：Docker 部署

#### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，必须设置 DB_PASSWORD 和 JWT_SECRET（用强随机字符串）
```

#### 2. 启动容器

```bash
docker-compose up -d
```

#### 3. 访问应用
打开浏览器访问 `http://localhost`

#### 4. 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f server
docker-compose logs -f client
```

#### 5. 停止服务
```bash
docker-compose down
```

## 环境变量

### 后端环境变量
```bash
# 数据库配置
DB_HOST=localhost
DB_NAME=inspecthub_db
DB_USER=root
DB_PASS=your_password
DB_PORT=3306

# JWT 配置（生产环境必须设置强随机密钥，未设置时启动会打印警告）
JWT_SECRET=your_jwt_secret_key

# 初始管理员（仅当系统中无任何管理员时创建）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=            # 留空则生成随机密码并打印在日志

# 服务器端口
PORT=3000
```

### 前端环境变量
```bash
# API 基础路径
VITE_API_BASE_URL=http://localhost:3000/api
```

## 数据库结构

### 主要数据表

#### users - 用户表
- id, username, password, role, createdAt, updatedAt

#### templates - 模板表
- id, name, description, createdBy, createdAt, updatedAt

#### template_items - 模板项表
- id, templateId, name, description, level, code, isGroup, isDynamic, sortOrder

#### inspections - 巡检记录表
- id, templateId, title, status, inspectionTime, inspectorId, createdBy, createdAt, updatedAt

#### inspection_items - 巡检项表
- id, inspectionId, name, result, imagePath, level, code, isGroup, isDynamic, isUpdated, sortOrder

## API 接口

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

### 模板接口
- `GET /api/templates` - 获取模板列表
- `GET /api/templates/:id` - 获取模板详情
- `POST /api/templates` - 创建模板（管理员）
- `PUT /api/templates/:id` - 更新模板（管理员）
- `DELETE /api/templates/:id` - 删除模板（管理员）

### 巡检接口
- `GET /api/inspections` - 获取巡检记录列表
- `GET /api/inspections/:id` - 获取巡检记录详情
- `POST /api/inspections` - 创建巡检记录
- `PUT /api/inspections/:id` - 更新巡检记录
- `DELETE /api/inspections/:id` - 删除巡检记录
- `POST /api/inspections/:id/copy` - 复制巡检记录
- `GET /api/inspections/:id/export` - 导出 Word 文档

### 上传接口
- `POST /api/upload` - 上传图片

### 备份接口（仅管理员）
- `GET /api/backup/export` - 导出备份（含数据库 JSON 和图片，密码 hash 一并导出）
- `POST /api/backup/import` - 恢复备份

## 核心功能说明

### 1. 模板编辑
- 左侧设备列表，支持拖拽排序
- 右侧检查项编辑，一行一项
- 设备编号：1.1, 2.1, 3.1...
- 检查项编号：1.1.1, 1.1.2, 2.1.1...
- 支持设备复制功能

### 2. 巡检记录复制
- 使用层级路径匹配（设备名称/检查项名称）
- 支持设备顺序调整后的复制
- 自动同步模板新增的设备和检查项
- 保留旧数据，不丢失任何信息

### 3. 图片上传
- 支持粘贴、拖拽、选择文件
- 自动转换为高质量 JPEG
- 支持多图上传（JSON 数组格式）
- 导出时按原图比例缩放，固定宽度 280px

### 4. Word 导出
- 格式化表格布局
- 支持多图显示
- 分组标题样式
- 16:9 图片比例

## 开发指南

### 代码规范
- 使用 ES6+ 语法
- 组件使用 Composition API
- 遵循 Vue 3 风格指南
- 使用 async/await 处理异步

### 提交规范
```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链相关
```

### 分支管理
- `main` - 主分支，生产环境
- `develop` - 开发分支
- `feature/*` - 功能分支
- `hotfix/*` - 紧急修复分支

## 常见问题

### 1. 数据库连接失败
- 检查 MySQL 服务是否启动
- 验证数据库配置是否正确
- 确认数据库用户权限

### 2. 图片上传失败
- 检查 `server/uploads` 目录权限
- 确认文件大小未超过限制（默认 10MB）
- 验证文件格式是否支持

### 3. Docker 容器启动失败
- 检查端口是否被占用
- 验证数据卷路径是否存在
- 查看容器日志排查错误

### 4. 前端无法连接后端
- 检查后端服务是否启动
- 验证 API 基础路径配置
- 检查 CORS 配置

## 性能优化

### 前端优化
- 路由懒加载
- 图片懒加载
- 组件按需引入
- 生产环境代码压缩

### 后端优化
- 数据库索引优化
- 查询结果缓存
- 图片压缩处理
- 接口响应压缩

### 数据库优化
- 合理使用索引
- 避免 N+1 查询
- 使用连接池
- 定期清理日志

## 安全建议

### 生产环境
- ✅ 修改默认管理员密码
- ✅ 使用强随机 JWT 密钥
- ✅ 启用 HTTPS
- ✅ 配置防火墙规则
- ✅ 定期备份数据
- ✅ 限制文件上传大小和类型
- ✅ 使用环境变量管理敏感信息

### 数据库安全
- ✅ 使用强密码
- ✅ 限制远程访问
- ✅ 定期更新补丁
- ✅ 启用审计日志

## 更新日志

### v1.0.0 (2026-01-29)
- ✨ 初始版本发布
- ✨ 模板管理功能
- ✨ 巡检记录功能
- ✨ Word 导出功能
- ✨ 备份恢复功能
- ✨ 设备拖拽排序
- ✨ 智能复制匹配

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 提交 PR 流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 联系方式

- 项目地址: [GitHub Repository]
- 问题反馈: [GitHub Issues]

## 致谢

感谢以下开源项目：
- [Vue.js](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)
- [Express](https://expressjs.com/)
- [Sequelize](https://sequelize.org/)
- [SortableJS](https://sortablejs.github.io/Sortable/)

---

⭐ 如果这个项目对你有帮助，请给一个 Star！
