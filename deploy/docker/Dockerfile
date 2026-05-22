# 在项目根 (Vite 工程) 跑：
#   docker build -f deploy/docker/Dockerfile -t hearth .
#   docker run --rm -p 3000:3000 hearth
# 访问 http://localhost:3000

# ── Stage 1: 构建前端 ──
FROM node:20-alpine AS builder
WORKDIR /app

# 先 copy 锁文件做依赖层缓存
COPY package.json package-lock.json ./
RUN npm ci

# 再 copy 源码做 build
COPY . .
RUN npm run build

# ── Stage 2: 运行时（极简，只装一个 node + dist + server.mjs） ──
FROM node:20-alpine
WORKDIR /app

# 复制构建产物与服务脚本
COPY --from=builder /app/dist ./dist
COPY deploy/docker/server.mjs ./server.mjs

# 非 root 用户跑
USER node

ENV PORT=3000
ENV DIST_DIR=./dist
EXPOSE 3000

CMD ["node", "server.mjs"]
