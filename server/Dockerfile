# 使用 Node.js 镜像
FROM registry.cn-wulanchabu.aliyuncs.com/xpled/node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 并安装依赖
COPY package*.json ./
RUN npm install --production

# 复制源代码
COPY . .

# 创建上传目录（如果不存在）
RUN mkdir -p uploads/images

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
