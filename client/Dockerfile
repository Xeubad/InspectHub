# 第一阶段：构建
FROM registry.cn-wulanchabu.aliyuncs.com/xpled/node:18-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 第二阶段：运行（使用 Nginx）
FROM registry.cn-wulanchabu.aliyuncs.com/xpled/nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
