# 使用 Node.js 镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 并安装依赖（npm ci 严格按 lockfile 安装，构建可复现）
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 复制源代码
COPY . .

# 创建上传目录（如果不存在）
RUN mkdir -p uploads/images

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
