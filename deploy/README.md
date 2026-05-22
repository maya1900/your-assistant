# 各平台部署配方

`dist/` 是纯静态产物。要让生产环境跑通，**必须**有一段服务端逻辑处理 `/api/llm/*`——把请求按 `X-LLM-Base-URL` 头转发到对应 LLM 服务、流式返回。本目录给出 4 种常见平台的现成配置。

## 协议规范（所有平台一致）

每个代理必须满足：

1. 拦截路径前缀 `/api/llm/`
2. 从请求头 `X-LLM-Base-URL` 读取上游 base URL
3. 把请求体、其他请求头**原样**转给 `{baseURL}{子路径}`
4. **不缓冲**响应体，边读边吐（否则 SSE 流式会断）
5. 删除 `Host`、`Content-Length`、`Content-Encoding` 等会冲突的头

## 选哪个？

| 平台 | 适合 | 资源 |
|---|---|---|
| **Vercel** | 个人项目、想"零配置 push 就部署"。已在仓库根目录 `vercel.json` + `api/llm-proxy.ts` 配好 | 见仓库根目录 |
| **Cloudflare Pages** | 同 Vercel 但用 CF 生态；免费额度更慷慨 | [cloudflare/](cloudflare/) |
| **Netlify** | 同 Vercel 路线，老牌 JAMstack 托管 | [netlify/](netlify/) |
| **Docker 自托管** | VPS、内网部署、想完全掌控 | [docker/](docker/) |
| **Nginx 反代** | 已有 Nginx 在跑，不想再起服务 | [nginx/](nginx/) |

## 各平台具体步骤

### Cloudflare Pages

```bash
cp -r deploy/cloudflare/functions .       # 拷到项目根
# 然后在 Cloudflare Pages Dashboard 连仓库即可，自动识别 functions/
```

文件 [`functions/api/llm/[[path]].ts`](cloudflare/functions/api/llm/%5B%5Bpath%5D%5D.ts) 用 `[[catchall]]` 语法（CF Pages 风格），无需额外路由配置。

### Netlify

```bash
cp deploy/netlify/netlify.toml .                       # 拷到项目根
cp -r deploy/netlify/netlify/edge-functions netlify/   # 拷到 netlify/edge-functions/
```

`netlify.toml` 已经声明：

```toml
[[edge_functions]]
  function = "llm-proxy"
  path = "/api/llm/*"
```

### Docker 自托管

```bash
# 在项目根（含 package.json 的目录）执行
docker build -f deploy/docker/Dockerfile -t hearth .
docker run --rm -p 3000:3000 hearth
```

[`server.mjs`](docker/server.mjs) 是纯 Node 20+ 实现（零依赖），同时托管 `dist/` 静态文件 + `/api/llm/*` 代理。Dockerfile 用多阶段构建，最终镜像 ~80MB（alpine + node + dist）。

环境变量：

- `PORT`（默认 `3000`）
- `DIST_DIR`（默认 `./dist`）

### Nginx 反代（裸机/VPS）

适用场景：你已经有一台用 Nginx 跑的服务器，只想加一段 `location` 块。

```bash
cp deploy/nginx/nginx.conf /etc/nginx/sites-available/your-assistant.conf
ln -s /etc/nginx/sites-available/your-assistant.conf /etc/nginx/sites-enabled/
# 改一下 server_name 和 root 路径
sudo nginx -t && sudo systemctl reload nginx
```

关键是 `proxy_buffering off`——没这个 SSE 会被全缓冲到响应结束才下发，体感上"流式"就消失了。配置里已写好，照搬即可。

## 自己写一个？

照着 [vite.config.ts 的 dev 中间件](../vite.config.ts) 或 [Vercel 的 api/llm-proxy.ts](../api/llm-proxy.ts) 翻译一遍。核心逻辑就 ~30 行：

```pseudo
on POST /api/llm/<sub>:
  baseURL = headers['X-LLM-Base-URL']
  target = baseURL + '/<sub>' + query_string
  res = fetch(target, method, fwd_headers, body)
  for chunk in res.body: write_to_client(chunk)
```

任何一个支持流式 HTTP 的语言/框架都能写。
